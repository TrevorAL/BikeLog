import assert from "node:assert/strict";
import test from "node:test";

import { StravaSyncStatus } from "@prisma/client";

import { prisma } from "../../lib/db";
import {
  dispatchStravaSyncForConnectedUsers,
  getStravaRetryAfter,
  recordFailedSync,
  recordSuccessfulSync,
  shouldSkipStravaSyncForRetryBackoff,
} from "../../lib/strava-auto-sync";

test("Strava sync retry backoff increases and caps", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  assert.equal(
    getStravaRetryAfter({ failureCount: 1, now }).toISOString(),
    "2026-06-14T12:15:00.000Z",
  );
  assert.equal(
    getStravaRetryAfter({ failureCount: 3, now }).toISOString(),
    "2026-06-14T13:00:00.000Z",
  );
  assert.equal(
    getStravaRetryAfter({ failureCount: 99, now }).toISOString(),
    "2026-06-15T00:00:00.000Z",
  );
});

test("Strava sync retry skip respects retryAfter", () => {
  const now = new Date("2026-06-14T12:00:00.000Z");

  assert.equal(
    shouldSkipStravaSyncForRetryBackoff({
      retryAfter: new Date("2026-06-14T12:15:00.000Z"),
      now,
    }),
    true,
  );
  assert.equal(
    shouldSkipStravaSyncForRetryBackoff({
      retryAfter: new Date("2026-06-14T11:59:00.000Z"),
      now,
    }),
    false,
  );
  assert.equal(
    shouldSkipStravaSyncForRetryBackoff({
      retryAfter: null,
      now,
    }),
    false,
  );
});

type TestConnection = {
  userId: string;
};

async function createConnection(
  scope: string,
  overrides: {
    lastSyncStatus?: StravaSyncStatus;
    consecutiveSyncFailures?: number;
    syncRetryAfter?: Date | null;
    expiresAt?: Date;
  } = {},
): Promise<TestConnection> {
  const user = await prisma.user.create({
    data: {
      email: `strava-retry-${scope}@bikelog.test`,
      name: "Strava Retry Test User",
    },
    select: {
      id: true,
    },
  });

  // BigInt athlete id must be unique; derive a collision-resistant value.
  const stravaAthleteId = BigInt(Date.now()) * 1000n + BigInt(Math.floor(Math.random() * 1000));

  await prisma.stravaConnection.create({
    data: {
      userId: user.id,
      stravaAthleteId,
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      scope: "read,activity:read_all",
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastSyncStatus: overrides.lastSyncStatus ?? StravaSyncStatus.CONNECTED,
      consecutiveSyncFailures: overrides.consecutiveSyncFailures ?? 0,
      syncRetryAfter: overrides.syncRetryAfter ?? null,
    },
  });

  return { userId: user.id };
}

async function cleanupConnection(userId: string) {
  await prisma.$transaction([
    prisma.stravaConnection.deleteMany({ where: { userId } }),
    prisma.user.deleteMany({ where: { id: userId } }),
  ]);
}

test("recordFailedSync increments failures and sets retry backoff", async (t) => {
  const scope = `${Date.now()}-fail-once`;
  const connection = await createConnection(scope);

  t.after(async () => {
    await cleanupConnection(connection.userId);
  });

  const before = Date.now();
  await recordFailedSync({
    userId: connection.userId,
    importedCount: 0,
    error: "Strava API returned 500.",
  });

  const updated = await prisma.stravaConnection.findUnique({
    where: { userId: connection.userId },
    select: {
      consecutiveSyncFailures: true,
      syncRetryAfter: true,
      lastSyncStatus: true,
      lastSyncError: true,
    },
  });

  assert.ok(updated);
  assert.equal(updated.consecutiveSyncFailures, 1);
  assert.equal(updated.lastSyncStatus, StravaSyncStatus.ERROR);
  assert.equal(updated.lastSyncError, "Strava API returned 500.");
  assert.ok(updated.syncRetryAfter);
  // First failure backs off 15 minutes; allow generous slack for test runtime.
  const backoffMs = updated.syncRetryAfter.getTime() - before;
  assert.ok(backoffMs > 14 * 60 * 1000, `backoff too short: ${backoffMs}ms`);
  assert.ok(backoffMs < 16 * 60 * 1000, `backoff too long: ${backoffMs}ms`);
});

