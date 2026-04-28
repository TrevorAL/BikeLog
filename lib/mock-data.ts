import type { MaintenanceStatus } from "@/lib/constants";
import { DEFAULT_BIKE_SEED } from "@/lib/constants";
import { buildMaintenanceSummary } from "@/lib/maintenance";
import { calculatePressure } from "@/lib/pressure";
import { calculateReadinessScore, getReadinessLabel } from "@/lib/readiness";
import {
  seedChecklistItems,
  seedComponents,
  seedPressurePresets,
} from "@/lib/seed";

export const mockBike = {
  id: "bike_giant_tcr_pro_0",
  ...DEFAULT_BIKE_SEED,
  frameSize: "M/L",
  crankLengthMm: 172.5,
  chainrings: "52/36",
  cassette: "10/34 12-speed",
  handlebars: "Easton EC70 Aero 420 mm",
  stem: "Specialized 110 mm",
  saddle: "Giant Contact SL",
};

const componentStatusCycle: MaintenanceStatus[] = [
  "GOOD",
  "DUE_SOON",
  "GOOD",
  "GOOD",
  "DUE_NOW",
  "GOOD",
  "GOOD",
  "GOOD",
  "DUE_SOON",
  "GOOD",
  "GOOD",
  "GOOD",
  "GOOD",
  "GOOD",
  "GOOD",
];

export const mockComponents = seedComponents.map((component, index) => ({
  id: `component_${index}`,
  type: component.type,
  name: component.name,
  brandModel: `${component.brand ?? ""} ${component.model ?? ""}`.trim(),
  installDate: component.installDate,
  currentMileage: component.currentMileage + index * 7,
  conditionStatus: componentStatusCycle[index] ?? "GOOD",
  nextMaintenance:
    component.name === "Chain"
      ? "Wear check due in 88 mi"
      : component.name.includes("Tire")
        ? "Inspect tread in 62 mi"
        : "No immediate action",
}));

export const mockRides = [
  {
    id: "ride_1",
    date: new Date("2026-04-25"),
    distanceMiles: 38.5,
    durationMinutes: 115,
    rideType: "GROUP_RIDE",
    weather: "Cloudy, 58F",
    roadCondition: "Rough",
    wasWet: false,
    notes: "Fast town line loop with a rough final segment.",
  },
  {
    id: "ride_2",
    date: new Date("2026-04-22"),
    distanceMiles: 21.2,
    durationMinutes: 68,
    rideType: "TRAINING",
    weather: "Light rain",
    roadCondition: "Wet",
    wasWet: true,
    notes: "Tempo intervals in drizzle.",
  },
  {
    id: "ride_3",
    date: new Date("2026-04-18"),
    distanceMiles: 52.4,
    durationMinutes: 162,
    rideType: "LONG_RIDE",
    weather: "Sunny, 62F",
    roadCondition: "Normal",
    wasWet: false,
    notes: "Long endurance day.",
  },
];

export const mockMaintenanceEvents = [
  {
    id: "maint_1",
    date: new Date("2026-04-23"),
    type: "LUBED_CHAIN",
    mileageAtService: 320,
    notes: "Dry lube after rainy commute.",
    componentName: "Chain",
  },
  {
    id: "maint_2",
    date: new Date("2026-04-10"),
    type: "CHECKED_TIRE_PRESSURE",
    mileageAtService: 285,
    notes: "Set 72/77 before weekend ride.",
    componentName: "Front Tire",
  },
  {
    id: "maint_3",
    date: new Date("2026-03-30"),
    type: "CHARGED_DI2",
    mileageAtService: 240,
    notes: "Full recharge, firmware current.",
    componentName: "Di2 Battery",
  },
];

export const mockFitMeasurements = [
  {
    id: "fit_1",
    date: new Date("2026-04-12"),
    saddleHeightMm: 742,
    saddleSetbackMm: 58,
    saddleTiltDeg: -1,
    stemLengthMm: 110,
    handlebarWidthMm: 420,
    crankLengthMm: 172.5,
    spacerStackMm: 18,
    reachToHoodsMm: 495,
    cleatNotes: "Right cleat 1 mm aft",
    notes: "Stable for long rides.",
    isCurrent: true,
  },
  {
    id: "fit_2",
    date: new Date("2026-02-01"),
    saddleHeightMm: 740,
    saddleSetbackMm: 57,
    saddleTiltDeg: -1,
    stemLengthMm: 110,
    handlebarWidthMm: 420,
    crankLengthMm: 172.5,
    spacerStackMm: 20,
    reachToHoodsMm: 492,
    cleatNotes: "Centered",
    notes: "Winter trainer setup.",
    isCurrent: false,
  },
];

export const mockChecklistItems = seedChecklistItems.map((item, index) => ({
  id: `check_${index}`,
  label: item.label,
  sortOrder: item.sortOrder,
  isDefault: item.isDefault,
  completed: index < 3,
}));

export const mockPressurePresets = seedPressurePresets.map((preset, index) => ({
  id: `preset_${index}`,
  ...preset,
}));

export const bikeMileageTotal = mockRides.reduce(
  (total, ride) => total + ride.distanceMiles,
  0,
);

export const maintenanceSummary = buildMaintenanceSummary({
  bikeMileage: 412,
  lastChainLubeMileage: 320,
  lastChainWearMileage: 0,
  lastTireInspectMileage: 60,
  lastBrakeInspectMileage: 100,
  lastCleatInspectMileage: 0,
  lastBarTapeInspectMileage: 0,
  lastCassetteInspectMileage: 0,
  lastRotorInspectMileage: 0,
  lastDi2ChargeDate: new Date("2026-03-30"),
  hasRecentWetRide: true,
  hasRecentRoughRide: true,
});

const readinessScore = calculateReadinessScore({
  statuses: maintenanceSummary.dueItems.map((item) => item.status),
  hasRecentWetRide: true,
  chainCleanedAfterWetRide: false,
  tirePressureCheckedRecently: true,
  di2StatusKnown: true,
});

export const mockReadiness = {
  score: readinessScore,
  label: getReadinessLabel(readinessScore),
};

export const mockPressureRecommendation = calculatePressure({
  riderWeightLbs: 165,
  bikeWeightLbs: 18,
  gearWeightLbs: 4,
  frontTireWidthMm: 25,
  rearTireWidthMm: 25,
  tubeless: false,
  surface: "normal",
  preference: "balanced",
});
