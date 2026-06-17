# BikeLog TODO

Last updated: 2026-06-16

## Priority Key

- `P0` = must-do now (foundation + reliability)
- `P1` = pre-launch hardening
- `P2` = after domain / scale-up

## P0 - Foundation and Reliability

- [ ] Security cleanup
- [x] Rotate exposed Neon, Google, Strava, and notification provider secrets.
- [ ] Confirm only environment-scoped secrets are used (no shared values across dev/staging/prod).
- [x] Dev / Stage / Prod separation
- [x] Keep separate databases and env var sets for `development`, `staging`, and `production`.
- [x] Ensure feature branches use preview/nonprod values only.
  - Vercel Git deployments are disabled; release deployments are run via GitHub Actions.
- [x] Ensure `main` deploys use production values only.
- [x] Document exact environment variable matrix in deployment docs.
- [x] Set NEXT_PUBLIC_APP_URL in Vercel environment variables (production + preview).
- [x] Prisma migration safety
- [x] Use `migrate dev` only on local/dev DB.
- [x] Use `migrate deploy` only for staging/prod/shared DBs.
- [x] Avoid `db push` and `migrate reset` on shared environments.
- [x] Add drift-recovery runbook and examples (resolve/apply flow).
- [x] GitHub rules + CI lifecycle
- [x] Enforce PR-only merges for `staging` and `main`.
- [x] Require checks for PRs and protected branch merges.
- [x] Keep migration workflows active for staging and production.
- [x] Keep push/PR checks for `lint`, `typecheck`, `build`, and integration tests.
- [x] Background jobs (cron + sync)
- [x] Keep daily maintenance notification cron enabled and monitored.
- [x] Add scheduled Strava sync cron (every 3 hours via GH Actions strava-sync.yml).
- [x] Add retry cron for failed Strava sync/import attempts (hourly via strava-retry.yml with retryOnly=1).
- [x] Token health detection (isConnectionTokenStale, staleTokenConnections tracked in sync summary).
- [ ] User-facing stale/revoked Strava connection handling (in-app reconnect prompt when sync fails repeatedly).
- [x] Add sync metadata in UI (last sync, imported count, error state).
- [x] Notification timing + dedupe fixes
- [x] Make notifications timezone-aware at send time.
- [x] Add explicit policy for instant vs digest sends.
- [x] Add quiet hours / allowed send window support.
- [x] Ensure dedupe prevents repeated sends for the same due item/day/channel.
- [x] Core UX follow-ups
- [x] In bike switcher, show `Add Bike` CTA when user has no bikes.
- [x] Ensure reminders only target components present on a bike (no false Di2/lights alerts).

## P1 - Launch Readiness

- [ ] Testing expansion
- [x] Baseline integration tests for rides/maintenance/mileage recalculation are in place.
- [x] Add tests for maintenance/readiness calculations.
- [x] Add tests for per-bike notification preferences.
- [x] Add tests for notification timing + dedupe behavior.
- [ ] Add tests for Strava sync conflict/retry paths.
- [ ] Add a small end-to-end smoke path for login -> bike -> rides -> maintenance.
- [ ] Observability and operability
- [x] Add error monitoring (Sentry or equivalent) for frontend/API/cron paths.
- [x] Add alerting for cron failures (GH Actions job fails + emails on non-2xx; Sentry captures cron exceptions).
- [ ] Configure Sentry alert rules in dashboard (new-issue alerts, spike alerts for cron/sync errors).
- [ ] Add structured logging for background job outcomes.
- [ ] Add backup/restore runbook and perform one restore drill.
- [ ] Auth hardening
- [x] Password reset flow for email/password accounts (forgot-password path).
- [ ] Email verification for email/password signups.
- [x] Launch basics
- [x] Add privacy policy and terms pages.
- [x] Add support/contact path in app footer/profile.
- [ ] Create a dedicated company/support email address (currently using tlachman4@gmail.com — replace once you have one set up).
- [x] Add first-run onboarding for users with no bikes/components.

## Product Ideas (Future)

- [ ] Personalized maintenance predictions using Strava ride data (elevation, weather, intensity) to adjust component wear estimates beyond generic mileage thresholds.
- [ ] Pre-ride check routine — 60-second tap-through checklist (tires, brakes, bolts) that auto-logs, surfaces overdue maintenance, and drives daily habit engagement.
- [ ] Weekly bike health digest — email or push summary of miles ridden, component life percentages, and upcoming service intervals to drive passive re-engagement.

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
