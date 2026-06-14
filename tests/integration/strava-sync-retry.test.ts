import assert from "node:assert/strict";
import test from "node:test";

import {
  getStravaRetryAfter,
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
