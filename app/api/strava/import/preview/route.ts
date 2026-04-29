import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import {
  fetchStravaActivityPreview,
  fetchStravaBikeOptions,
  getFreshStravaConnectionForUser,
  resolveStravaBikeOptions,
} from "@/lib/strava";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 20;
  }

  return Math.max(1, Math.min(Math.trunc(parsed), 50));
}

const STRAVA_BIKE_FILTER_ALL = "all";
const STRAVA_BIKE_FILTER_NONE = "none";

function applyStravaBikeFilter<TActivity extends { gearId: string | null }>(input: {
  activities: TActivity[];
  stravaBikeFilter: string;
}) : TActivity[] {
  if (input.stravaBikeFilter === STRAVA_BIKE_FILTER_ALL) {
    return input.activities;
  }

  if (input.stravaBikeFilter === STRAVA_BIKE_FILTER_NONE) {
    return input.activities.filter((activity) => !activity.gearId);
  }

  return input.activities.filter(
    (activity) => activity.gearId === input.stravaBikeFilter,
  );
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const bikeIdInput = optionalString(body.bikeId);
    const stravaBikeFilterInput =
      optionalString(body.stravaBikeFilter) ?? STRAVA_BIKE_FILTER_ALL;
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
        limit: parseLimit(body.limit),
      }),
      fetchStravaBikeOptions({
        userId: auth.user.id,
      }),
    ]);

    const preview = applyStravaBikeFilter({
      activities: previewAll,
      stravaBikeFilter: stravaBikeFilterInput,
    });
    const bikeOptions = await resolveStravaBikeOptions({
      userId: auth.user.id,
      baseOptions: stravaBikes,
      previewActivities: previewAll,
    });

    const previewIds = preview.map((activity) => activity.stravaActivityId);

    const imported =
      previewIds.length > 0
        ? await prisma.stravaActivityImport.findMany({
            where: {
              stravaConnectionId: connection.id,
              stravaActivityId: {
                in: previewIds,
              },
            },
            select: {
              stravaActivityId: true,
              rideId: true,
            },
          })
        : [];

    const importedByActivityId = new Map(
      imported.map((entry) => [entry.stravaActivityId, entry.rideId ?? null]),
    );

    const totalImportedCount = await prisma.stravaActivityImport.count({
      where: {
        stravaConnectionId: connection.id,
      },
    });

    return NextResponse.json({
      activities: preview.map((activity) => ({
        ...activity,
        alreadyImported: importedByActivityId.has(activity.stravaActivityId),
        rideId: importedByActivityId.get(activity.stravaActivityId) ?? null,
      })),
      bikeOptions,
      selectedBikeFilter: stravaBikeFilterInput,
      sync: {
        status: connection.lastSyncStatus,
        lastSyncAt: connection.lastSyncAt?.toISOString() ?? null,
        lastSyncImportedCount: connection.lastSyncImportedCount,
        lastSyncError: connection.lastSyncError,
        totalImportedCount,
        expiresAt: connection.expiresAt.toISOString(),
        scope: connection.scope,
      },
    });
  } catch (error) {
    console.error("Failed to preview Strava rides", error);
    return NextResponse.json(
      { error: "Could not load Strava ride preview right now." },
      { status: 500 },
    );
  }
}
