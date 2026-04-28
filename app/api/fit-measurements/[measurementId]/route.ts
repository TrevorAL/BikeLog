import { NextResponse } from "next/server";

import { updateFitMeasurement } from "@/lib/fit-service";

type RouteContext = {
  params: Promise<{
    measurementId: string;
  }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { measurementId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const dateInput = optionalString(body.date);

    if (!dateInput) {
      return NextResponse.json({ error: "Date is required." }, { status: 400 });
    }

    const date = new Date(dateInput);

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Date is invalid." }, { status: 400 });
    }

    const measurement = await updateFitMeasurement(measurementId, {
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
      isCurrent: body.isCurrent === undefined ? undefined : Boolean(body.isCurrent),
    });

    if (!measurement) {
      return NextResponse.json({ error: "Measurement not found." }, { status: 404 });
    }

    return NextResponse.json({ measurement });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to update fit measurement", error);
    return NextResponse.json(
      { error: "Could not update fit measurement right now." },
      { status: 500 },
    );
  }
}
