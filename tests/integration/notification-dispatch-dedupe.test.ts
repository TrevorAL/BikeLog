import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { ComponentStatus, ComponentType, NotificationChannel } from "@prisma/client";

import { prisma } from "../../lib/db";
import {
  dispatchMaintenanceNotificationsForUser,
  getNotificationBellStateForUser,
  updateNotificationPreferencesForUser,
} from "../../lib/notifications";

async function createDispatchFixture(scope: string) {
  const user = await prisma.user.create({
    data: {
      email: `notification-dedupe-${scope}@bikelog.test`,
      name: "Notification Dedupe Test User",
      timezone: "UTC",
    },
    select: {
      id: true,
    },
  });

  const bike = await prisma.bike.create({
    data: {
      userId: user.id,
      name: `Notification Dedupe Bike ${scope}`,
    },
    select: {
      id: true,
    },
  });

  await prisma.component.create({
    data: {
      bikeId: bike.id,
      type: ComponentType.CHAIN,
      name: "Dedupe Test Chain",
      currentMileage: 130,
      status: ComponentStatus.ACTIVE,
      isActive: true,
    },
  });

  await updateNotificationPreferencesForUser(user.id, {
    sendPolicy: "INSTANT",
    notificationsEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
  });

  return {
    userId: user.id,
    bikeId: bike.id,
  };
}

async function cleanupDispatchFixture(input: { userId: string; bikeId: string }) {
  await prisma.$transaction([
    prisma.maintenanceNotificationLog.deleteMany({
      where: {
        userId: input.userId,
      },
    }),
    prisma.bikeNotificationPreference.deleteMany({
      where: {
        userId: input.userId,
      },
    }),
    prisma.userNotificationPreference.deleteMany({
      where: {
        userId: input.userId,
      },
    }),
    prisma.component.deleteMany({
      where: {
        bikeId: input.bikeId,
      },
    }),
    prisma.bike.deleteMany({
      where: {
        id: input.bikeId,
      },
    }),
    prisma.user.deleteMany({
      where: {
        id: input.userId,
      },
    }),
  ]);
}

test("notification dispatch dedupes the same email channel for a bike and day", async (t) => {
  const scope = `${Date.now()}-${randomUUID()}-dedupe`;
  const fixture = await createDispatchFixture(scope);
  const previousResendApiKey = process.env.RESEND_API_KEY;
  process.env.RESEND_API_KEY = "";

  t.after(async () => {
    if (previousResendApiKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = previousResendApiKey;
    }
    await cleanupDispatchFixture(fixture);
  });

  const firstDispatch = await dispatchMaintenanceNotificationsForUser(fixture.userId);
  const secondDispatch = await dispatchMaintenanceNotificationsForUser(fixture.userId);

  assert.equal(firstDispatch.attempted, 1);
  assert.equal(firstDispatch.delivered, 0);
  assert.equal(firstDispatch.skipped, 1);
  assert.equal(firstDispatch.errors, 0);

  assert.equal(secondDispatch.attempted, 0);
  assert.equal(secondDispatch.delivered, 0);
  assert.equal(secondDispatch.skipped, 1);
  assert.equal(secondDispatch.errors, 0);

  const logs = await prisma.maintenanceNotificationLog.findMany({
    where: {
      userId: fixture.userId,
      bikeId: fixture.bikeId,
      channel: NotificationChannel.EMAIL,
    },
  });

  assert.equal(logs.length, 1);
});

test("notification bell state includes actionable maintenance links", async (t) => {
  const scope = `${Date.now()}-${randomUUID()}-bell-state`;
  const fixture = await createDispatchFixture(scope);

  t.after(async () => {
    await cleanupDispatchFixture(fixture);
  });

  const state = await getNotificationBellStateForUser(fixture.userId);

  assert.equal(state.notificationsEnabled, true);
  assert.equal(state.pendingCount, 1);
  assert.equal(state.items.length, 1);
  assert.equal(state.items[0].bikeId, fixture.bikeId);
  assert.equal(state.items[0].label, "Chain lube");
  assert.match(state.items[0].href, /^\/maintenance\?bikeId=.+&due=chain-lube#due-item-chain-lube$/);
});
