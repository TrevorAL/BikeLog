import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setSelectedBikeIdForUser } from "@/lib/ownership";

type DistanceUnit = "MI" | "KM";
type PressureUnit = "PSI" | "BAR";

const validDistanceUnits = new Set<DistanceUnit>(["MI", "KM"]);
const validPressureUnits = new Set<PressureUnit>(["PSI", "BAR"]);

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalStringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidTimezone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isValidImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidUploadedAvatarPath(value: string) {
  return /^\/uploads\/avatars\/[a-zA-Z0-9._-]+$/.test(value);
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const distanceUnitInput = optionalString(body.distanceUnit);
    const pressureUnitInput = optionalString(body.pressureUnit);

    if (
      distanceUnitInput &&
      !validDistanceUnits.has(distanceUnitInput as DistanceUnit)
    ) {
      return NextResponse.json(
        { error: "Distance unit is invalid." },
        { status: 400 },
      );
    }

    if (
      pressureUnitInput &&
      !validPressureUnits.has(pressureUnitInput as PressureUnit)
    ) {
      return NextResponse.json(
        { error: "Pressure unit is invalid." },
        { status: 400 },
      );
    }

    const timezoneInput = optionalStringOrNull(body.timezone);
    if (typeof timezoneInput === "string" && !isValidTimezone(timezoneInput)) {
      return NextResponse.json({ error: "Timezone is invalid." }, { status: 400 });
    }

    const imageInput = optionalStringOrNull(body.image);
    if (
      typeof imageInput === "string" &&
      !isValidImageUrl(imageInput) &&
      !isValidUploadedAvatarPath(imageInput)
    ) {
      return NextResponse.json(
        {
          error: "Avatar must be an uploaded image or a valid http/https URL.",
        },
        { status: 400 },
      );
    }

    const selectedBikeIdInput = optionalString(body.selectedBikeId);
    if (selectedBikeIdInput) {
      const selectedBikeId = await setSelectedBikeIdForUser({
        userId: auth.user.id,
        bikeId: selectedBikeIdInput,
      });

      if (!selectedBikeId) {
        return NextResponse.json(
          { error: "Selected bike was not found for your account." },
          { status: 403 },
        );
      }
    }

    const updated = await prisma.user.update({
      where: {
        id: auth.user.id,
      },
      data: {
        ...(optionalStringOrNull(body.name) !== undefined
          ? { name: optionalStringOrNull(body.name) }
          : {}),
        ...(imageInput !== undefined ? { image: imageInput } : {}),
        ...(timezoneInput !== undefined ? { timezone: timezoneInput } : {}),
        ...(distanceUnitInput
          ? { distanceUnit: distanceUnitInput as DistanceUnit }
          : {}),
        ...(pressureUnitInput
          ? { pressureUnit: pressureUnitInput as PressureUnit }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        timezone: true,
        distanceUnit: true,
        pressureUnit: true,
        selectedBikeId: true,
      },
    });

    return NextResponse.json({
      user: updated,
    });
  } catch (error) {
    console.error("Failed to update profile", error);
    return NextResponse.json(
      { error: "Could not update profile right now." },
      { status: 500 },
    );
  }
}
