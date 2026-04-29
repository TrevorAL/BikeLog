import type { MaintenanceStatus } from "@/lib/constants";
import { MAINTENANCE_INTERVALS } from "@/lib/constants";
import type { SupportedDueActionKey } from "@/lib/maintenance-actions";

export type DueItem = {
  key: string;
  label: string;
  status: MaintenanceStatus;
  detail: string;
};

export type ConditionSuggestion = {
  key: "recent-wet-ride" | "recent-rough-ride";
  label: string;
  dueActionKey: SupportedDueActionKey;
};

export function getMileageStatus(
  milesSinceService: number,
  intervalMiles: number,
  warningMilesBefore: number,
): MaintenanceStatus {
  const milesRemaining = intervalMiles - milesSinceService;

  if (milesRemaining < 0) return "OVERDUE";
  if (milesRemaining === 0) return "DUE_NOW";
  if (milesRemaining <= warningMilesBefore) return "DUE_SOON";
  return "GOOD";
}

export function getDayStatus(
  daysSinceService: number,
  intervalDays: number,
  warningDaysBefore: number,
): MaintenanceStatus {
  const daysRemaining = intervalDays - daysSinceService;

  if (daysRemaining < 0) return "OVERDUE";
  if (daysRemaining === 0) return "DUE_NOW";
  if (daysRemaining <= warningDaysBefore) return "DUE_SOON";
  return "GOOD";
}

export function getRideMinutesStatus(
  minutesSinceService: number,
  intervalMinutes: number,
  warningMinutesBefore: number,
): MaintenanceStatus {
  const minutesRemaining = intervalMinutes - minutesSinceService;

  if (minutesRemaining < 0) return "OVERDUE";
  if (minutesRemaining === 0) return "DUE_NOW";
  if (minutesRemaining <= warningMinutesBefore) return "DUE_SOON";
  return "GOOD";
}

type BuildMaintenanceInput = {
  bikeMileage: number;
  chainMileage?: number;
  lastChainLubeMileage?: number;
  lastChainWearMileage?: number;
  lastTireInspectMileage?: number;
  lastBrakeInspectMileage?: number;
  lastCleatInspectMileage?: number;
  lastBarTapeInspectMileage?: number;
  lastCassetteInspectMileage?: number;
  lastRotorInspectMileage?: number;
  lastPressureCheckDate?: Date;
  lastDi2ChargeDate?: Date;
  mostRecentRideDate?: Date;
  rideMinutesSinceDi2Charge?: number;
  rideMinutesSinceLightsCharge?: number;
  hasRecentWetRide?: boolean;
  hasRecentRoughRide?: boolean;
  chainServicedAfterWetRide?: boolean;
  roughRideInspectedAfterRide?: boolean;
};

function formatMileageDetail(intervalMiles: number, milesSinceService: number) {
  const milesRemaining = intervalMiles - milesSinceService;
  if (milesRemaining < 0) {
    return `${Math.abs(Math.round(milesRemaining))} miles overdue`;
  }

  if (milesRemaining === 0) {
    return "Due now";
  }

  return `${Math.round(milesRemaining)} miles remaining`;
}

function formatDayDetail(intervalDays: number, daysSinceService: number) {
  const daysRemaining = intervalDays - daysSinceService;
  if (daysRemaining < 0) {
    return `${Math.abs(Math.round(daysRemaining))} days overdue`;
  }

  if (daysRemaining === 0) {
    return "Due now";
  }

  return `${Math.round(daysRemaining)} days remaining`;
}

function formatRideMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours <= 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

function formatRideTimeDetail(intervalMinutes: number, minutesSinceService: number) {
  const minutesRemaining = intervalMinutes - minutesSinceService;
  if (minutesRemaining < 0) {
    return `${formatRideMinutes(Math.abs(minutesRemaining))} overdue`;
  }

  if (minutesRemaining === 0) {
    return "Due now";
  }

  return `${formatRideMinutes(minutesRemaining)} remaining`;
}

