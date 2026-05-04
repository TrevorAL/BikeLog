import assert from "node:assert/strict";
import test from "node:test";

import { NotificationSendPolicy } from "@prisma/client";

import { getLocalClock, shouldSendNotificationNow } from "../../lib/notifications";

test("Digest policy only sends at configured local hour", () => {
  const allowed = shouldSendNotificationNow({
    sendPolicy: NotificationSendPolicy.DIGEST_DAILY,
    digestHourLocal: 9,
    quietHoursEnabled: false,
    quietHoursStartHour: 22,
    quietHoursEndHour: 7,
    sendWindowEnabled: false,
    sendWindowStartHour: 8,
    sendWindowEndHour: 21,
    localHour: 9,
  });
  const blocked = shouldSendNotificationNow({
    sendPolicy: NotificationSendPolicy.DIGEST_DAILY,
    digestHourLocal: 9,
    quietHoursEnabled: false,
    quietHoursStartHour: 22,
    quietHoursEndHour: 7,
    sendWindowEnabled: false,
    sendWindowStartHour: 8,
    sendWindowEndHour: 21,
    localHour: 10,
  });

  assert.equal(allowed, true);
  assert.equal(blocked, false);
});

test("Instant policy ignores digest hour but respects quiet hours", () => {
  const blockedAtNight = shouldSendNotificationNow({
    sendPolicy: NotificationSendPolicy.INSTANT,
    digestHourLocal: 9,
    quietHoursEnabled: true,
    quietHoursStartHour: 22,
    quietHoursEndHour: 7,
    sendWindowEnabled: false,
    sendWindowStartHour: 8,
    sendWindowEndHour: 21,
    localHour: 23,
  });
  const allowedInDay = shouldSendNotificationNow({
    sendPolicy: NotificationSendPolicy.INSTANT,
    digestHourLocal: 9,
    quietHoursEnabled: true,
    quietHoursStartHour: 22,
    quietHoursEndHour: 7,
    sendWindowEnabled: false,
    sendWindowStartHour: 8,
    sendWindowEndHour: 21,
    localHour: 12,
  });

  assert.equal(blockedAtNight, false);
  assert.equal(allowedInDay, true);
});

test("Allowed send window blocks sends outside configured hours", () => {
  const blocked = shouldSendNotificationNow({
    sendPolicy: NotificationSendPolicy.INSTANT,
    digestHourLocal: 9,
    quietHoursEnabled: false,
    quietHoursStartHour: 22,
    quietHoursEndHour: 7,
    sendWindowEnabled: true,
    sendWindowStartHour: 8,
    sendWindowEndHour: 20,
    localHour: 7,
  });
  const allowed = shouldSendNotificationNow({
    sendPolicy: NotificationSendPolicy.INSTANT,
    digestHourLocal: 9,
    quietHoursEnabled: false,
    quietHoursStartHour: 22,
    quietHoursEndHour: 7,
    sendWindowEnabled: true,
    sendWindowStartHour: 8,
    sendWindowEndHour: 20,
    localHour: 14,
  });

  assert.equal(blocked, false);
  assert.equal(allowed, true);
});

test("Local clock resolves day and hour in user timezone", () => {
  const clock = getLocalClock("America/New_York", new Date("2026-01-15T13:00:00.000Z"));
  assert.equal(clock.dayKey, "2026-01-15");
  assert.equal(clock.hour, 8);
});
