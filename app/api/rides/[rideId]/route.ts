import { RideType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { isRideOwnedByUser } from "@/lib/ownership";
import {
  deleteRideAndAdjustMileage,
  getRideConditionSuggestions,
  updateRideAndAdjustMileage,
} from "@/lib/rides";

type RouteContext = {
  params: Promise<{
    rideId: string;
  }>;
};

const validRideTypes = new Set(Object.values(RideType));

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
