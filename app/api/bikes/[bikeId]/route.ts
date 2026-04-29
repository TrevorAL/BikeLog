import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSelectedBikeIdForUser } from "@/lib/ownership";

type RouteContext = {
  params: Promise<{
    bikeId: string;
  }>;
};

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

function optionalBoolean(value: unknown) {
  if (typeof value !== "boolean") {
    return undefined;
  }

  return value;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const { bikeId } = await context.params;

    const existingBike = await prisma.bike.findFirst({
      where: {
        id: bikeId,
        userId: auth.user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingBike) {
      return NextResponse.json({ error: "Bike not found." }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    const name = body.name === undefined ? undefined : optionalString(body.name);
    if (body.name !== undefined && !name) {
      return NextResponse.json({ error: "Bike name cannot be empty." }, { status: 400 });
    }

    const year = body.year === undefined ? undefined : optionalYear(body.year);
    if (year === null) {
      return NextResponse.json(
        { error: "Year must be between 1900 and 2100." },
        { status: 400 },
      );
    }

    const isArchived = optionalBoolean(body.isArchived);

    const data = {
      name,
      brand: body.brand === undefined ? undefined : optionalString(body.brand),
      model: body.model === undefined ? undefined : optionalString(body.model),
      year,
      type: body.type === undefined ? undefined : optionalString(body.type),
      frameSize: body.frameSize === undefined ? undefined : optionalString(body.frameSize),
      frameMaterial:
        body.frameMaterial === undefined ? undefined : optionalString(body.frameMaterial),
      drivetrain: body.drivetrain === undefined ? undefined : optionalString(body.drivetrain),
      brakeType: body.brakeType === undefined ? undefined : optionalString(body.brakeType),
      wheelset: body.wheelset === undefined ? undefined : optionalString(body.wheelset),
      tireSetup: body.tireSetup === undefined ? undefined : optionalString(body.tireSetup),
      notes: body.notes === undefined ? undefined : optionalString(body.notes),
      isArchived,
    };

    const hasUpdateField = Object.values(data).some((value) => value !== undefined);
    if (!hasUpdateField) {
      return NextResponse.json({ error: "No update fields provided." }, { status: 400 });
    }

    const bike = await prisma.bike.update({
      where: {
        id: bikeId,
      },
      data,
      select: {
        id: true,
        name: true,
        isArchived: true,
      },
    });

    if (isArchived !== undefined) {
      await getSelectedBikeIdForUser({
        userId: auth.user.id,
      });
    }

    return NextResponse.json({
      bike,
    });
  } catch (error) {
    console.error("Failed to update bike", error);
    return NextResponse.json(
      { error: "Could not update bike right now." },
      { status: 500 },
    );
  }
}
