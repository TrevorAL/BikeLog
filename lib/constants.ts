export type MaintenanceStatus = "GOOD" | "DUE_SOON" | "DUE_NOW" | "OVERDUE";

export type PressureSurface =
  | "smooth"
  | "normal"
  | "rough"
  | "wet"
  | "light_gravel"
  | "trainer";

export type PressurePreference = "comfort" | "balanced" | "speed" | "grip";

export const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bike", label: "Bike" },
  { href: "/components", label: "Components" },
  { href: "/rides", label: "Rides" },
  { href: "/maintenance", label: "Maintenance" },
  { href: "/pressure", label: "Pressure" },
  { href: "/fit", label: "Fit" },
  { href: "/checklist", label: "Checklist" },
] as const;

export const DEFAULT_BIKE_SEED = {
  name: "Giant TCR Pro 0",
  brand: "Giant",
  model: "TCR Pro 0",
  year: 2023,
  type: "Road",
  frameMaterial: "Carbon",
  drivetrain: "Shimano Ultegra Di2 12-speed, 2x12",
  brakeType: "Shimano Ultegra hydraulic disc",
  wheelset: "Giant SLR 1 carbon",
  tireSetup: "Goodyear Eagle F1 25c",
  notes:
    "Shimano Ultegra crankset with 172.5 mm crank arms, 52/36 chainrings, and 10/34 cassette.",
};

export const DEFAULT_COMPONENTS_SEED = [
  { type: "CHAIN", name: "Chain", brand: "Shimano", model: "Ultegra 12-speed" },
  { type: "CASSETTE", name: "Cassette", brand: "Shimano", model: "Ultegra 10/34" },
  { type: "FRONT_TIRE", name: "Front Tire", brand: "Goodyear", model: "Eagle F1 25c" },
  { type: "REAR_TIRE", name: "Rear Tire", brand: "Goodyear", model: "Eagle F1 25c" },
  { type: "FRONT_BRAKE_PAD", name: "Front Brake Pads", brand: "Shimano", model: "Road disc pads" },
  { type: "REAR_BRAKE_PAD", name: "Rear Brake Pads", brand: "Shimano", model: "Road disc pads" },
  { type: "FRONT_ROTOR", name: "Front Rotor", brand: "Shimano", model: "Disc rotor" },
  { type: "REAR_ROTOR", name: "Rear Rotor", brand: "Shimano", model: "Disc rotor" },
  { type: "CHAINRINGS", name: "Chainrings", brand: "Shimano", model: "Ultegra 52/36" },
  { type: "DI2_BATTERY", name: "Di2 Battery", brand: "Shimano", model: "Internal Di2 battery" },
  { type: "WHEELSET", name: "Wheelset", brand: "Giant", model: "SLR 1 carbon" },
  { type: "CRANKSET", name: "Crankset", brand: "Shimano", model: "Ultegra 172.5 mm" },
  { type: "HANDLEBAR", name: "Handlebars", brand: "Easton", model: "EC70 Aero 420 mm" },
  { type: "STEM", name: "Stem", brand: "Specialized", model: "110 mm" },
  { type: "SADDLE", name: "Saddle", brand: "Giant", model: "Contact SL" },
] as const;

export const DEFAULT_CHECKLIST_ITEMS = [
  "Check tire pressure",
  "Check Di2 battery",
  "Quick brake test",
  "Inspect tires for cuts",
  "Check thru axles",
  "Check bottles/cages",
  "Check Garmin/computer battery",
  "Check lights",
  "Bring flat kit",
  "Bring nutrition for long ride",
] as const;

export const DEFAULT_PRESSURE_PRESETS = [
  {
    name: "Normal Road",
    riderWeightLbs: 165,
    bikeWeightLbs: 18,
    gearWeightLbs: 4,
    frontTireWidthMm: 25,
    rearTireWidthMm: 25,
    tubeless: false,
    surface: "normal",
    preference: "balanced",
    frontPsi: 73,
    rearPsi: 78,
  },
  {
    name: "Rough Boston Pavement",
    riderWeightLbs: 165,
    bikeWeightLbs: 18,
    gearWeightLbs: 4,
    frontTireWidthMm: 25,
    rearTireWidthMm: 25,
    tubeless: false,
    surface: "rough",
    preference: "comfort",
    frontPsi: 68,
    rearPsi: 73,
  },
  {
    name: "Wet Roads",
    riderWeightLbs: 165,
    bikeWeightLbs: 18,
    gearWeightLbs: 4,
    frontTireWidthMm: 25,
    rearTireWidthMm: 25,
    tubeless: false,
    surface: "wet",
    preference: "grip",
    frontPsi: 66,
    rearPsi: 71,
  },
] as const;

export const MAINTENANCE_INTERVALS = {
  tirePressure: { intervalMiles: 1, warningMilesBefore: 0 },
  tirePressureRefill: { intervalDays: 7, warningDaysBefore: 2 },
  chainLube: { intervalMiles: 120, warningMilesBefore: 20 },
  chainWear: { intervalMiles: 500, warningMilesBefore: 80 },
  tireInspection: { intervalMiles: 400, warningMilesBefore: 75 },
  brakePadInspection: { intervalMiles: 600, warningMilesBefore: 100 },
  di2Check: { intervalDays: 30, warningDaysBefore: 7 },
  di2ChargeRideTime: { intervalMinutes: 1500, warningMinutesBefore: 300 },
  lightsChargeRideTime: { intervalMinutes: 480, warningMinutesBefore: 120 },
  cleatInspection: { intervalMiles: 900, warningMilesBefore: 120 },
  barTapeInspection: { intervalMiles: 1800, warningMilesBefore: 200 },
  cassetteInspection: { intervalMiles: 2000, warningMilesBefore: 250 },
  rotorInspection: { intervalMiles: 1500, warningMilesBefore: 150 },
} as const;

export const MILEAGE_BASED_COMPONENT_TYPES = [
  "CHAIN",
  "CASSETTE",
  "FRONT_TIRE",
  "REAR_TIRE",
  "FRONT_BRAKE_PAD",
  "REAR_BRAKE_PAD",
  "FRONT_ROTOR",
  "REAR_ROTOR",
  "CHAINRINGS",
  "CLEATS",
  "BAR_TAPE",
  "PEDALS",
  "WHEELSET",
  "CRANKSET",
] as const;
