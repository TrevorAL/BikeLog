import {
  Prisma,
  StravaSyncStatus,
  type Bike,
  type StravaConnection,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { createRideAndUpdateMileageWithTx } from "@/lib/rides";
import {
  fetchStravaActivityById,
  fetchStravaActivityPreview,
  fetchStravaBikeOptions,
  getFreshStravaConnectionForUser,
  recordStravaSyncResult,
  resolveStravaBikeOptions,
  toRideCreationPayload,
  type StravaBikeOption,
  type StravaPreviewActivity,
} from "@/lib/strava";

const GENERIC_BIKE_TOKENS = new Set([
  "bike",
  "bicycle",
  "road",
  "gravel",
  "mountain",
  "mtb",
  "trainer",
  "indoor",
  "outdoor",
  "my",
]);

const AUTO_SYNC_PREVIEW_LIMIT = 100;
const TOKEN_STALE_BUFFER_MS = 24 * 60 * 60 * 1000;

type SyncBike = Pick<Bike, "id" | "name" | "brand" | "model" | "year">;

type BikeSyncResult = {
  bikeId: string;
  bikeLabel: string;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  matchedBike: {
    id: string;
    label: string;
  } | null;
  message?: string;
  errors: Array<{ activityId: string; reason: string }>;
};

export type StravaAutoSyncResult = {
  status: StravaSyncStatus;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  bikesEvaluated: number;
  bikesMatched: number;
  bikes: BikeSyncResult[];
  lastSyncAt: string;
  lastSyncImportedCount: number;
  lastSyncError: string | null;
};

export type StravaGlobalSyncSummary = {
  usersEvaluated: number;
  usersSynced: number;
  usersSkippedForRetryBackoff: number;
  imported: number;
  skipped: number;
  errors: number;
  staleTokenConnections: number;
  results: Array<{
    userId: string;
    status: StravaSyncStatus | "SKIPPED";
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    message?: string;
  }>;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toTokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !GENERIC_BIKE_TOKENS.has(token));
}

function uniqueNonEmpty(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const value of values) {
    if (!value) {
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const normalized = normalizeText(trimmed);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(trimmed);
  }

  return output;
}

function scoreBikeMatch(input: { candidate: string; label: string }) {
  const candidate = normalizeText(input.candidate);
  const label = normalizeText(input.label);

  if (!candidate || !label) {
    return 0;
  }

  if (candidate === label) {
    return 100;
  }

  let score = 0;

  if (candidate.length >= 4 && label.includes(candidate)) {
    score += 60;
  }

  if (label.length >= 4 && candidate.includes(label)) {
    score += 50;
  }

  const candidateTokens = toTokens(candidate);
  const labelTokens = new Set(toTokens(label));
  const sharedTokenCount = candidateTokens.filter((token) => labelTokens.has(token)).length;

  score += sharedTokenCount * 20;

  return score;
}

function isDuplicateError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function buildBikeLabel(input: SyncBike) {
  const detailed = [input.year, input.brand, input.model].filter(Boolean).join(" ").trim();
  return detailed.length > 0 ? detailed : input.name;
}

