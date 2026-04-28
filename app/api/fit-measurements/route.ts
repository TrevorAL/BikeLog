import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { createFitMeasurement } from "@/lib/fit-service";
import { getOwnedBikeId } from "@/lib/ownership";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalNumber(value: unknown, fieldName: string) {
  if (value === "" || value === undefined || value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as Record<string, unknown>;

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

    const dateInput = optionalString(body.date);

    if (!dateInput) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const date = new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const measurement = await createFitMeasurement({
      bikeId,
      date,
      saddleHeightMm: optionalNumber(body.saddleHeightMm, "Saddle height"),
      saddleSetbackMm: optionalNumber(body.saddleSetbackMm, "Saddle setback"),
      saddleTiltDeg: optionalNumber(body.saddleTiltDeg, "Saddle tilt"),
      stemLengthMm: optionalNumber(body.stemLengthMm, "Stem length"),
      handlebarWidthMm: optionalNumber(body.handlebarWidthMm, "Handlebar width"),
      crankLengthMm: optionalNumber(body.crankLengthMm, "Crank length"),
      spacerStackMm: optionalNumber(body.spacerStackMm, "Spacer stack"),
      reachToHoodsMm: optionalNumber(body.reachToHoodsMm, "Reach to hoods"),
      cleatNotes: optionalString(body.cleatNotes),
      notes: optionalString(body.notes),
      isCurrent: Boolean(body.isCurrent),
    });

    return NextResponse.json({ measurement });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to create fit measurement", error);
    return NextResponse.json(
      { error: "Could not create fit measurement right now." },
      { status: 500 },
    );
  }
}
