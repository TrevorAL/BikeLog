import {
  MaintenanceEventType,
  type Component,
  type MaintenanceEvent,
  type Ride,
} from "@prisma/client";

import { buildMaintenanceSummary } from "@/lib/maintenance";
import { calculateReadinessScore, getReadinessLabel } from "@/lib/readiness";

type ComputeBikeMaintenanceInput = {
  rides: Pick<Ride, "distanceMiles" | "date" | "wasWet" | "roadCondition">[];
  components: Pick<Component, "type" | "currentMileage">[];
  maintenanceEvents: Pick<MaintenanceEvent, "type" | "date" | "mileageAtService">[];
};

function latestEventByTypes(
  events: Pick<MaintenanceEvent, "type" | "date" | "mileageAtService">[],
  types: MaintenanceEventType[],
) {
  return [...events]
    .filter((event) => types.includes(event.type))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

function latestEventMileage(
  event: Pick<MaintenanceEvent, "mileageAtService"> | undefined,
  fallbackCurrentMileage: number,
) {
  if (!event) {
    return 0;
  }

  return event.mileageAtService ?? fallbackCurrentMileage;
}

export function computeBikeMaintenance(input: ComputeBikeMaintenanceInput) {
  const bikeMileage = input.rides.reduce((sum, ride) => sum + ride.distanceMiles, 0);

  const chainComponent = input.components.find((component) => component.type === "CHAIN");
  const chainMileage = chainComponent?.currentMileage ?? bikeMileage;

  const mostRecentRide = [...input.rides].sort(
    (a, b) => b.date.getTime() - a.date.getTime(),
  )[0];

  const mostRecentWetRide = [...input.rides]
    .filter((ride) => ride.wasWet)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  const lastChainLubeEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.LUBED_CHAIN,
    MaintenanceEventType.CLEANED_CHAIN,
  ]);

  const lastChainWearEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.CHECKED_CHAIN_WEAR,
  ]);

  const lastTireInspectEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.INSPECTED_TIRE,
    MaintenanceEventType.REPLACED_TIRE,
  ]);

  const lastBrakeInspectEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.INSPECTED_BRAKE_PADS,
    MaintenanceEventType.REPLACED_BRAKE_PADS,
  ]);

  const lastCleatInspectEvent = undefined;
  const lastBarTapeInspectEvent = undefined;
  const lastCassetteInspectEvent = undefined;
  const lastRotorInspectEvent = undefined;

  const lastDi2ChargeEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.CHARGED_DI2,
  ]);

  const lastPressureCheckEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.CHECKED_TIRE_PRESSURE,
  ]);

  const chainCleanedAfterWetRide = mostRecentWetRide
    ? Boolean(lastChainLubeEvent && lastChainLubeEvent.date >= mostRecentWetRide.date)
    : true;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const tirePressureCheckedRecently = Boolean(
    lastPressureCheckEvent &&
      (lastPressureCheckEvent.date >= sevenDaysAgo ||
        (mostRecentRide ? lastPressureCheckEvent.date >= mostRecentRide.date : true)),
  );

  const maintenanceSummary = buildMaintenanceSummary({
    bikeMileage,
    chainMileage,
    lastChainLubeMileage: latestEventMileage(lastChainLubeEvent, chainMileage),
    lastChainWearMileage: latestEventMileage(lastChainWearEvent, chainMileage),
    lastTireInspectMileage: latestEventMileage(lastTireInspectEvent, bikeMileage),
    lastBrakeInspectMileage: latestEventMileage(lastBrakeInspectEvent, bikeMileage),
    lastCleatInspectMileage: latestEventMileage(lastCleatInspectEvent, bikeMileage),
    lastBarTapeInspectMileage: latestEventMileage(lastBarTapeInspectEvent, bikeMileage),
    lastCassetteInspectMileage: latestEventMileage(lastCassetteInspectEvent, bikeMileage),
    lastRotorInspectMileage: latestEventMileage(lastRotorInspectEvent, bikeMileage),
    lastDi2ChargeDate: lastDi2ChargeEvent?.date,
    hasRecentWetRide: Boolean(mostRecentRide?.wasWet),
    hasRecentRoughRide:
      mostRecentRide?.roadCondition === "Rough" ||
      mostRecentRide?.roadCondition === "Very Rough",
  });

  const di2Item = maintenanceSummary.dueItems.find((item) => item.key === "di2-charge");
  const di2StatusKnown = Boolean(lastDi2ChargeEvent) && di2Item?.status !== "OVERDUE";

  const readinessScore = calculateReadinessScore({
    statuses: maintenanceSummary.dueItems.map((item) => item.status),
    hasRecentWetRide: Boolean(mostRecentRide?.wasWet),
    chainCleanedAfterWetRide,
    tirePressureCheckedRecently,
    di2StatusKnown,
  });

  return {
    bikeMileage,
    mostRecentRide,
    mostRecentWetRide,
    lastPressureCheckEvent,
    chainCleanedAfterWetRide,
    tirePressureCheckedRecently,
    di2StatusKnown,
    maintenanceSummary,
    readiness: {
      score: readinessScore,
      label: getReadinessLabel(readinessScore),
    },
  };
}
