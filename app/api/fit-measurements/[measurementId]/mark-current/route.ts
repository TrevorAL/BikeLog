import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { markFitMeasurementCurrent } from "@/lib/fit-service";

type RouteContext = {
  params: Promise<{
    measurementId: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(_request);
    if ("response" in auth) {
      return auth.response;
    }

    const { measurementId } = await context.params;
    const existing = await prisma.fitMeasurement.findFirst({
      where: {
        id: measurementId,
        bike: {
          userId: auth.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Measurement not found." }, { status: 404 });
    }

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
