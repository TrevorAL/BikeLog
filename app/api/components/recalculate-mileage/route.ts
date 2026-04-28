import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { recalculateComponentMileageFromRides } from "@/lib/mileage-recalculation";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const bikeIdInput = optionalString(body.bikeId);
    let bikeId = bikeIdInput;

    if (!bikeId) {
      const bike = await prisma.bike.findFirst({
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
        },
      });

      bikeId = bike?.id;
    }

    if (!bikeId) {
      return NextResponse.json(
        { error: "No bike found. Seed the database first with `npm run db:seed`." },
        { status: 404 },
      );
    }

    const apply = body.apply === true;
    const result = await recalculateComponentMileageFromRides({
      bikeId,
      apply,
    });

    if (!result) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Failed to recalculate component mileage", error);
    return NextResponse.json(
      { error: "Could not recalculate mileage right now." },
      { status: 500 },
    );
  }
}

