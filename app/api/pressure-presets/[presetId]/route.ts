import { NextResponse } from "next/server";

import type { PressurePreference, PressureSurface } from "@/lib/constants";
import {
  deletePressurePreset,
  updatePressurePreset,
} from "@/lib/pressure-preset-service";
import { PRESSURE_PREFERENCES, PRESSURE_SURFACES } from "@/lib/pressure-options";

type RouteContext = {
  params: Promise<{
    presetId: string;
  }>;
};

const validSurfaces = new Set(PRESSURE_SURFACES.map((option) => option.value));
const validPreferences = new Set(PRESSURE_PREFERENCES.map((option) => option.value));

function optionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseNumberField(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a number.`);
  }

  return parsed;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { presetId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    const name = optionalString(body.name);
    if (!name) {
      throw new Error("Preset name is required.");
    }

    const surface = optionalString(body.surface);
    if (!surface || !validSurfaces.has(surface as PressureSurface)) {
      throw new Error("Surface is invalid.");
    }

    const preference = optionalString(body.preference);
    if (!preference || !validPreferences.has(preference as PressurePreference)) {
      throw new Error("Ride priority is invalid.");
    }

    const riderWeightLbs = parseNumberField(body.riderWeightLbs, "Rider weight");
    const bikeWeightLbs = parseNumberField(body.bikeWeightLbs, "Bike weight");

    const gearWeightRaw = body.gearWeightLbs;
    const gearWeightLbs =
      gearWeightRaw === "" || gearWeightRaw === undefined || gearWeightRaw === null
        ? undefined
        : parseNumberField(gearWeightRaw, "Gear weight");

    const frontTireWidthMm = parseNumberField(body.frontTireWidthMm, "Front tire width");
    const rearTireWidthMm = parseNumberField(body.rearTireWidthMm, "Rear tire width");
    const frontPsi = parseNumberField(body.frontPsi, "Front PSI");
    const rearPsi = parseNumberField(body.rearPsi, "Rear PSI");

    if (
      riderWeightLbs <= 0 ||
      bikeWeightLbs <= 0 ||
      frontTireWidthMm <= 0 ||
      rearTireWidthMm <= 0 ||
      frontPsi <= 0 ||
      rearPsi <= 0
    ) {
      throw new Error("Numeric fields must be greater than 0.");
    }

    if (gearWeightLbs !== undefined && gearWeightLbs < 0) {
      throw new Error("Gear weight cannot be negative.");
    }

    const preset = await updatePressurePreset(presetId, {
      name,
      riderWeightLbs,
      bikeWeightLbs,
      gearWeightLbs,
      frontTireWidthMm,
      rearTireWidthMm,
      tubeless: Boolean(body.tubeless),
      surface: surface as PressureSurface,
      preference: preference as PressurePreference,
      frontPsi,
      rearPsi,
      notes: optionalString(body.notes),
    });

    if (!preset) {
      return NextResponse.json({ error: "Preset not found." }, { status: 404 });
    }

    return NextResponse.json({ preset });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Failed to update pressure preset", error);
    return NextResponse.json(
      { error: "Could not update pressure preset right now." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { presetId } = await context.params;
    const deleted = await deletePressurePreset(presetId);

    if (!deleted) {
      return NextResponse.json({ error: "Preset not found." }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Failed to delete pressure preset", error);
    return NextResponse.json(
      { error: "Could not delete pressure preset right now." },
      { status: 500 },
    );
  }
}
