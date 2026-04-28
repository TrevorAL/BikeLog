import {
  DEFAULT_BIKE_SEED,
  DEFAULT_CHECKLIST_ITEMS,
  DEFAULT_COMPONENTS_SEED,
  DEFAULT_PRESSURE_PRESETS,
} from "./constants";

export const seedBike = DEFAULT_BIKE_SEED;

export const seedComponents = DEFAULT_COMPONENTS_SEED.map((component, index) => ({
  ...component,
  installDate: new Date(Date.now() - (index + 5) * 24 * 60 * 60 * 1000),
  currentMileage: index === 0 ? 412 : 356,
}));

export const seedChecklistItems = DEFAULT_CHECKLIST_ITEMS.map((label, index) => ({
  label,
  sortOrder: index,
  isDefault: true,
}));

export const seedPressurePresets = DEFAULT_PRESSURE_PRESETS;
