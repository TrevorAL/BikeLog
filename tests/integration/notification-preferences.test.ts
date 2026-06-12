import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/db";
import {
  getNotificationPreferencesForUser,
  updateNotificationPreferencesForUser,
} from "../../lib/notifications";

async function createNotificationPreferenceFixture(scope: string) {
  const user = await prisma.user.create({
    data: {
      email: `notification-pref-${scope}@bikelog.test`,
      name: "Notification Preference Test User",
    },
    select: {
      id: true,
    },
  });

  const [primaryBike, secondaryBike, unrelatedBike] = await Promise.all([
    prisma.bike.create({
      data: {
        userId: user.id,
        name: `Primary Notification Bike ${scope}`,
      },
      select: {
        id: true,
      },
    }),
    prisma.bike.create({
      data: {
        userId: user.id,
        name: `Secondary Notification Bike ${scope}`,
      },
      select: {
        id: true,
      },
    }),
    prisma.bike.create({
      data: {
        name: `Unrelated Notification Bike ${scope}`,
      },
      select: {
        id: true,
      },
    }),
  ]);

  return {
    userId: user.id,
    primaryBikeId: primaryBike.id,
    secondaryBikeId: secondaryBike.id,
    unrelatedBikeId: unrelatedBike.id,
  };
}

async function cleanupNotificationPreferenceFixture(input: {
  userId: string;
  unrelatedBikeId: string;
}) {
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
    prisma.bike.deleteMany({
      where: {
        userId: input.userId,
      },
    }),
    prisma.bike.deleteMany({
      where: {
        id: input.unrelatedBikeId,
      },
    }),
    prisma.user.deleteMany({
      where: {
        id: input.userId,
      },
    }),
  ]);
}

test("notification preferences create defaults and persist per-bike channel settings", async (t) => {
  const scope = `${Date.now()}-prefs`;
  const fixture = await createNotificationPreferenceFixture(scope);

  t.after(async () => {
    await cleanupNotificationPreferenceFixture({
      userId: fixture.userId,
      unrelatedBikeId: fixture.unrelatedBikeId,
    });
  });

  const defaults = await getNotificationPreferencesForUser(fixture.userId);
  assert.equal(defaults.notificationsEnabled, true);
  assert.equal(defaults.emailEnabled, true);
  assert.equal(defaults.smsEnabled, false);
  assert.equal(defaults.bikes.length, 2);

  for (const bikeId of [fixture.primaryBikeId, fixture.secondaryBikeId]) {
    const bikePreference = defaults.bikes.find((bike) => bike.bikeId === bikeId);
    assert.ok(bikePreference);
    assert.equal(bikePreference.enabled, true);
    assert.equal(bikePreference.emailEnabled, true);
    assert.equal(bikePreference.smsEnabled, false);
  }

  const updated = await updateNotificationPreferencesForUser(fixture.userId, {
    smsEnabled: true,
    phoneNumber: "(555) 555-0101",
    bikePreferences: [
      {
        bikeId: fixture.primaryBikeId,
        enabled: false,
        emailEnabled: false,
        smsEnabled: true,
      },
      {
        bikeId: fixture.unrelatedBikeId,
        enabled: false,
        emailEnabled: false,
        smsEnabled: true,
      },
    ],
  });

  const primary = updated.bikes.find((bike) => bike.bikeId === fixture.primaryBikeId);
  const secondary = updated.bikes.find((bike) => bike.bikeId === fixture.secondaryBikeId);

  assert.equal(updated.smsEnabled, true);
  assert.equal(updated.phoneNumber, "+15555550101");
  assert.deepEqual(primary, {
    bikeId: fixture.primaryBikeId,
    bikeLabel: `Primary Notification Bike ${scope}`,
    enabled: false,
    emailEnabled: false,
    smsEnabled: true,
  });
  assert.deepEqual(secondary, {
    bikeId: fixture.secondaryBikeId,
    bikeLabel: `Secondary Notification Bike ${scope}`,
    enabled: true,
    emailEnabled: true,
    smsEnabled: false,
  });
  assert.equal(updated.bikes.some((bike) => bike.bikeId === fixture.unrelatedBikeId), false);
});
