import { Prisma, StravaSyncStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import { createRideAndUpdateMileageWithTx } from "@/lib/rides";
import {
  fetchStravaActivityById,
  fetchStravaActivityPreview,
  fetchStravaBikeOptions,
  getFreshStravaConnectionForUser,
  recordStravaSyncResult,
  resolveStravaBikeOptions,
  toRideCreationPayload,
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

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

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

export async function POST(request: Request) {
  const auth = await requireApiUser(request);
  if ("response" in auth) {
    return auth.response;
  }

  let importedCount = 0;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const bikeIdInput = optionalString(body.bikeId);
    const bikeId = await getOwnedBikeId({
      userId: auth.user.id,
      bikeId: bikeIdInput,
    });

    if (!bikeId) {
      return NextResponse.json(
        {
          error: bikeIdInput
            ? "Bike not found for current user."
            : "No bike found for current user.",
        },
        { status: bikeIdInput ? 403 : 404 },
      );
    }

    const bike = await prisma.bike.findUnique({
      where: {
        id: bikeId,
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        year: true,
      },
    });

    if (!bike) {
      return NextResponse.json(
        { error: "Bike not found for current user." },
        { status: 404 },
      );
    }

    const connection = await getFreshStravaConnectionForUser(auth.user.id);
    if (!connection) {
      return NextResponse.json(
        { error: "Connect Strava before importing rides." },
        { status: 400 },
      );
    }

    const [previewAll, stravaBikes] = await Promise.all([
      fetchStravaActivityPreview({
        userId: auth.user.id,
        limit: 100,
      }),
      fetchStravaBikeOptions({
        userId: auth.user.id,
      }),
    ]);

    const bikeOptions = await resolveStravaBikeOptions({
      userId: auth.user.id,
      baseOptions: stravaBikes,
      previewActivities: previewAll,
    });

    const candidateNames = uniqueNonEmpty([
      bike.name,
      [bike.brand, bike.model].filter(Boolean).join(" "),
      [bike.year, bike.brand, bike.model].filter(Boolean).join(" "),
      bike.model,
      bike.brand,
    ]);

    const scoredMatches = bikeOptions
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

    if (scoredMatches.length === 0) {
      return NextResponse.json({
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        matchedBike: null,
        message: `No Strava bike name match found for "${bike.name}".`,
        sync: {
          status: connection.lastSyncStatus,
          lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
          lastSyncImportedCount: connection.lastSyncImportedCount,
          lastSyncError: connection.lastSyncError,
        },
      });
    }

    const bestMatch = scoredMatches[0];
    const secondBest = scoredMatches[1];
    const isAmbiguous =
      Boolean(secondBest) && secondBest.score >= bestMatch.score - 10 && secondBest.score >= 20;

    if (isAmbiguous) {
      return NextResponse.json({
        importedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        matchedBike: null,
        message:
          "Multiple Strava bikes looked similar to this bike name. Use manual preview filter to choose one.",
        candidates: scoredMatches.slice(0, 3),
        sync: {
          status: connection.lastSyncStatus,
          lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
          lastSyncImportedCount: connection.lastSyncImportedCount,
          lastSyncError: connection.lastSyncError,
        },
      });
    }

    const matchingActivities = previewAll.filter(
      (activity) => activity.gearId === bestMatch.id,
    );
    const matchingActivityIds = matchingActivities.map(
      (activity) => activity.stravaActivityId,
    );

    const existingImports =
      matchingActivityIds.length > 0
        ? await prisma.stravaActivityImport.findMany({
            where: {
              stravaConnectionId: connection.id,
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
      await recordStravaSyncResult({
        userId: auth.user.id,
        status: StravaSyncStatus.NO_NEW_DATA,
        importedCount: 0,
        error: null,
      });

      return NextResponse.json({
        importedCount: 0,
        skippedCount,
        errorCount: 0,
        matchedBike: {
          id: bestMatch.id,
          label: bestMatch.label,
        },
        message: "No new Strava rides to import for the matched bike.",
        sync: {
          status: StravaSyncStatus.NO_NEW_DATA,
          lastSyncAt: new Date().toISOString(),
          lastSyncImportedCount: 0,
          lastSyncError: null,
        },
      });
    }

    const errors: Array<{ activityId: string; reason: string }> = [];

    for (const activityId of activityIdsToImport) {
      try {
        const activity = await fetchStravaActivityById({
          userId: auth.user.id,
          activityId,
        });

        const payload = toRideCreationPayload(activity);
        if (!payload) {
          continue;
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

        const created = await prisma.$transaction(async (tx) => {
          const existing = await tx.stravaActivityImport.findUnique({
            where: {
              stravaConnectionId_stravaActivityId: {
                stravaConnectionId: connection.id,
                stravaActivityId: activityId,
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
            bikeId: bike.id,
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
              stravaConnectionId: connection.id,
              stravaActivityId: activityId,
              bikeId: bike.id,
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

        if (!created) {
          continue;
        }

        importedCount += 1;
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

    const syncStatus =
      errors.length > 0 && importedCount === 0
        ? StravaSyncStatus.ERROR
        : importedCount > 0
          ? StravaSyncStatus.SUCCESS
          : StravaSyncStatus.NO_NEW_DATA;

    await recordStravaSyncResult({
      userId: auth.user.id,
      status: syncStatus,
      importedCount,
      error:
        syncStatus === StravaSyncStatus.ERROR
          ? errors[0]?.reason ?? "Strava import failed."
          : null,
    });

    return NextResponse.json({
      importedCount,
      skippedCount,
      errorCount: errors.length,
      matchedBike: {
        id: bestMatch.id,
        label: bestMatch.label,
      },
      errors,
      sync: {
        status: syncStatus,
        lastSyncAt: new Date().toISOString(),
        lastSyncImportedCount: importedCount,
        lastSyncError:
          syncStatus === StravaSyncStatus.ERROR
            ? errors[0]?.reason ?? "Strava import failed."
            : null,
      },
    });
  } catch (error) {
    console.error("Failed auto Strava import by bike name", error);

    await recordStravaSyncResult({
      userId: auth.user.id,
      status: StravaSyncStatus.ERROR,
      importedCount,
      error:
        error instanceof Error
          ? error.message
          : "Could not auto-import Strava rides right now.",
    }).catch(() => {
      // Do not mask primary failure.
    });

    return NextResponse.json(
      {
        error: "Could not auto-import Strava rides right now.",
      },
      { status: 500 },
    );
  }
}
