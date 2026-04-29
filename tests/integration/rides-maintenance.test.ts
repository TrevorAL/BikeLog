import assert from "node:assert/strict";
import test from "node:test";

import { ComponentStatus, ComponentType, RideType } from "@prisma/client";

import { POST as selectBike } from "../../app/api/bikes/select/route";
import { PATCH as updateBike } from "../../app/api/bikes/[bikeId]/route";
import { POST as recalculateMileage } from "../../app/api/components/recalculate-mileage/route";
import { POST as createMaintenanceEvent } from "../../app/api/maintenance-events/route";
import { POST as createRide } from "../../app/api/rides/route";
import { SESSION_COOKIE_NAME, createSessionToken } from "../../lib/auth";
import { prisma } from "../../lib/db";
import { getDueActionConfig } from "../../lib/maintenance-actions";

type TestBike = {
  userId: string;
  authCookie: string;
  bikeId: string;
  chainId: string;
  di2BatteryId: string;
};

async function createTestBike(scope: string): Promise<TestBike> {
  const userEmail = `integration-${scope}@bikelog.test`;
  const user = await prisma.user.create({
    data: {
      email: userEmail,
      name: "Integration Test User",
    },
    select: {
      id: true,
      email: true,
    },
  });

  const sessionToken = createSessionToken({
    userId: user.id,
    email: userEmail,
  });
  const authCookie = `${SESSION_COOKIE_NAME}=${encodeURIComponent(sessionToken)}`;

  const bike = await prisma.bike.create({
    data: {
      userId: user.id,
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
      initialMileage: 100,
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
      initialMileage: 50,
      currentMileage: 50,
      status: ComponentStatus.ACTIVE,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  return {
    userId: user.id,
    authCookie,
    bikeId: bike.id,
    chainId: chain.id,
    di2BatteryId: di2Battery.id,
  };
}

async function cleanupBike(bikeId: string, userId: string) {
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
    prisma.user.deleteMany({
      where: {
        id: userId,
      },
    }),
  ]);
}

test("POST /api/rides increments mileage-based components only", async (t) => {
  const scope = `${Date.now()}-ride`;
  const bike = await createTestBike(scope);

  t.after(async () => {
    await cleanupBike(bike.bikeId, bike.userId);
  });

  const response = await createRide(
    new Request("http://localhost/api/rides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
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

  assert.ok(response);
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

test("POST /api/bikes/select updates selected bike used by ride creation fallback", async (t) => {
  const scope = `${Date.now()}-bike-select`;
  const bike = await createTestBike(scope);

  const secondBike = await prisma.bike.create({
    data: {
      userId: bike.userId,
      name: `Integration Bike ${scope} second`,
      brand: "Test",
      model: "Second",
      year: 2026,
      type: "Road",
      frameMaterial: "Carbon",
      drivetrain: "Shimano 2x12",
      brakeType: "Hydraulic disc",
      wheelset: "Test wheelset",
      tireSetup: "28c",
    },
    select: {
      id: true,
    },
  });

  t.after(async () => {
    await cleanupBike(secondBike.id, bike.userId);
    await cleanupBike(bike.bikeId, bike.userId);
  });

  const selectResponse = await selectBike(
    new Request("http://localhost/api/bikes/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        bikeId: secondBike.id,
      }),
    }),
  );

  assert.ok(selectResponse);
  assert.equal(selectResponse.status, 200);

  const fallbackRideResponse = await createRide(
    new Request("http://localhost/api/rides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        date: "2026-04-28",
        distanceMiles: 10,
        durationMinutes: 30,
        rideType: RideType.OUTDOOR,
      }),
    }),
  );

  assert.ok(fallbackRideResponse);
  assert.equal(fallbackRideResponse.status, 200);

  const ridePayload = (await fallbackRideResponse.json()) as {
    ride?: { bikeId: string };
    error?: string;
  };
  assert.ok(ridePayload.ride, ridePayload.error ?? "Ride was not created.");
  assert.equal(ridePayload.ride.bikeId, secondBike.id);
});

