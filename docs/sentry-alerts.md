# Sentry Alert Rules Runbook

How BikeLog is wired into Sentry, and the exact alert rules to create in the
Sentry dashboard. Alert rules live in the Sentry UI (they are not stored in this
repo), so this doc is the source of truth for what should exist.

## How errors reach Sentry

Sentry is initialized in [`instrumentation.ts`](../instrumentation.ts) and
[`instrumentation-client.ts`](../instrumentation-client.ts), gated on the
`SENTRY_DSN` env var. If `SENTRY_DSN` is unset (e.g. local dev), nothing is sent.

- **Environment tag**: `SENTRY_ENVIRONMENT` → falls back to `VERCEL_ENV` →
  `development`. In practice events are tagged `production`, `preview`
  (stage/preview deploys), or `development`.
- **Traces sample rate**: `0.1` (10% of transactions) in both node and edge
  runtimes.
- **Client tunnel**: requests are proxied through `/monitoring`
  (`tunnelRoute` in [`next.config.ts`](../next.config.ts)) to dodge ad blockers.

Capture points:

| Source | Mechanism | Where |
| --- | --- | --- |
| API route errors | `Sentry.captureRequestError` (`onRequestError`) | [`instrumentation.ts`](../instrumentation.ts) |
| Server component / SSR errors | `app/error.tsx`, `app/global-error.tsx` | error boundaries |
| Daily notification cron | `Sentry.captureException(error)` | [`app/api/cron/notifications/daily/route.ts`](../app/api/cron/notifications/daily/route.ts) |
| Strava sync cron | `Sentry.captureException(error)` | [`app/api/cron/strava/sync/route.ts`](../app/api/cron/strava/sync/route.ts) |

> Note: the cron endpoints only `captureException` when the whole dispatch
> throws. Per-user sync failures are caught internally and tracked in the DB
> (`consecutiveSyncFailures` / `lastSyncError`) — they do **not** raise a Sentry
> event. The user-facing reconnect banner covers that case. So a Sentry alert on
> the Strava cron means the *entire* run failed, which is the right thing to page
> on.

## Alerts to create

Create these in **Sentry → Alerts → Create Alert**. Scope every rule to
`environment: production` unless noted, so stage noise does not page you.

### 1. New issue in production (catch-all)

- **Type**: Issues alert
- **Conditions**: *A new issue is created*
- **Filters**: `environment` equals `production`
- **Action**: Email (notify the on-call address)
- **Why**: First line of defense — any never-before-seen error in prod emails you
  once. Low volume because it only fires on *new* issue fingerprints.

### 2. Error spike in production

- **Type**: Metric alert → *Number of errors*
- **Query**: `event.type:error`, `environment:production`
- **Threshold**: more than **20 events in 1 hour** (tune after observing
  baseline — start conservative, tighten later)
- **Action**: Email
- **Why**: Catches a regression that is throwing repeatedly even if the issue
  fingerprint already existed (so rule #1 stays quiet).

### 3. Cron / background-job failure

- **Type**: Issues alert
- **Conditions**: *An issue is seen more than 1 time in 1 hour*
- **Filters**:
  - `environment` equals `production`
  - `transaction` contains `/api/cron/` *(matches both `/api/cron/strava/sync`
    and `/api/cron/notifications/daily`)*
- **Action**: Email
- **Why**: A cron dispatch throwing means an entire sync/notification run was
  lost. This is the highest-signal alert — these jobs run unattended.

> The GitHub Actions cron workflows
> ([`strava-sync.yml`](../.github/workflows/strava-sync.yml),
> [`notifications-hourly.yml`](../.github/workflows/notifications-hourly.yml),
> [`strava-retry.yml`](../.github/workflows/strava-retry.yml)) already fail the
> job and email on any non-2xx response from the endpoint. Sentry rule #3 is the
> *server-side* complement — it gives you the stack trace, not just the HTTP
> status. Keep both.

### 4. (Optional) Crash-free session drop

- **Type**: Metric alert → *Crash free session rate*
- **Threshold**: below **99%** over 1 hour, `environment:production`
- **Action**: Email
- **Why**: Surfaces client-side breakage that users hit but never report. Only
  meaningful once you have steady traffic — skip until post-launch.

## Verifying capture works

Before trusting the alerts, confirm events actually arrive:

1. Confirm `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`
   are set in the production Vercel environment.
2. Trigger a deliberate test error (e.g. a throwaway route that throws, or hit a
   cron endpoint with a bad `CRON_SECRET` is **not** enough — that returns 401
   without throwing). Easiest: temporarily throw inside a cron handler on a
   preview deploy and confirm the event lands tagged `preview`.
3. Check **Sentry → Issues**, filter by environment, confirm the event and its
   `transaction` tag match what rule #3 filters on.
4. Remove the test error.

## Maintenance

- Re-tune thresholds (#2, #3) after the first few weeks of real traffic.
- When adding a new cron route, make sure it wraps its handler in
  `try/catch` + `Sentry.captureException` so rule #3 keeps covering it (the
  `transaction` filter already matches anything under `/api/cron/`).
