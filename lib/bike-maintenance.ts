import {
  MaintenanceEventType,
  type Component,
  type MaintenanceEvent,
  type Ride,
} from "@prisma/client";

import { LIGHTS_CHARGE_NOTE_TAG } from "@/lib/maintenance-actions";
import { buildMaintenanceSummary } from "@/lib/maintenance";
import { calculateReadinessBreakdown, getReadinessLabel } from "@/lib/readiness";

type MaintenanceEventInput = Pick<
  MaintenanceEvent,
  "type" | "date" | "mileageAtService" | "notes"
>;

type ComputeBikeMaintenanceInput = {
  rides: Pick<Ride, "distanceMiles" | "durationMinutes" | "date" | "wasWet" | "roadCondition">[];
  components: Pick<Component, "type" | "currentMileage">[];
  maintenanceEvents: MaintenanceEventInput[];
};

function latestEventByTypes(
  events: MaintenanceEventInput[],
  types: MaintenanceEventType[],
) {
  return [...events]
    .filter((event) => types.includes(event.type))
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
}

function latestEventByPredicate(
  events: MaintenanceEventInput[],
  predicate: (event: MaintenanceEventInput) => boolean,
) {
  return [...events]
    .filter(predicate)
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

function getEstimatedRideMinutes(
  ride: Pick<Ride, "distanceMiles" | "durationMinutes">,
) {
  if (typeof ride.durationMinutes === "number" && ride.durationMinutes > 0) {
    return ride.durationMinutes;
  }

  return Math.round(ride.distanceMiles * 3.5);
}

function getRideMinutesSince(
  rides: Pick<Ride, "distanceMiles" | "durationMinutes" | "date">[],
  eventDate: Date,
) {
  return rides
    .filter((ride) => ride.date.getTime() > eventDate.getTime())
    .reduce((sum, ride) => sum + getEstimatedRideMinutes(ride), 0);
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
  const mostRecentRoughRide = [...input.rides]
    .filter((ride) => ride.roadCondition === "Rough" || ride.roadCondition === "Very Rough")
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

  const lastLightsChargeEvent = latestEventByPredicate(
    input.maintenanceEvents,
    (event) =>
      event.type === MaintenanceEventType.OTHER &&
      Boolean(event.notes?.includes(LIGHTS_CHARGE_NOTE_TAG)),
  );

  const mostRecentBatteryChargeDate = [lastDi2ChargeEvent?.date, lastLightsChargeEvent?.date]
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const lastPressureCheckEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.CHECKED_TIRE_PRESSURE,
  ]);
  const lastBoltCheckEvent = latestEventByTypes(input.maintenanceEvents, [
    MaintenanceEventType.CHECKED_BOLTS,
  ]);

  const chainCleanedAfterWetRide = mostRecentWetRide
    ? Boolean(lastChainLubeEvent && lastChainLubeEvent.date >= mostRecentWetRide.date)
    : true;
  const roughRideInspectedAfterRide = mostRecentRoughRide
    ? Boolean(
        (lastTireInspectEvent && lastTireInspectEvent.date >= mostRecentRoughRide.date) ||
          (lastBoltCheckEvent && lastBoltCheckEvent.date >= mostRecentRoughRide.date),
      )
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
    lastPressureCheckDate: lastPressureCheckEvent?.date,
    lastDi2ChargeDate: lastDi2ChargeEvent?.date,
    mostRecentRideDate: mostRecentRide?.date,
    rideMinutesSinceDi2Charge: lastDi2ChargeEvent
      ? getRideMinutesSince(input.rides, lastDi2ChargeEvent.date)
      : undefined,
    rideMinutesSinceLightsCharge: mostRecentBatteryChargeDate
      ? getRideMinutesSince(input.rides, mostRecentBatteryChargeDate)
      : undefined,
    hasRecentWetRide: Boolean(mostRecentRide?.wasWet),
    hasRecentRoughRide:
      mostRecentRide?.roadCondition === "Rough" ||
      mostRecentRide?.roadCondition === "Very Rough",
    chainServicedAfterWetRide: chainCleanedAfterWetRide,
    roughRideInspectedAfterRide,
  });

  const di2StatusKnown = Boolean(lastDi2ChargeEvent);

  const readiness = calculateReadinessBreakdown({
    statuses: maintenanceSummary.dueItems.map((item) => item.status),
    hasRecentWetRide: Boolean(mostRecentRide?.wasWet),
    chainCleanedAfterWetRide,
    di2StatusKnown,
  });

  return {
    bikeMileage,
    mostRecentRide,
    mostRecentWetRide,
    mostRecentRoughRide,
    lastPressureCheckEvent,
    chainCleanedAfterWetRide,
    roughRideInspectedAfterRide,
    tirePressureCheckedRecently,
    di2StatusKnown,
    maintenanceSummary,
    readiness: {
      score: readiness.score,
      label: getReadinessLabel(readiness.score),
      reasons: readiness.deductions.map(
        (deduction) => `${deduction.reason} (-${deduction.points})`,
      ),
    },
  };
}
