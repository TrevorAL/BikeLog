import { NextResponse } from "next/server";

import { markFitMeasurementCurrent } from "@/lib/fit-service";

type RouteContext = {
  params: Promise<{
    measurementId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { measurementId } = await context.params;
    const measurement = await markFitMeasurementCurrent(measurementId);

    if (!measurement) {
      return NextResponse.json({ error: "Measurement not found." }, { status: 404 });
    }

    return NextResponse.json({ measurement });
  } catch (error) {
    console.error("Failed to mark fit measurement current", error);
    return NextResponse.json(
      { error: "Could not mark fit measurement as current right now." },
      { status: 500 },
    );
  }
}
