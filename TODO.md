# BikeLog TODO

Last updated: 2026-04-29

## Priority Key

- `P0` = current build priority
- `P1` = next release priority
- `P2` = quality and scaling follow-ups

## P0 - Core Product Milestones

### Due now / overdue

Nothing pending.

### Due soon

Nothing pending.

- [x] Connect to Strava
  - [x] Add Strava OAuth provider + secure token refresh handling.
  - [x] Add external activity mapping table to prevent duplicate imports.
  - [x] Add "Import rides from Strava" flow with preview + manual confirmation.
  - [x] Add sync metadata (last sync time, activity count, error state) in UI.

- [x] Multi-bike optionality
  - [x] Add bike switcher in app shell and persist selected bike per user.
  - [x] Update server queries/services to use selected bike instead of `findFirst`.
  - [x] Add create/edit/archive bike flows and safe defaults for first-time users.
  - [x] Ensure all logging pages (rides, maintenance, pressure, fit, checklist) are bike-aware.

- [ ] Dev / Stage / Prod environment flow
  - [ ] Define separate env var sets and databases for development, staging, and production.
  - [ ] Add deployment workflow (preview/staging from branches, production from main).
  - [ ] Gate deploys with `lint`, `typecheck`, and integration tests.
  - [ ] Document migration + seed expectations by environment.

## P1 - UX and Account Improvements

- [x] Profile page
  - [x] Add `/profile` route and nav link.
  - [x] Show and edit name/avatar/timezone/unit preferences.
  - [x] Add default bike preference and account connection management (Google/Strava).

- [ ] UI enhancement pass
  - [ ] Tighten mobile layout for nav + dense dashboard cards.
  - [ ] Unify empty/loading/error states across all feature pages.
  - [ ] Add lightweight success/error toast feedback for mutations.
  - [ ] Run accessibility pass (keyboard focus, labels, contrast, hit targets).

- [x] Auth UX follow-up
  - [x] Validate Google account chooser behavior after sign-out/sign-in loop.

## P2 - Reliability and Engineering

- [ ] Expand automated tests
  - [ ] Add integration tests for components, maintenance, pressure presets, fit, and checklist APIs.
  - [ ] Add edge-case tests for mileage recalculation + readiness scoring.

- [ ] Observability and operability
  - [ ] Add structured request/error logging for API routes.
  - [ ] Add error monitoring and basic product analytics events.
  - [ ] Add simple backup/restore runbook for production data.
