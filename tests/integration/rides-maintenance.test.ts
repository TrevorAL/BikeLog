import assert from "node:assert/strict";
import test from "node:test";

import { ComponentStatus, ComponentType, RideType } from "@prisma/client";

import { POST as createMaintenanceEvent } from "../../app/api/maintenance-events/route";
import { POST as createRide } from "../../app/api/rides/route";
import { prisma } from "../../lib/db";
import { getDueActionConfig } from "../../lib/maintenance-actions";

type TestBike = {
  bikeId: string;
  chainId: string;
  di2BatteryId: string;
};

async function createTestBike(scope: string): Promise<TestBike> {
  const bike = await prisma.bike.create({
    data: {
      name: `Integration Bike ${scope}`,
      brand: "Test",
      model: "Harness",
      year: 2026,
      type: "Road",
      frameMaterial: "Carbon",
      drivetrain: "Shimano 2x12",
      brakeType: "Hydraulic disc",
      wheelset: "Test wheelset",
      tireSetup: "25c",
    },
    select: {
      id: true,
    },
  });

  const chain = await prisma.component.create({
    data: {
      bikeId: bike.id,
      type: ComponentType.CHAIN,
      name: "Test Chain",
      currentMileage: 100,
      status: ComponentStatus.ACTIVE,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  const di2Battery = await prisma.component.create({
    data: {
      bikeId: bike.id,
      type: ComponentType.DI2_BATTERY,
      name: "Test Di2 Battery",
      currentMileage: 50,
      status: ComponentStatus.ACTIVE,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return {
    bikeId: bike.id,
    chainId: chain.id,
    di2BatteryId: di2Battery.id,
  };
}

async function cleanupBike(bikeId: string) {
  await prisma.$transaction([
    prisma.maintenanceEvent.deleteMany({
      where: {
        bikeId,
      },
    }),
    prisma.ride.deleteMany({
      where: {
        bikeId,
      },
    }),
    prisma.checklistItem.deleteMany({
      where: {
        bikeId,
      },
    }),
    prisma.tirePressureSetup.deleteMany({
      where: {
        bikeId,
      },
    }),
    prisma.fitMeasurement.deleteMany({
      where: {
        bikeId,
      },
    }),
    prisma.component.deleteMany({
      where: {
        bikeId,
      },
    }),
    prisma.bike.deleteMany({
      where: {
        id: bikeId,
      },
    }),
  ]);
}

test("POST /api/rides increments mileage-based components only", async (t) => {
  const scope = `${Date.now()}-ride`;
  const bike = await createTestBike(scope);

  t.after(async () => {
    await cleanupBike(bike.bikeId);
  });

  const response = await createRide(
    new Request("http://localhost/api/rides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bikeId: bike.bikeId,
        date: "2026-04-28",
        distanceMiles: 27.5,
        durationMinutes: 75,
        rideType: RideType.OUTDOOR,
        weather: "Dry",
        roadCondition: "Normal",
        wasWet: false,
      }),
    }),
  );

  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    ride?: { id: string };
    error?: string;
  };
  assert.ok(payload.ride?.id, payload.error ?? "Ride was not created.");

  const chainAfter = await prisma.component.findUnique({
    where: {
      id: bike.chainId,
    },
    select: {
      currentMileage: true,
    },
  });

  const di2After = await prisma.component.findUnique({
    where: {
      id: bike.di2BatteryId,
    },
    select: {
      currentMileage: true,
    },
  });

  assert.ok(chainAfter);
  assert.ok(di2After);
  assert.equal(chainAfter.currentMileage, 127.5);
  assert.equal(di2After.currentMileage, 50);
});

test("Mark-complete payload logs maintenance event with component mileage", async (t) => {
  const scope = `${Date.now()}-maintenance`;
  const bike = await createTestBike(scope);

  t.after(async () => {
    await cleanupBike(bike.bikeId);
  });

  const dueAction = getDueActionConfig("chain-lube");
  assert.ok(dueAction);

  const response = await createMaintenanceEvent(
    new Request("http://localhost/api/maintenance-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bikeId: bike.bikeId,
        date: "2026-04-28",
        type: dueAction.eventType,
        componentId: bike.chainId,
        mileageSource: "component",
        notes: "Marked complete from due reminder: Chain lube.",
      }),
    }),
  );

  assert.equal(response.status, 200);

  const payload = (await response.json()) as {
    maintenanceEvent?: {
      id: string;
      bikeId: string;
      componentId: string | null;
      type: string;
      mileageAtService: number | null;
      notes: string | null;
    };
    error?: string;
  };

  assert.ok(payload.maintenanceEvent, payload.error ?? "Maintenance event was not created.");
  assert.equal(payload.maintenanceEvent.bikeId, bike.bikeId);
  assert.equal(payload.maintenanceEvent.componentId, bike.chainId);
  assert.equal(payload.maintenanceEvent.type, dueAction.eventType);
  assert.equal(payload.maintenanceEvent.mileageAtService, 100);
  assert.equal(payload.maintenanceEvent.notes, "Marked complete from due reminder: Chain lube.");
});

