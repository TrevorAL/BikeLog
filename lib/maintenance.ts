import type { MaintenanceStatus } from "@/lib/constants";
import { MAINTENANCE_INTERVALS } from "@/lib/constants";

export type DueItem = {
  key: string;
  label: string;
  status: MaintenanceStatus;
  detail: string;
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
  lastDi2ChargeDate?: Date;
  hasRecentWetRide?: boolean;
  hasRecentRoughRide?: boolean;
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

  if (input.lastDi2ChargeDate) {
    const daysSinceCharge = Math.floor(
      (Date.now() - input.lastDi2ChargeDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    dueItems.push({
      key: "di2-charge",
      label: "Di2 battery",
      status: getDayStatus(
        daysSinceCharge,
        MAINTENANCE_INTERVALS.di2Check.intervalDays,
        MAINTENANCE_INTERVALS.di2Check.warningDaysBefore,
      ),
      detail: formatDayDetail(MAINTENANCE_INTERVALS.di2Check.intervalDays, daysSinceCharge),
    });
  } else {
    dueItems.push({
      key: "di2-charge",
      label: "Di2 battery",
      status: "DUE_SOON",
      detail: "Charge status unknown",
    });
  }

  const suggestions: string[] = [];

  if (input.hasRecentWetRide) {
    suggestions.push("Recent wet ride: clean and lube chain.");
  }

  if (input.hasRecentRoughRide) {
    suggestions.push("Recent rough ride: inspect tires and wheels.");
  }

  return {
    dueItems,
    suggestions,
    dueNow: dueItems.filter((item) => item.status === "DUE_NOW" || item.status === "OVERDUE"),
    dueSoon: dueItems.filter((item) => item.status === "DUE_SOON"),
  };
}
