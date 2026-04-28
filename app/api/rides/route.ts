import { RideType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { getOwnedBikeId } from "@/lib/ownership";
import { createRideAndUpdateMileage, getRideConditionSuggestions } from "@/lib/rides";

const validRideTypes = new Set(Object.values(RideType));

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
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

    const roadCondition = optionalString(body.roadCondition);
    const wasWet = Boolean(body.wasWet);

    const ride = await createRideAndUpdateMileage({
      bikeId,
      date,
      distanceMiles: distanceInput,
      durationMinutes,
      rideType,
      weather: optionalString(body.weather),
      roadCondition,
      wasWet,
      notes: optionalString(body.notes),
    });

    return NextResponse.json({
      ride,
      suggestions: getRideConditionSuggestions({
        wasWet,
        roadCondition,
      }),
    });
  } catch (error) {
    console.error("Failed to create ride", error);
    return NextResponse.json(
      {
        error: "Could not create ride right now.",
      },
      { status: 500 },
    );
  }
}
