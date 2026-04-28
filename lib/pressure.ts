import type { PressurePreference, PressureSurface } from "@/lib/constants";

export type PressureInput = {
  riderWeightLbs: number;
  bikeWeightLbs: number;
  gearWeightLbs?: number;
  frontTireWidthMm: number;
  rearTireWidthMm: number;
  tubeless: boolean;
  surface: PressureSurface;
  preference: PressurePreference;
};

export function calculatePressure(input: PressureInput) {
  const totalWeight =
    input.riderWeightLbs + input.bikeWeightLbs + (input.gearWeightLbs ?? 0);

  const frontLoad = totalWeight * 0.45;
  const rearLoad = totalWeight * 0.55;

  const frontWidthFactor = 25 / input.frontTireWidthMm;
  const rearWidthFactor = 25 / input.rearTireWidthMm;

  let frontPsi = frontLoad * 0.95 * frontWidthFactor;
  let rearPsi = rearLoad * 0.95 * rearWidthFactor;

  const surfaceFactorMap: Record<PressureSurface, number> = {
    smooth: 1.04,
    normal: 1,
    rough: 0.92,
    wet: 0.9,
    light_gravel: 0.82,
    trainer: 1,
  };

  const preferenceFactorMap: Record<PressurePreference, number> = {
    comfort: 0.96,
    balanced: 1,
    speed: 1.03,
    grip: 0.94,
  };

  const tubelessFactor = input.tubeless ? 0.95 : 1;

  const factor =
    surfaceFactorMap[input.surface] *
    preferenceFactorMap[input.preference] *
    tubelessFactor;

  frontPsi *= factor;
  rearPsi *= factor;

  return {
    frontPsi: Math.round(frontPsi),
    rearPsi: Math.round(rearPsi),
  };
}
