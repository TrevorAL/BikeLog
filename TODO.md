# BikeLog TODO

Last updated: 2026-04-29

## Priority Key

- `P0` = current build priority
- `P1` = next release priority
- `P2` = quality and scaling follow-ups

## P0 - Core Product Milestones

- [ ] Maintenance reminder system
  - [ ] Add scheduled reminder generation for due-soon and overdue items.
  - [ ] Add per-bike notification preferences (in-app first, optional email next).
  - [ ] Add "tomorrow / this week" reminder buckets.
  - [ ] Trigger reminder emails from background Strava-updated data at the correct local send time.
  - [ ] Ensure reminders only run for components present on that bike (no Di2/light reminders when missing).

- [ ] Strava Sync 2.0
  - [ ] Add background scheduled sync (not only on manual actions/page open).
  - [ ] Add configurable sync windows (last 7/30/90 days).
  - [ ] Add conflict handling for changed/deleted Strava activities.
  - [ ] Add manual "sync now" action with result summary.

- [ ] Dev / Stage / Prod environment flow
  - [ ] Define separate env var sets and databases for development, staging, and production.
  - [ ] Add deployment workflow (preview/staging from branches, production from main).
  - [ ] Gate deploys with `lint`, `typecheck`, and integration tests.
  - [ ] Document migration + seed expectations by environment.

## P1 - UX and Account Improvements

- [ ] Data integrity + trust
  - [ ] Add source-of-truth mileage recalculation job from rides.
  - [ ] Handle ride edit/delete impacts consistently across component mileage and readiness.
  - [ ] Add Strava import/sync audit page (imported, skipped, failed, why).

- [ ] Dashboard upgrade
  - [ ] Add "This week" maintenance plan section.
  - [ ] Add projected due dates for top wear-based components.
  - [ ] Show readiness score deductions with direct fix links.

- [ ] UI enhancement pass
  - [ ] Tighten mobile layout for nav + dense dashboard cards.
  - [ ] Unify empty/loading/error states across all feature pages.
  - [ ] Add lightweight success/error toast feedback for mutations.
  - [ ] Run accessibility pass (keyboard focus, labels, contrast, hit targets).

## P2 - Reliability and Engineering

- [ ] Mobile + PWA polish
  - [ ] Add installable PWA support and app metadata polish.
  - [ ] Add fast "quick log ride" mobile flow.
  - [ ] Add offline draft logging with retry on reconnect.

- [ ] Expand automated tests
  - [ ] Add integration tests for components, maintenance, pressure presets, fit, and checklist APIs.
  - [ ] Add edge-case tests for mileage recalculation + readiness scoring.

- [ ] Observability and operability
  - [ ] Add structured request/error logging for API routes.
  - [ ] Add error monitoring and basic product analytics events.
  - [ ] Add simple backup/restore runbook for production data.
