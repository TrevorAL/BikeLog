import type { PressurePreference, PressureSurface } from "@/lib/constants";

export const PRESSURE_SURFACES: Array<{ label: string; value: PressureSurface }> = [
  { label: "Smooth pavement", value: "smooth" },
  { label: "Normal pavement", value: "normal" },
  { label: "Rough pavement", value: "rough" },
  { label: "Wet roads", value: "wet" },
  { label: "Light gravel", value: "light_gravel" },
  { label: "Indoor trainer", value: "trainer" },
];

export const PRESSURE_PREFERENCES: Array<{ label: string; value: PressurePreference }> = [
  { label: "Comfort", value: "comfort" },
  { label: "Balanced", value: "balanced" },
  { label: "Speed", value: "speed" },
  { label: "Grip", value: "grip" },
];

export function formatPressureSurface(value: string) {
  const found = PRESSURE_SURFACES.find((surface) => surface.value === value);
  return found?.label ?? value.replaceAll("_", " ");
}

export function formatPressurePreference(value: string) {
  const found = PRESSURE_PREFERENCES.find((preference) => preference.value === value);
  return found?.label ?? value;
}