test("recordFailedSync escalates across consecutive failures", async (t) => {
  const scope = `${Date.now()}-fail-escalate`;
  const connection = await createConnection(scope);

  t.after(async () => {
    await cleanupConnection(connection.userId);
  });

  for (let i = 0; i < 3; i += 1) {
    await recordFailedSync({
      userId: connection.userId,
      importedCount: 0,
      error: `Failure ${i + 1}.`,
    });
  }

  const updated = await prisma.stravaConnection.findUnique({
    where: { userId: connection.userId },
    select: {
      consecutiveSyncFailures: true,
      lastSyncStatus: true,
      lastSyncError: true,
    },
  });

  assert.ok(updated);
  assert.equal(updated.consecutiveSyncFailures, 3);
  assert.equal(updated.lastSyncStatus, StravaSyncStatus.ERROR);
  assert.equal(updated.lastSyncError, "Failure 3.");
});

test("recordSuccessfulSync clears failure state after recovery", async (t) => {
  const scope = `${Date.now()}-recover`;
  const connection = await createConnection(scope, {
    lastSyncStatus: StravaSyncStatus.ERROR,
    consecutiveSyncFailures: 4,
    syncRetryAfter: new Date(Date.now() + 60 * 60 * 1000),
  });

  t.after(async () => {
    await cleanupConnection(connection.userId);
  });

  await recordSuccessfulSync({
    userId: connection.userId,
    importedCount: 5,
    status: StravaSyncStatus.SUCCESS,
  });

  const updated = await prisma.stravaConnection.findUnique({
    where: { userId: connection.userId },
    select: {
      consecutiveSyncFailures: true,
      syncRetryAfter: true,
      lastSyncStatus: true,
      lastSyncError: true,
      lastSyncImportedCount: true,
    },
  });

  assert.ok(updated);
  assert.equal(updated.consecutiveSyncFailures, 0);
  assert.equal(updated.syncRetryAfter, null);
  assert.equal(updated.lastSyncStatus, StravaSyncStatus.SUCCESS);
  assert.equal(updated.lastSyncError, null);
  assert.equal(updated.lastSyncImportedCount, 5);
});

test("dispatch retryOnly skips connections not in ERROR state", async (t) => {
  const scope = `${Date.now()}-retryonly-skip`;
  const connection = await createConnection(scope, {
    lastSyncStatus: StravaSyncStatus.SUCCESS,
  });

  t.after(async () => {
    await cleanupConnection(connection.userId);
  });

  const summary = await dispatchStravaSyncForConnectedUsers({ retryOnly: true });

  // A SUCCESS connection is skipped before any network call, so it never syncs
  // and produces no result entry.
  const result = summary.results.find((entry) => entry.userId === connection.userId);
  assert.equal(result, undefined);
});

test("dispatch defers connections still within retry backoff window", async (t) => {
  const scope = `${Date.now()}-backoff-defer`;
  const connection = await createConnection(scope, {
    lastSyncStatus: StravaSyncStatus.ERROR,
    consecutiveSyncFailures: 2,
    syncRetryAfter: new Date(Date.now() + 60 * 60 * 1000),
  });

  t.after(async () => {
    await cleanupConnection(connection.userId);
  });

  const summary = await dispatchStravaSyncForConnectedUsers({ retryOnly: true });

  const result = summary.results.find((entry) => entry.userId === connection.userId);
  assert.ok(result, "expected a result entry for the deferred connection");
  assert.equal(result.status, "SKIPPED");
  assert.ok(summary.usersSkippedForRetryBackoff >= 1);
});

test("dispatch flags stale-token connections", async (t) => {
  const scope = `${Date.now()}-stale-token`;
  // Token expiring within the 24h staleness buffer, but deferred via backoff so
  // the loop counts staleness without making a network call.
  const connection = await createConnection(scope, {
    lastSyncStatus: StravaSyncStatus.ERROR,
    syncRetryAfter: new Date(Date.now() + 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  t.after(async () => {
    await cleanupConnection(connection.userId);
  });

  const summary = await dispatchStravaSyncForConnectedUsers({ retryOnly: true });

  assert.ok(summary.staleTokenConnections >= 1);
});
