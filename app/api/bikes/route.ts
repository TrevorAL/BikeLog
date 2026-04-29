import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSelectedBikeIdForUser } from "@/lib/ownership";

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalYear(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1900 || parsed > 2100) {
    return null;
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
    const name = optionalString(body.name);

    if (!name) {
      return NextResponse.json({ error: "Bike name is required." }, { status: 400 });
    }

    const year = optionalYear(body.year);
    if (year === null) {
      return NextResponse.json(
        { error: "Year must be between 1900 and 2100." },
        { status: 400 },
      );
    }

    const bike = await prisma.bike.create({
      data: {
        userId: auth.user.id,
        name,
        brand: optionalString(body.brand),
        model: optionalString(body.model),
        year,
        type: optionalString(body.type),
        frameSize: optionalString(body.frameSize),
        frameMaterial: optionalString(body.frameMaterial),
        drivetrain: optionalString(body.drivetrain),
        brakeType: optionalString(body.brakeType),
        wheelset: optionalString(body.wheelset),
        tireSetup: optionalString(body.tireSetup),
        notes: optionalString(body.notes),
      },
      select: {
        id: true,
        name: true,
      },
    });

    await getSelectedBikeIdForUser({
      userId: auth.user.id,
    });

    return NextResponse.json({
      bike,
    });
  } catch (error) {
    console.error("Failed to create bike", error);
    return NextResponse.json(
      { error: "Could not create bike right now." },
      { status: 500 },
    );
  }
}
