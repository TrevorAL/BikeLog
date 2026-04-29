export type SupportedDueActionKey =
  | "chain-lube"
  | "chain-wear"
  | "tire-inspect"
  | "brake-inspect"
  | "di2-charge"
  | "tire-pressure-check"
  | "lights-charge";

export type MaintenanceEventTypeValue =
  | "LUBED_CHAIN"
  | "CHECKED_CHAIN_WEAR"
  | "INSPECTED_TIRE"
  | "INSPECTED_BRAKE_PADS"
  | "CHARGED_DI2"
  | "CHECKED_TIRE_PRESSURE"
  | "OTHER";

export type ComponentTypeValue =
  | "CHAIN"
  | "FRONT_TIRE"
  | "REAR_TIRE"
  | "FRONT_BRAKE_PAD"
  | "REAR_BRAKE_PAD"
  | "DI2_BATTERY";

type MaintenanceDueAction = {
  eventType: MaintenanceEventTypeValue;
  componentTypePriority: ComponentTypeValue[];
  noteTag?: string;
};

export const LIGHTS_CHARGE_NOTE_TAG = "[BIKE_LIGHTS_CHARGED]";

export const MAINTENANCE_DUE_ACTIONS: Record<SupportedDueActionKey, MaintenanceDueAction> = {
  "chain-lube": {
    eventType: "LUBED_CHAIN",
    componentTypePriority: ["CHAIN"],
  },
  "chain-wear": {
    eventType: "CHECKED_CHAIN_WEAR",
    componentTypePriority: ["CHAIN"],
  },
  "tire-inspect": {
    eventType: "INSPECTED_TIRE",
    componentTypePriority: ["FRONT_TIRE", "REAR_TIRE"],
  },
  "brake-inspect": {
    eventType: "INSPECTED_BRAKE_PADS",
    componentTypePriority: ["FRONT_BRAKE_PAD", "REAR_BRAKE_PAD"],
  },
  "di2-charge": {
    eventType: "CHARGED_DI2",
    componentTypePriority: ["DI2_BATTERY"],
  },
  "tire-pressure-check": {
    eventType: "CHECKED_TIRE_PRESSURE",
    componentTypePriority: [],
  },
  "lights-charge": {
    eventType: "OTHER",
    componentTypePriority: [],
    noteTag: LIGHTS_CHARGE_NOTE_TAG,
  },
};

export function isSupportedDueActionKey(value: string): value is SupportedDueActionKey {
  return value in MAINTENANCE_DUE_ACTIONS;
}

export function getDueActionConfig(value: string) {
  if (!isSupportedDueActionKey(value)) {
    return undefined;
  }

  return MAINTENANCE_DUE_ACTIONS[value];
}
