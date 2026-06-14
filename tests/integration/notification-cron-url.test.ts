import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const scriptPath = resolve(".github/scripts/normalize-notifications-cron-url.sh");
const stravaSyncScriptPath = resolve(".github/scripts/normalize-strava-sync-cron-url.sh");

function normalizeUrl(rawUrl: string) {
  return execFileSync(scriptPath, ["TEST_NOTIFICATIONS_CRON_URL", rawUrl], {
    encoding: "utf8",
  }).trim();
}

test("notification cron URL normalizer accepts a valid dispatch URL", () => {
  assert.equal(
    normalizeUrl("https://example.com/api/cron/notifications/daily"),
    "https://example.com/api/cron/notifications/daily",
  );
});

test("notification cron URL normalizer strips whitespace and trailing slash", () => {
  assert.equal(
    normalizeUrl(" https ://stage.example.com/api/cron/notifications/daily/ \n"),
    "https://stage.example.com/api/cron/notifications/daily",
  );
});

test("notification cron URL normalizer rejects incomplete URLs before curl runs", () => {
  const result = spawnSync(scriptPath, [
    "TEST_NOTIFICATIONS_CRON_URL",
    "https",
  ], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /TEST_NOTIFICATIONS_CRON_URL must be a full HTTPS URL ending in \/api\/cron\/notifications\/daily\./,
  );
});

test("notification cron URL normalizer rejects non-HTTPS URLs", () => {
  const result = spawnSync(scriptPath, [
    "TEST_NOTIFICATIONS_CRON_URL",
    "http://example.com/api/cron/notifications/daily",
  ], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
});

function normalizeStravaSyncUrl(rawUrl: string) {
  return execFileSync(stravaSyncScriptPath, ["TEST_STRAVA_SYNC_CRON_URL", rawUrl], {
    encoding: "utf8",
  }).trim();
}

test("Strava sync cron URL normalizer accepts a valid sync URL", () => {
  assert.equal(
    normalizeStravaSyncUrl("https://example.com/api/cron/strava/sync"),
    "https://example.com/api/cron/strava/sync",
  );
});

test("Strava sync cron URL normalizer strips whitespace and trailing slash", () => {
  assert.equal(
    normalizeStravaSyncUrl(" https ://stage.example.com/api/cron/strava/sync/ \n"),
    "https://stage.example.com/api/cron/strava/sync",
  );
});

test("Strava sync cron URL normalizer rejects notification cron URLs", () => {
  const result = spawnSync(stravaSyncScriptPath, [
    "TEST_STRAVA_SYNC_CRON_URL",
    "https://example.com/api/cron/notifications/daily",
  ], {
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /TEST_STRAVA_SYNC_CRON_URL must be a full HTTPS URL ending in \/api\/cron\/strava\/sync\./,
  );
});