export function buildMaintenanceSummary(input: BuildMaintenanceInput) {
  const dueItems: DueItem[] = [];
  const chainMileage = input.chainMileage ?? input.bikeMileage;

  const chainLubeMiles = chainMileage - (input.lastChainLubeMileage ?? 0);
  const chainLubeStatus = getMileageStatus(
    chainLubeMiles,
    MAINTENANCE_INTERVALS.chainLube.intervalMiles,
    MAINTENANCE_INTERVALS.chainLube.warningMilesBefore,
  );

  dueItems.push({
    key: "chain-lube",
    label: "Chain lube",
    status: chainLubeStatus,
    detail: formatMileageDetail(MAINTENANCE_INTERVALS.chainLube.intervalMiles, chainLubeMiles),
  });

  const chainWearMiles = chainMileage - (input.lastChainWearMileage ?? 0);
  dueItems.push({
    key: "chain-wear",
    label: "Chain wear check",
    status: getMileageStatus(
      chainWearMiles,
      MAINTENANCE_INTERVALS.chainWear.intervalMiles,
      MAINTENANCE_INTERVALS.chainWear.warningMilesBefore,
    ),
    detail: formatMileageDetail(MAINTENANCE_INTERVALS.chainWear.intervalMiles, chainWearMiles),
  });

  const tireInspectMiles = input.bikeMileage - (input.lastTireInspectMileage ?? 0);
  dueItems.push({
    key: "tire-inspect",
    label: "Tire inspection",
    status: getMileageStatus(
      tireInspectMiles,
      MAINTENANCE_INTERVALS.tireInspection.intervalMiles,
      MAINTENANCE_INTERVALS.tireInspection.warningMilesBefore,
    ),
    detail: formatMileageDetail(MAINTENANCE_INTERVALS.tireInspection.intervalMiles, tireInspectMiles),
  });

  const brakeInspectMiles = input.bikeMileage - (input.lastBrakeInspectMileage ?? 0);
  dueItems.push({
    key: "brake-inspect",
    label: "Brake pad inspection",
    status: getMileageStatus(
      brakeInspectMiles,
      MAINTENANCE_INTERVALS.brakePadInspection.intervalMiles,
      MAINTENANCE_INTERVALS.brakePadInspection.warningMilesBefore,
    ),
    detail: formatMileageDetail(
      MAINTENANCE_INTERVALS.brakePadInspection.intervalMiles,
      brakeInspectMiles,
    ),
  });

  const cleatInspectMiles = input.bikeMileage - (input.lastCleatInspectMileage ?? 0);
  dueItems.push({
    key: "cleat-inspect",
    label: "Cleat inspection",
    status: getMileageStatus(
      cleatInspectMiles,
      MAINTENANCE_INTERVALS.cleatInspection.intervalMiles,
      MAINTENANCE_INTERVALS.cleatInspection.warningMilesBefore,
    ),
    detail: formatMileageDetail(MAINTENANCE_INTERVALS.cleatInspection.intervalMiles, cleatInspectMiles),
  });

  const barTapeInspectMiles = input.bikeMileage - (input.lastBarTapeInspectMileage ?? 0);
  dueItems.push({
    key: "bar-tape-inspect",
    label: "Bar tape inspection",
    status: getMileageStatus(
      barTapeInspectMiles,
      MAINTENANCE_INTERVALS.barTapeInspection.intervalMiles,
      MAINTENANCE_INTERVALS.barTapeInspection.warningMilesBefore,
    ),
    detail: formatMileageDetail(
      MAINTENANCE_INTERVALS.barTapeInspection.intervalMiles,
      barTapeInspectMiles,
    ),
  });

  const cassetteInspectMiles = input.bikeMileage - (input.lastCassetteInspectMileage ?? 0);
  dueItems.push({
    key: "cassette-inspect",
    label: "Cassette inspection",
    status: getMileageStatus(
      cassetteInspectMiles,
      MAINTENANCE_INTERVALS.cassetteInspection.intervalMiles,
      MAINTENANCE_INTERVALS.cassetteInspection.warningMilesBefore,
    ),
    detail: formatMileageDetail(
      MAINTENANCE_INTERVALS.cassetteInspection.intervalMiles,
      cassetteInspectMiles,
    ),
  });

  const rotorInspectMiles = input.bikeMileage - (input.lastRotorInspectMileage ?? 0);
  dueItems.push({
    key: "rotor-inspect",
    label: "Rotor inspection",
    status: getMileageStatus(
      rotorInspectMiles,
      MAINTENANCE_INTERVALS.rotorInspection.intervalMiles,
      MAINTENANCE_INTERVALS.rotorInspection.warningMilesBefore,
    ),
    detail: formatMileageDetail(MAINTENANCE_INTERVALS.rotorInspection.intervalMiles, rotorInspectMiles),
  });

  if (input.lastPressureCheckDate) {
    const daysSincePressureCheck = Math.floor(
      (Date.now() - input.lastPressureCheckDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const pressureStatusFromDays = getDayStatus(
      daysSincePressureCheck,
      MAINTENANCE_INTERVALS.tirePressureRefill.intervalDays,
      MAINTENANCE_INTERVALS.tirePressureRefill.warningDaysBefore,
    );
    const needsPressureRefillBeforeNextRide = Boolean(
      input.mostRecentRideDate &&
        input.lastPressureCheckDate.getTime() < input.mostRecentRideDate.getTime(),
    );

    dueItems.push({
      key: "tire-pressure-check",
      label: "Tire pressure refill",
      status: needsPressureRefillBeforeNextRide ? "DUE_NOW" : pressureStatusFromDays,
      detail: needsPressureRefillBeforeNextRide
        ? "No pressure check logged after your latest ride"
        : formatDayDetail(
            MAINTENANCE_INTERVALS.tirePressureRefill.intervalDays,
            daysSincePressureCheck,
          ),
    });
  } else {
    dueItems.push({
      key: "tire-pressure-check",
      label: "Tire pressure refill",
      status: "DUE_SOON",
      detail: "Pressure check status unknown",
    });
  }

  if (input.rideMinutesSinceDi2Charge !== undefined) {
    dueItems.push({
      key: "di2-charge",
      label: "Di2 battery",
      status: getRideMinutesStatus(
        input.rideMinutesSinceDi2Charge,
        MAINTENANCE_INTERVALS.di2ChargeRideTime.intervalMinutes,
        MAINTENANCE_INTERVALS.di2ChargeRideTime.warningMinutesBefore,
      ),
      detail: formatRideTimeDetail(
        MAINTENANCE_INTERVALS.di2ChargeRideTime.intervalMinutes,
        input.rideMinutesSinceDi2Charge,
      ),
    });
  } else {
    dueItems.push({
      key: "di2-charge",
      label: "Di2 battery",
      status: "DUE_SOON",
      detail: "Charge status unknown",
    });
  }

  if (input.rideMinutesSinceLightsCharge !== undefined) {
    dueItems.push({
      key: "lights-charge",
      label: "Bike lights battery",
      status: getRideMinutesStatus(
        input.rideMinutesSinceLightsCharge,
        MAINTENANCE_INTERVALS.lightsChargeRideTime.intervalMinutes,
        MAINTENANCE_INTERVALS.lightsChargeRideTime.warningMinutesBefore,
      ),
      detail: formatRideTimeDetail(
        MAINTENANCE_INTERVALS.lightsChargeRideTime.intervalMinutes,
        input.rideMinutesSinceLightsCharge,
      ),
    });
  } else {
    dueItems.push({
      key: "lights-charge",
      label: "Bike lights battery",
      status: "DUE_SOON",
      detail: "Charge status unknown",
    });
  }

  const suggestions: ConditionSuggestion[] = [];

  if (input.hasRecentWetRide && !input.chainServicedAfterWetRide) {
    suggestions.push({
      key: "recent-wet-ride",
      label: "Recent wet ride: clean and lube chain.",
      dueActionKey: "chain-lube",
    });
  }

  if (input.hasRecentRoughRide && !input.roughRideInspectedAfterRide) {
    suggestions.push({
      key: "recent-rough-ride",
      label: "Recent rough ride: inspect tires and wheels.",
      dueActionKey: "tire-inspect",
    });
  }

  return {
    dueItems,
    suggestions,
    dueNow: dueItems.filter((item) => item.status === "DUE_NOW" || item.status === "OVERDUE"),
    dueSoon: dueItems.filter((item) => item.status === "DUE_SOON"),
  };
}
