import type { TirePressureSetup } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { PressurePreference, PressureSurface } from "@/lib/constants";

export type PressurePresetInput = {
  bikeId: string;
  name: string;
  riderWeightLbs: number;
  bikeWeightLbs: number;
  gearWeightLbs?: number;
  frontTireWidthMm: number;
  rearTireWidthMm: number;
  tubeless: boolean;
  surface: PressureSurface;
  preference: PressurePreference;
  frontPsi: number;
  rearPsi: number;
  notes?: string;
};

export async function createPressurePreset(
  input: PressurePresetInput,
): Promise<TirePressureSetup> {
  return prisma.tirePressureSetup.create({
    data: {
      bikeId: input.bikeId,
      name: input.name,
      riderWeightLbs: input.riderWeightLbs,
      bikeWeightLbs: input.bikeWeightLbs,
      gearWeightLbs: input.gearWeightLbs,
      frontTireWidthMm: input.frontTireWidthMm,
      rearTireWidthMm: input.rearTireWidthMm,
      tubeless: input.tubeless,
      surface: input.surface,
      preference: input.preference,
      frontPsi: input.frontPsi,
      rearPsi: input.rearPsi,
      notes: input.notes,
    },
  });
}

export async function updatePressurePreset(
  presetId: string,
  input: Omit<PressurePresetInput, "bikeId">,
): Promise<TirePressureSetup | null> {
  const existing = await prisma.tirePressureSetup.findUnique({
    where: { id: presetId },
    select: { id: true },
  });

  if (!existing) {
    return null;
  }

  return prisma.tirePressureSetup.update({
    where: { id: presetId },
    data: {
      name: input.name,
      riderWeightLbs: input.riderWeightLbs,
      bikeWeightLbs: input.bikeWeightLbs,
      gearWeightLbs: input.gearWeightLbs,
      frontTireWidthMm: input.frontTireWidthMm,
      rearTireWidthMm: input.rearTireWidthMm,
      tubeless: input.tubeless,
      surface: input.surface,
      preference: input.preference,
      frontPsi: input.frontPsi,
      rearPsi: input.rearPsi,
      notes: input.notes,
    },
  });
}

export async function deletePressurePreset(presetId: string): Promise<boolean> {
  const existing = await prisma.tirePressureSetup.findUnique({
    where: { id: presetId },
    select: { id: true },
  });

  if (!existing) {
    return false;
  }

  await prisma.tirePressureSetup.delete({
    where: { id: presetId },
  });

  return true;
}
