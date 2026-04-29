import { Prisma, StravaSyncStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOwnedBikeId } from "@/lib/ownership";
import { createRideAndUpdateMileageWithTx } from "@/lib/rides";
import {
  fetchStravaActivityById,
  getFreshStravaConnectionForUser,
  recordStravaSyncResult,
  toRideCreationPayload,
} from "@/lib/strava";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseActivityIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);

  return [...new Set(normalized)].slice(0, 50);
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

    const activityIds = parseActivityIds(body.activityIds);
    if (activityIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one Strava activity to import." },
        { status: 400 },
      );
    }

    const connection = await getFreshStravaConnectionForUser(auth.user.id);
    if (!connection) {
      return NextResponse.json(
        { error: "Connect Strava before importing rides." },
        { status: 400 },
      );
    }

    const existingImports = await prisma.stravaActivityImport.findMany({
      where: {
        stravaConnectionId: connection.id,
        stravaActivityId: {
          in: activityIds,
        },
      },
      select: {
        stravaActivityId: true,
      },
    });

    const existingIds = new Set(existingImports.map((entry) => entry.stravaActivityId));
    const skipped: Array<{ activityId: string; reason: string }> = [];
    const errors: Array<{ activityId: string; reason: string }> = [];
    const imported: Array<{
      activityId: string;
      rideId: string;
      name: string;
      startedAt: string;
      distanceMiles: number;
    }> = [];

    for (const activityId of activityIds) {
      if (existingIds.has(activityId)) {
        skipped.push({
          activityId,
          reason: "Already imported.",
        });
        continue;
      }

      try {
        const activity = await fetchStravaActivityById({
          userId: auth.user.id,
          activityId,
        });

        const payload = toRideCreationPayload(activity);
        if (!payload) {
          skipped.push({
            activityId,
            reason: "Unsupported or invalid activity data.",
          });
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
            bikeId,
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
              bikeId,
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
          skipped.push({
            activityId,
            reason: "Already imported.",
          });
          continue;
        }

        importedCount += 1;

        imported.push({
          activityId,
          rideId: created.id,
          name: activityName,
          startedAt: created.date.toISOString(),
          distanceMiles: created.distanceMiles,
        });
      } catch (error) {
        if (isDuplicateError(error)) {
          skipped.push({
            activityId,
            reason: "Already imported.",
          });
          continue;
        }

        errors.push({
          activityId,
          reason:
            error instanceof Error
              ? error.message
              : "Unexpected import error.",
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
      skippedCount: skipped.length,
      errorCount: errors.length,
      imported,
      skipped,
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
    console.error("Failed to confirm Strava import", error);

    await recordStravaSyncResult({
      userId: auth.user.id,
      status: StravaSyncStatus.ERROR,
      importedCount,
      error:
        error instanceof Error
          ? error.message
          : "Could not import Strava rides right now.",
    }).catch(() => {
      // Do not mask the primary failure if status update fails.
    });

    return NextResponse.json(
      { error: "Could not import Strava rides right now." },
      { status: 500 },
    );
  }
}