export function getStravaRetryAfter(input: {
  failureCount: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const failureCount = Math.max(1, input.failureCount);
  const backoffMinutes = Math.min(12 * 60, 15 * 2 ** Math.min(failureCount - 1, 6));
  return new Date(now.getTime() + backoffMinutes * 60 * 1000);
}

export function shouldSkipStravaSyncForRetryBackoff(input: {
  retryAfter: Date | null;
  now?: Date;
}) {
  if (!input.retryAfter) {
    return false;
  }

  const now = input.now ?? new Date();
  return input.retryAfter.getTime() > now.getTime();
}

function isConnectionTokenStale(connection: Pick<StravaConnection, "expiresAt">) {
  return connection.expiresAt.getTime() <= Date.now() + TOKEN_STALE_BUFFER_MS;
}

async function recordSuccessfulSync(input: {
  userId: string;
  importedCount: number;
  status: StravaSyncStatus;
}) {
  await recordStravaSyncResult({
    userId: input.userId,
    status: input.status,
    importedCount: input.importedCount,
    error: null,
  });

  return prisma.stravaConnection.update({
    where: {
      userId: input.userId,
    },
    data: {
      consecutiveSyncFailures: 0,
      syncRetryAfter: null,
    },
  });
}

async function recordFailedSync(input: {
  userId: string;
  importedCount: number;
  error: string;
}) {
  const connection = await prisma.stravaConnection.findUnique({
    where: {
      userId: input.userId,
    },
    select: {
      consecutiveSyncFailures: true,
    },
  });

  const nextFailureCount = (connection?.consecutiveSyncFailures ?? 0) + 1;

  await recordStravaSyncResult({
    userId: input.userId,
    status: StravaSyncStatus.ERROR,
    importedCount: input.importedCount,
    error: input.error,
  });

  return prisma.stravaConnection.update({
    where: {
      userId: input.userId,
    },
    data: {
      consecutiveSyncFailures: nextFailureCount,
      syncRetryAfter: getStravaRetryAfter({
        failureCount: nextFailureCount,
      }),
    },
  });
}

async function loadSyncBikes(input: { userId: string; bikeId?: string }) {
  return prisma.bike.findMany({
    where: {
      userId: input.userId,
      isArchived: false,
      ...(input.bikeId ? { id: input.bikeId } : {}),
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      year: true,
    },
  });
}

function findBestStravaBikeMatch(input: {
  bike: SyncBike;
  bikeOptions: StravaBikeOption[];
}) {
  const candidateNames = uniqueNonEmpty([
    input.bike.name,
    [input.bike.brand, input.bike.model].filter(Boolean).join(" "),
    [input.bike.year, input.bike.brand, input.bike.model].filter(Boolean).join(" "),
    input.bike.model,
    input.bike.brand,
  ]);

  const scoredMatches = input.bikeOptions
    .map((option) => {
      const bestScore = candidateNames.reduce((maxScore, candidate) => {
        const score = scoreBikeMatch({
          candidate,
          label: option.label,
        });
        return Math.max(maxScore, score);
      }, 0);

      return {
        id: option.id,
        label: option.label,
        score: bestScore,
      };
    })
    .filter((option) => option.score > 0)
    .sort((a, b) => b.score - a.score);

  const bestMatch = scoredMatches[0];
  const secondBest = scoredMatches[1];
  const isAmbiguous =
    Boolean(bestMatch && secondBest) &&
    secondBest.score >= bestMatch.score - 10 &&
    secondBest.score >= 20;

  return {
    bestMatch,
    isAmbiguous,
    candidates: scoredMatches.slice(0, 3),
  };
}

async function importActivityForBike(input: {
  userId: string;
  connectionId: string;
  bike: SyncBike;
  activityId: string;
}) {
  const activity = await fetchStravaActivityById({
    userId: input.userId,
    activityId: input.activityId,
  });

  const payload = toRideCreationPayload(activity);
  if (!payload) {
    return null;
  }

  const activityName =
    typeof activity.name === "string" && activity.name.trim().length > 0
      ? activity.name.trim()
      : "Strava ride";

  const activityTypeRaw =
    typeof activity.sport_type === "string"
      ? activity.sport_type
      : typeof activity.type === "string"
        ? activity.type
        : null;

  const distanceMeters =
    typeof activity.distance === "number" && Number.isFinite(activity.distance)
      ? activity.distance
      : null;

  const movingTimeSeconds =
    typeof activity.moving_time === "number" && Number.isFinite(activity.moving_time)
      ? Math.max(0, Math.round(activity.moving_time))
      : null;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.stravaActivityImport.findUnique({
      where: {
        stravaConnectionId_stravaActivityId: {
          stravaConnectionId: input.connectionId,
          stravaActivityId: input.activityId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return null;
    }

    const ride = await createRideAndUpdateMileageWithTx(tx, {
      bikeId: input.bike.id,
      date: payload.date,
      distanceMiles: payload.distanceMiles,
      durationMinutes: payload.durationMinutes,
      rideType: payload.rideType,
      weather: undefined,
      roadCondition: undefined,
      wasWet: false,
      notes: payload.notes,
    });

    await tx.stravaActivityImport.create({
      data: {
        stravaConnectionId: input.connectionId,
        stravaActivityId: input.activityId,
        bikeId: input.bike.id,
        rideId: ride.id,
        activityName,
        activityType: activityTypeRaw,
        startedAt: ride.date,
        distanceMeters,
        movingTimeSeconds,
      },
    });

    return ride;
  });
}

async function syncBike(input: {
  userId: string;
  connection: StravaConnection;
  bike: SyncBike;
  previewActivities: StravaPreviewActivity[];
  bikeOptions: StravaBikeOption[];
}): Promise<BikeSyncResult> {
  const bikeLabel = buildBikeLabel(input.bike);
  const match = findBestStravaBikeMatch({
    bike: input.bike,
    bikeOptions: input.bikeOptions,
  });

  if (!match.bestMatch) {
    return {
      bikeId: input.bike.id,
      bikeLabel,
      importedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      matchedBike: null,
      message: `No Strava bike name match found for "${input.bike.name}".`,
      errors: [],
    };
  }

  if (match.isAmbiguous) {
    return {
      bikeId: input.bike.id,
      bikeLabel,
      importedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      matchedBike: null,
      message: "Multiple Strava bikes looked similar to this bike name.",
      errors: [],
    };
  }

  const matchingActivities = input.previewActivities.filter(
    (activity) => activity.gearId === match.bestMatch.id,
  );
  const matchingActivityIds = matchingActivities.map(
    (activity) => activity.stravaActivityId,
  );

  const existingImports =
    matchingActivityIds.length > 0
      ? await prisma.stravaActivityImport.findMany({
          where: {
            stravaConnectionId: input.connection.id,
            stravaActivityId: {
              in: matchingActivityIds,
            },
          },
          select: {
            stravaActivityId: true,
          },
        })
      : [];

  const existingIds = new Set(existingImports.map((entry) => entry.stravaActivityId));
  const activityIdsToImport = matchingActivityIds.filter((activityId) => !existingIds.has(activityId));
  const skippedCount = matchingActivityIds.length - activityIdsToImport.length;

  if (activityIdsToImport.length === 0) {
    return {
      bikeId: input.bike.id,
      bikeLabel,
      importedCount: 0,
      skippedCount,
      errorCount: 0,
      matchedBike: {
        id: match.bestMatch.id,
        label: match.bestMatch.label,
      },
      message: "No new Strava rides to import for the matched bike.",
      errors: [],
    };
  }

  const errors: Array<{ activityId: string; reason: string }> = [];
  let importedCount = 0;

  for (const activityId of activityIdsToImport) {
    try {
      const created = await importActivityForBike({
        userId: input.userId,
        connectionId: input.connection.id,
        bike: input.bike,
        activityId,
      });

      if (created) {
        importedCount += 1;
      }
    } catch (error) {
      if (isDuplicateError(error)) {
        continue;
      }

      errors.push({
        activityId,
        reason:
          error instanceof Error ? error.message : "Unexpected import error.",
      });
    }
  }

  return {
    bikeId: input.bike.id,
    bikeLabel,
    importedCount,
    skippedCount,
    errorCount: errors.length,
    matchedBike: {
      id: match.bestMatch.id,
      label: match.bestMatch.label,
    },
    errors,
  };
}

export async function autoSyncStravaForUser(input: {
  userId: string;
  bikeId?: string;
}): Promise<StravaAutoSyncResult> {
  let importedCount = 0;

  try {
    const connection = await getFreshStravaConnectionForUser(input.userId);
    if (!connection) {
      throw new Error("Connect Strava before importing rides.");
    }

    const bikes = await loadSyncBikes({
      userId: input.userId,
      bikeId: input.bikeId,
    });

    if (bikes.length === 0) {
      const updated = await recordSuccessfulSync({
        userId: input.userId,
        status: StravaSyncStatus.NO_NEW_DATA,
        importedCount: 0,
      });

      return {
        status: StravaSyncStatus.NO_NEW_DATA,
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        bikesEvaluated: 0,
        bikesMatched: 0,
        bikes: [],
        lastSyncAt: updated.lastSyncAt?.toISOString() ?? new Date().toISOString(),
        lastSyncImportedCount: updated.lastSyncImportedCount,
        lastSyncError: updated.lastSyncError,
      };
    }

    const [previewAll, stravaBikes] = await Promise.all([
      fetchStravaActivityPreview({
        userId: input.userId,
        limit: AUTO_SYNC_PREVIEW_LIMIT,
      }),
      fetchStravaBikeOptions({
        userId: input.userId,
      }),
    ]);

    const bikeOptions = await resolveStravaBikeOptions({
      userId: input.userId,
      baseOptions: stravaBikes,
      previewActivities: previewAll,
    });

    const bikeResults: BikeSyncResult[] = [];
    for (const bike of bikes) {
      const result = await syncBike({
        userId: input.userId,
        connection,
        bike,
        previewActivities: previewAll,
        bikeOptions,
      });
      bikeResults.push(result);
      importedCount += result.importedCount;
    }

    const skippedCount = bikeResults.reduce((sum, bike) => sum + bike.skippedCount, 0);
    const errorCount = bikeResults.reduce((sum, bike) => sum + bike.errorCount, 0);
    const bikesMatched = bikeResults.filter((bike) => bike.matchedBike).length;
    const status =
      errorCount > 0 && importedCount === 0
        ? StravaSyncStatus.ERROR
        : importedCount > 0
          ? StravaSyncStatus.SUCCESS
          : StravaSyncStatus.NO_NEW_DATA;

    const firstError = bikeResults.flatMap((bike) => bike.errors)[0]?.reason;
    const updated =
      status === StravaSyncStatus.ERROR
        ? await recordFailedSync({
            userId: input.userId,
            importedCount,
            error: firstError ?? "Strava import failed.",
          })
        : await recordSuccessfulSync({
            userId: input.userId,
            status,
            importedCount,
          });

    return {
      status,
      importedCount,
      skippedCount,
      errorCount,
      bikesEvaluated: bikes.length,
      bikesMatched,
      bikes: bikeResults,
      lastSyncAt: updated.lastSyncAt?.toISOString() ?? new Date().toISOString(),
      lastSyncImportedCount: updated.lastSyncImportedCount,
      lastSyncError: updated.lastSyncError,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Could not auto-import Strava rides right now.";
    const updated = await recordFailedSync({
      userId: input.userId,
      importedCount,
      error: message,
    }).catch(() => null);

    return {
      status: StravaSyncStatus.ERROR,
      importedCount,
      skippedCount: 0,
      errorCount: 1,
      bikesEvaluated: 0,
      bikesMatched: 0,
      bikes: [],
      lastSyncAt: updated?.lastSyncAt?.toISOString() ?? new Date().toISOString(),
      lastSyncImportedCount: updated?.lastSyncImportedCount ?? importedCount,
      lastSyncError: updated?.lastSyncError ?? message,
    };
  }
}

export async function dispatchStravaSyncForConnectedUsers(input: {
  retryOnly?: boolean;
} = {}): Promise<StravaGlobalSyncSummary> {
  const connections = await prisma.stravaConnection.findMany({
    orderBy: {
      updatedAt: "asc",
    },
    select: {
      userId: true,
      expiresAt: true,
      lastSyncStatus: true,
      syncRetryAfter: true,
    },
  });

  const summary: StravaGlobalSyncSummary = {
    usersEvaluated: connections.length,
    usersSynced: 0,
    usersSkippedForRetryBackoff: 0,
    imported: 0,
    skipped: 0,
    errors: 0,
    staleTokenConnections: 0,
    results: [],
  };

  for (const connection of connections) {
    if (isConnectionTokenStale(connection)) {
      summary.staleTokenConnections += 1;
    }

    if (input.retryOnly && connection.lastSyncStatus !== StravaSyncStatus.ERROR) {
      continue;
    }

    if (
      shouldSkipStravaSyncForRetryBackoff({
        retryAfter: connection.syncRetryAfter,
      })
    ) {
      summary.usersSkippedForRetryBackoff += 1;
      summary.results.push({
        userId: connection.userId,
        status: "SKIPPED",
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        message: `Retry deferred until ${connection.syncRetryAfter?.toISOString()}.`,
      });
      continue;
    }

    const result = await autoSyncStravaForUser({
      userId: connection.userId,
    });

    summary.usersSynced += 1;
    summary.imported += result.importedCount;
    summary.skipped += result.skippedCount;
    summary.errors += result.errorCount;
    summary.results.push({
      userId: connection.userId,
      status: result.status,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      message: result.lastSyncError ?? undefined,
    });
  }

  return summary;
}