test("Archiving selected bike falls back to first active bike", async (t) => {
  const scope = `${Date.now()}-archive-fallback`;
  const bike = await createTestBike(scope);

  const secondBike = await prisma.bike.create({
    data: {
      userId: bike.userId,
      name: `Integration Bike ${scope} second`,
      brand: "Test",
      model: "Second",
      year: 2026,
      type: "Road",
      frameMaterial: "Carbon",
      drivetrain: "Shimano 2x12",
      brakeType: "Hydraulic disc",
      wheelset: "Test wheelset",
      tireSetup: "28c",
    },
    select: {
      id: true,
    },
  });

  t.after(async () => {
    await cleanupBike(secondBike.id, bike.userId);
    await cleanupBike(bike.bikeId, bike.userId);
  });

  const selectResponse = await selectBike(
    new Request("http://localhost/api/bikes/select", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        bikeId: secondBike.id,
      }),
    }),
  );
  assert.ok(selectResponse);
  assert.equal(selectResponse.status, 200);

  const archiveResponse = await updateBike(
    new Request(`http://localhost/api/bikes/${secondBike.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        isArchived: true,
      }),
    }),
    {
      params: Promise.resolve({
        bikeId: secondBike.id,
      }),
    },
  );
  assert.ok(archiveResponse);
  assert.equal(archiveResponse.status, 200);

  const fallbackRideResponse = await createRide(
    new Request("http://localhost/api/rides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        date: "2026-04-28",
        distanceMiles: 8,
        durationMinutes: 24,
        rideType: RideType.OUTDOOR,
      }),
    }),
  );
  assert.ok(fallbackRideResponse);

  assert.equal(fallbackRideResponse.status, 200);

  const ridePayload = (await fallbackRideResponse.json()) as {
    ride?: { bikeId: string };
    error?: string;
  };

  assert.ok(ridePayload.ride, ridePayload.error ?? "Ride was not created.");
  assert.equal(ridePayload.ride.bikeId, bike.bikeId);
});

test("Mark-complete payload logs maintenance event with component mileage", async (t) => {
  const scope = `${Date.now()}-maintenance`;
  const bike = await createTestBike(scope);

  t.after(async () => {
    await cleanupBike(bike.bikeId, bike.userId);
  });

  const dueAction = getDueActionConfig("chain-lube");
  assert.ok(dueAction);

  const response = await createMaintenanceEvent(
    new Request("http://localhost/api/maintenance-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
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

  assert.ok(response);
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

test("Mileage recalculation dry-run previews drift, apply updates component and logs audit", async (t) => {
  const scope = `${Date.now()}-recalc`;
  const bike = await createTestBike(scope);

  t.after(async () => {
    await cleanupBike(bike.bikeId, bike.userId);
  });

  await prisma.ride.createMany({
    data: [
      {
        bikeId: bike.bikeId,
        date: new Date("2026-04-20"),
        distanceMiles: 12.4,
        rideType: RideType.OUTDOOR,
        wasWet: false,
      },
      {
        bikeId: bike.bikeId,
        date: new Date("2026-04-22"),
        distanceMiles: 8.1,
        rideType: RideType.TRAINING,
        wasWet: false,
      },
    ],
  });

  const dryRunResponse = await recalculateMileage(
    new Request("http://localhost/api/components/recalculate-mileage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        bikeId: bike.bikeId,
        apply: false,
      }),
    }),
  );

  assert.ok(dryRunResponse);
  assert.equal(dryRunResponse.status, 200);
  const dryRunPayload = (await dryRunResponse.json()) as {
    result?: {
      apply: boolean;
      changedComponentCount: number;
      items: Array<{
        componentId: string;
        componentType: string;
        currentMileage: number;
        expectedMileage: number;
        deltaMileage: number;
        willChange: boolean;
      }>;
      auditEventId?: string;
    };
    error?: string;
  };

  assert.ok(dryRunPayload.result, dryRunPayload.error ?? "Dry-run result missing.");
  assert.equal(dryRunPayload.result.apply, false);
  assert.equal(dryRunPayload.result.auditEventId, undefined);
  assert.equal(dryRunPayload.result.changedComponentCount, 1);

  const chainDriftItem = dryRunPayload.result.items.find(
    (item) => item.componentId === bike.chainId,
  );
  assert.ok(chainDriftItem);
  assert.equal(chainDriftItem.componentType, "CHAIN");
  assert.equal(chainDriftItem.currentMileage, 100);
  assert.equal(chainDriftItem.expectedMileage, 120.5);
  assert.equal(chainDriftItem.deltaMileage, 20.5);
  assert.equal(chainDriftItem.willChange, true);

  const chainAfterDryRun = await prisma.component.findUnique({
    where: {
      id: bike.chainId,
    },
    select: {
      currentMileage: true,
    },
  });
  assert.ok(chainAfterDryRun);
  assert.equal(chainAfterDryRun.currentMileage, 100);

  const applyResponse = await recalculateMileage(
    new Request("http://localhost/api/components/recalculate-mileage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: bike.authCookie,
      },
      body: JSON.stringify({
        bikeId: bike.bikeId,
        apply: true,
      }),
    }),
  );

  assert.ok(applyResponse);
  assert.equal(applyResponse.status, 200);
  const applyPayload = (await applyResponse.json()) as {
    result?: {
      apply: boolean;
      changedComponentCount: number;
      auditEventId?: string;
    };
    error?: string;
  };
  assert.ok(applyPayload.result, applyPayload.error ?? "Apply result missing.");
  assert.equal(applyPayload.result.apply, true);
  assert.equal(applyPayload.result.changedComponentCount, 1);
  assert.ok(applyPayload.result.auditEventId);

  const chainAfterApply = await prisma.component.findUnique({
    where: {
      id: bike.chainId,
    },
    select: {
      currentMileage: true,
    },
  });
  assert.ok(chainAfterApply);
  assert.equal(chainAfterApply.currentMileage, 120.5);

  const auditEvent = await prisma.maintenanceEvent.findUnique({
    where: {
      id: applyPayload.result.auditEventId!,
    },
    select: {
      type: true,
      notes: true,
      bikeId: true,
    },
  });
  assert.ok(auditEvent);
  assert.equal(auditEvent.type, "OTHER");
  assert.equal(auditEvent.bikeId, bike.bikeId);
  assert.ok(auditEvent.notes?.includes("Mileage recalculation applied from rides."));
});
