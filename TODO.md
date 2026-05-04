# BikeLog TODO

Last updated: 2026-05-03

## Priority Key

- `P0` = must-do now (foundation + reliability)
- `P1` = pre-launch hardening
- `P2` = after domain / scale-up

## P0 - Foundation and Reliability

- [ ] Security cleanup
- [ ] Rotate exposed Neon, Google, Strava, and notification provider secrets.
- [ ] Confirm only environment-scoped secrets are used (no shared values across dev/staging/prod).

- [ ] Dev / Stage / Prod separation
- [ ] Keep separate databases and env var sets for `development`, `staging`, and `production`.
- [ ] Ensure feature branches use preview/nonprod values only.
- [ ] Ensure `main` deploys use production values only.
- [ ] Document exact environment variable matrix in deployment docs.

- [x] Prisma migration safety
- [x] Use `migrate dev` only on local/dev DB.
- [x] Use `migrate deploy` only for staging/prod/shared DBs.
- [x] Avoid `db push` and `migrate reset` on shared environments.
- [x] Add drift-recovery runbook and examples (resolve/apply flow).

- [ ] GitHub rules + CI lifecycle
- [ ] Enforce PR-only merges for `staging` and `main`.
- [ ] Require checks for PRs and protected branch merges.
- [x] Keep migration workflows active for staging and production.
- [x] Keep push/PR checks for `lint`, `typecheck`, `build`, and integration tests.

- [ ] Background jobs (cron + sync)
- [ ] Keep daily maintenance notification cron enabled and monitored.
- [ ] Add scheduled Strava sync cron (hourly or every few hours).
- [ ] Add retry cron for failed Strava sync/import attempts.
- [ ] Add token health checks and stale-connection handling.
- [x] Add sync metadata in UI (last sync, imported count, error state).

- [ ] Notification timing + dedupe fixes
- [ ] Make notifications timezone-aware at send time.
- [ ] Add explicit policy for instant vs digest sends.
- [ ] Add quiet hours / allowed send window support.
- [x] Ensure dedupe prevents repeated sends for the same due item/day/channel.

- [x] Core UX follow-ups
- [x] In bike switcher, show `Add Bike` CTA when user has no bikes.
- [x] Ensure reminders only target components present on a bike (no false Di2/lights alerts).

## P1 - Launch Readiness

- [ ] Testing expansion
- [x] Baseline integration tests for rides/maintenance/mileage recalculation are in place.
- [ ] Add tests for maintenance/readiness calculations.
- [ ] Add tests for per-bike notification preferences.
- [ ] Add tests for notification timing + dedupe behavior.
- [ ] Add tests for Strava sync conflict/retry paths.
- [ ] Add a small end-to-end smoke path for login -> bike -> rides -> maintenance.

- [ ] Observability and operability
- [ ] Add error monitoring (Sentry or equivalent) for frontend/API/cron paths.
- [ ] Add alerting for cron failures and repeated sync failures.
- [ ] Add structured logging for background job outcomes.
- [ ] Add backup/restore runbook and perform one restore drill.

- [ ] Launch basics
- [ ] Add privacy policy and terms pages.
- [ ] Add support/contact path in app footer/profile.
- [ ] Add first-run onboarding for users with no bikes/components.

## P2 - After Domain and Scale-Up

- [ ] Domain + email deliverability
- [ ] Add production domain in hosting.
- [ ] Verify sender domain in Resend and replace `onboarding@resend.dev`.
- [ ] Update Google OAuth authorized origins and redirect URIs.
- [ ] Update Strava callback configuration for production domain.

- [ ] Multi-account integrations
- [ ] Add multi-Strava-account support and account-link UX.
- [ ] Update GCP OAuth setup for expanded production account flows.

- [ ] Strava sync maturity
- [ ] Add webhook-triggered sync path where available.
- [ ] Keep scheduled cron fallback as reliability backstop.
- [ ] Improve bike matching + conflict resolution UX for imports.
