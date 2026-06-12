import assert from "node:assert/strict";
import test from "node:test";

import { ComponentType, MaintenanceEventType } from "@prisma/client";

import { computeBikeMaintenance } from "../../lib/bike-maintenance";
import { calculateReadinessBreakdown, getReadinessLabel } from "../../lib/readiness";

test("readiness scoring applies maintenance, Di2, and wet-ride deductions", () => {
  const readiness = calculateReadinessBreakdown({
    statuses: ["OVERDUE", "DUE_NOW", "DUE_SOON"],
    hasRecentWetRide: true,
    chainCleanedAfterWetRide: false,
    di2StatusKnown: false,
  });

  assert.equal(readiness.score, 35);
  assert.deepEqual(readiness.deductions, [
    { points: 20, reason: "1 overdue maintenance item" },
    { points: 15, reason: "1 maintenance item due now" },
    { points: 10, reason: "1 maintenance item due soon" },
    { points: 10, reason: "Shifting battery charge status is unknown" },
    { points: 10, reason: "Recent wet ride without a follow-up chain clean/lube" },
  ]);
  assert.equal(getReadinessLabel(readiness.score), "Not ready");
});

test("bike maintenance only creates battery reminders for matching bike components", () => {
  const maintenance = computeBikeMaintenance({
    rides: [
      {
        distanceMiles: 30,
        durationMinutes: 90,
        date: new Date("2026-06-01T12:00:00.000Z"),
        wasWet: false,
        roadCondition: "Smooth",
      },
    ],
    components: [
      {
        name: "Chain",
        type: ComponentType.CHAIN,
        currentMileage: 130,
      },
    ],
    maintenanceEvents: [],
  });

  const dueItemKeys = maintenance.maintenanceSummary.dueItems.map((item) => item.key);

  assert.equal(maintenance.bikeMileage, 30);
  assert.equal(
    maintenance.maintenanceSummary.dueItems.find((item) => item.key === "chain-lube")
      ?.status,
    "OVERDUE",
  );
  assert.equal(dueItemKeys.includes("di2-charge"), false);
  assert.equal(dueItemKeys.includes("lights-charge"), false);
  assert.equal(maintenance.di2StatusKnown, true);
});

test("bike maintenance flags wet and rough ride follow-ups until service is logged", () => {
  const maintenance = computeBikeMaintenance({
    rides: [
      {
        distanceMiles: 40,
        durationMinutes: 120,
        date: new Date("2026-06-10T12:00:00.000Z"),
        wasWet: true,
        roadCondition: "Very Rough",
      },
    ],
    components: [
      {
        name: "Chain",
        type: ComponentType.CHAIN,
        currentMileage: 40,
      },
    ],
    maintenanceEvents: [],
  });

  assert.equal(maintenance.chainCleanedAfterWetRide, false);
  assert.equal(maintenance.roughRideInspectedAfterRide, false);
  assert.deepEqual(
    maintenance.maintenanceSummary.suggestions.map((suggestion) => suggestion.key).sort(),
    ["recent-rough-ride", "recent-wet-ride"],
  );
  assert.match(
    maintenance.readiness.reasons.join("\n"),
    /Recent wet ride without a follow-up chain clean\/lube/,
  );
});

test("bike maintenance clears wet and rough ride follow-ups after matching service", () => {
  const rideDate = new Date("2026-06-10T12:00:00.000Z");

  const maintenance = computeBikeMaintenance({
    rides: [
      {
        distanceMiles: 40,
        durationMinutes: 120,
        date: rideDate,
        wasWet: true,
        roadCondition: "Very Rough",
      },
    ],
    components: [
      {
        name: "Chain",
        type: ComponentType.CHAIN,
        currentMileage: 40,
      },
    ],
    maintenanceEvents: [
      {
        type: MaintenanceEventType.CLEANED_CHAIN,
        date: new Date("2026-06-10T13:00:00.000Z"),
        mileageAtService: 40,
        notes: null,
      },
      {
        type: MaintenanceEventType.INSPECTED_TIRE,
        date: new Date("2026-06-10T13:05:00.000Z"),
        mileageAtService: 40,
        notes: null,
      },
    ],
  });

  assert.equal(maintenance.chainCleanedAfterWetRide, true);
  assert.equal(maintenance.roughRideInspectedAfterRide, true);
  assert.deepEqual(maintenance.maintenanceSummary.suggestions, []);
  assert.doesNotMatch(
    maintenance.readiness.reasons.join("\n"),
    /Recent wet ride without a follow-up chain clean\/lube/,
  );
});
