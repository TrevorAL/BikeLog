import { RideType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isRideOwnedByUser } from "@/lib/ownership";
import {
  deleteRideAndAdjustMileage,
  getRideConditionSuggestions,
  updateRideAndAdjustMileage,
} from "@/lib/rides";
import {
  fetchStravaActivityById,
  fetchStravaActivityStreamsById,
} from "@/lib/strava";

type RouteContext = {
  params: Promise<{
    rideId: string;
  }>;
};

const validRideTypes = new Set(Object.values(RideType));

function metersToMiles(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value / 1609.344;
}

function metersPerSecondToMph(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value * 2.2369362920544;
}

function metersToFeet(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return value * 3.2808398950131;
}

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { rideId } = await context.params;
    const ride = await prisma.ride.findFirst({
      where: {
        id: rideId,
        bike: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
        bikeId: true,
        date: true,
        distanceMiles: true,
        durationMinutes: true,
        rideType: true,
        weather: true,
        roadCondition: true,
        wasWet: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        stravaImport: {
          select: {
            stravaActivityId: true,
            activityName: true,
            activityType: true,
            startedAt: true,
            distanceMeters: true,
            movingTimeSeconds: true,
            importedAt: true,
          },
        },
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    if (!ride.stravaImport?.stravaActivityId) {
      return NextResponse.json({
        ride: {
          ...ride,
          date: ride.date.toISOString(),
          createdAt: ride.createdAt.toISOString(),
          updatedAt: ride.updatedAt.toISOString(),
        },
        strava: {
          imported: false,
          stravaActivityId: null,
          detail: null,
          streams: null,
          error: null,
        },
      });
    }

    try {
      const [activityResult, streamsResult] = await Promise.allSettled([
        fetchStravaActivityById({
          userId: auth.user.id,
          activityId: ride.stravaImport.stravaActivityId,
        }),
        fetchStravaActivityStreamsById({
          userId: auth.user.id,
          activityId: ride.stravaImport.stravaActivityId,
        }),
      ]);

      if (activityResult.status === "rejected") {
        throw activityResult.reason;
      }

      const activity = activityResult.value;
      const streams = streamsResult.status === "fulfilled" ? streamsResult.value : null;
      const streamError =
        streamsResult.status === "rejected"
          ? streamsResult.reason instanceof Error
            ? streamsResult.reason.message
            : "Could not load Strava stream data."
          : null;

      return NextResponse.json({
        ride: {
          ...ride,
          date: ride.date.toISOString(),
          createdAt: ride.createdAt.toISOString(),
          updatedAt: ride.updatedAt.toISOString(),
          stravaImport: {
            ...ride.stravaImport,
            startedAt: ride.stravaImport.startedAt.toISOString(),
            importedAt: ride.stravaImport.importedAt.toISOString(),
          },
        },
        strava: {
          imported: true,
          stravaActivityId: ride.stravaImport.stravaActivityId,
          detail: {
            id: String(activity.id),
            name: activity.name,
            type: activity.sport_type ?? activity.type ?? null,
            startDate: activity.start_date ?? null,
            startDateLocal: activity.start_date_local ?? null,
            distanceMeters:
              typeof activity.distance === "number" ? activity.distance : null,
            distanceMiles: metersToMiles(activity.distance ?? null),
            movingTimeSeconds:
              typeof activity.moving_time === "number" ? activity.moving_time : null,
            elapsedTimeSeconds:
              typeof activity.elapsed_time === "number" ? activity.elapsed_time : null,
            totalElevationGainMeters:
              typeof activity.total_elevation_gain === "number"
                ? activity.total_elevation_gain
                : null,
            totalElevationGainFeet: metersToFeet(activity.total_elevation_gain ?? null),
            elevHighMeters:
              typeof activity.elev_high === "number" ? activity.elev_high : null,
            elevLowMeters:
              typeof activity.elev_low === "number" ? activity.elev_low : null,
            averageSpeedMetersPerSecond:
              typeof activity.average_speed === "number"
                ? activity.average_speed
                : null,
            averageSpeedMph: metersPerSecondToMph(activity.average_speed ?? null),
            maxSpeedMetersPerSecond:
              typeof activity.max_speed === "number" ? activity.max_speed : null,
            maxSpeedMph: metersPerSecondToMph(activity.max_speed ?? null),
            averageCadence:
              typeof activity.average_cadence === "number"
                ? activity.average_cadence
                : null,
            averageWatts:
              typeof activity.average_watts === "number" ? activity.average_watts : null,
            weightedAverageWatts:
              typeof activity.weighted_average_watts === "number"
                ? activity.weighted_average_watts
                : null,
            maxWatts: typeof activity.max_watts === "number" ? activity.max_watts : null,
            averageHeartrate:
              typeof activity.average_heartrate === "number"
                ? activity.average_heartrate
                : null,
            maxHeartrate:
              typeof activity.max_heartrate === "number" ? activity.max_heartrate : null,
            calories: typeof activity.calories === "number" ? activity.calories : null,
            kilojoules:
              typeof activity.kilojoules === "number" ? activity.kilojoules : null,
            sufferScore:
              typeof activity.suffer_score === "number" ? activity.suffer_score : null,
            kudosCount:
              typeof activity.kudos_count === "number" ? activity.kudos_count : null,
            commentCount:
              typeof activity.comment_count === "number" ? activity.comment_count : null,
            achievementCount:
              typeof activity.achievement_count === "number"
                ? activity.achievement_count
                : null,
            deviceWatts:
              typeof activity.device_watts === "boolean" ? activity.device_watts : null,
            trainer: Boolean(activity.trainer),
            commute: Boolean(activity.commute),
            mapSummaryPolyline:
              typeof activity.map?.summary_polyline === "string"
                ? activity.map.summary_polyline
                : null,
            mapPolyline:
              typeof activity.map?.polyline === "string" ? activity.map.polyline : null,
          },
          streams,
          error: streamError,
        },
      });
    } catch (error) {
      const stravaError =
        error instanceof Error
          ? error.message
          : "Could not load Strava details for this ride right now.";

      return NextResponse.json({
        ride: {
          ...ride,
          date: ride.date.toISOString(),
          createdAt: ride.createdAt.toISOString(),
          updatedAt: ride.updatedAt.toISOString(),
          stravaImport: {
            ...ride.stravaImport,
            startedAt: ride.stravaImport.startedAt.toISOString(),
            importedAt: ride.stravaImport.importedAt.toISOString(),
          },
        },
        strava: {
          imported: true,
          stravaActivityId: ride.stravaImport.stravaActivityId,
          detail: null,
          streams: null,
          error: stravaError,
        },
      });
    }
  } catch (error) {
    console.error("Failed to fetch ride details", error);
    return NextResponse.json(
      {
        error: "Could not load ride details right now.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { rideId } = await context.params;
    const isOwned = await isRideOwnedByUser({
      rideId,
      userId: auth.user.id,
    });

    if (!isOwned) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const dateInput = optionalString(body.date);
    const distanceInput = Number(body.distanceMiles);
    const durationInput = body.durationMinutes;

    if (!dateInput) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const date = new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    if (!Number.isFinite(distanceInput) || distanceInput <= 0) {
      return NextResponse.json(
        { error: "Distance must be greater than 0." },
        { status: 400 },
      );
    }

    const durationMinutes =
      durationInput === "" || durationInput === undefined || durationInput === null
        ? undefined
        : Number(durationInput);

    if (
      durationMinutes !== undefined &&
      (!Number.isFinite(durationMinutes) || durationMinutes < 0)
    ) {
      return NextResponse.json(
        { error: "Duration must be a positive number." },
        { status: 400 },
      );
    }

    const rideTypeInput = optionalString(body.rideType);
    const rideType =
      rideTypeInput && validRideTypes.has(rideTypeInput as RideType)
        ? (rideTypeInput as RideType)
        : RideType.OUTDOOR;

    const roadCondition = optionalString(body.roadCondition);
    const wasWet = Boolean(body.wasWet);

    const ride = await updateRideAndAdjustMileage(rideId, {
      date,
      distanceMiles: distanceInput,
      durationMinutes,
      rideType,
      weather: optionalString(body.weather),
      roadCondition,
      wasWet,
      notes: optionalString(body.notes),
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    return NextResponse.json({
      ride,
      suggestions: getRideConditionSuggestions({
        wasWet,
        roadCondition,
      }),
    });
  } catch (error) {
    console.error("Failed to update ride", error);
    return NextResponse.json(
      {
        error: "Could not update ride right now.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(_request);
    if ("response" in auth) {
      return auth.response;
    }

    const { rideId } = await context.params;
    const isOwned = await isRideOwnedByUser({
      rideId,
      userId: auth.user.id,
    });

    if (!isOwned) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    const deletedRide = await deleteRideAndAdjustMileage(rideId);

    if (!deletedRide) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    return NextResponse.json({
      deletedRide,
    });
  } catch (error) {
    console.error("Failed to delete ride", error);
    return NextResponse.json(
      {
        error: "Could not delete ride right now.",
      },
      { status: 500 },
    );
  }
}
