export const COMPONENT_TYPES = [
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
  "DI2_BATTERY",
  "PEDALS",
  "WHEELSET",
  "CRANKSET",
  "HANDLEBAR",
  "STEM",
  "SADDLE",
  "OTHER",
] as const;

export function formatComponentType(type: string) {
  return type.replaceAll("_", " ");
}

export const DEFAULT_COMPONENT_NAME_BY_TYPE: Record<string, string> = {
  CHAIN: "Chain",
  CASSETTE: "Cassette",
  FRONT_TIRE: "Front Tire",
  REAR_TIRE: "Rear Tire",
  FRONT_BRAKE_PAD: "Front Brake Pads",
  REAR_BRAKE_PAD: "Rear Brake Pads",
  FRONT_ROTOR: "Front Rotor",
  REAR_ROTOR: "Rear Rotor",
  CHAINRINGS: "Chainrings",
  CLEATS: "Cleats",
  BAR_TAPE: "Bar Tape",
  DI2_BATTERY: "Di2 Battery",
  PEDALS: "Pedals",
  WHEELSET: "Wheelset",
  CRANKSET: "Crankset",
  HANDLEBAR: "Handlebar",
  STEM: "Stem",
  SADDLE: "Saddle",
  OTHER: "Component",
};
