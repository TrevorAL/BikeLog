# BikeLog TODO

Last updated: 2026-04-28

## Priority Key

- `P0` = current build priority
- `P1` = next release priority
- `P2` = quality and scaling follow-ups

## P0 - Core Product Milestones

Maybe allow for the overdue commonents to be clicked and and bring to maintnance page or something similar

Have the shifting charge and breaklights charge update on Time Ridden rather than days or miles

allow for the ready to ride to be clicked on and it takes you to maitinance : Ready to Ride 70% Good, minor checks

or even just the reasoning because right like this it says 90 but nothing looks wrong:

Ready to Ride

90%

Ready

Pressure Recommendation

73/78

Front/Rear PSI

Recent Miles

59.7 mi

From logged rides

Due Now

0

Maintenance items

add something about tire pressure refill notification based on the last time it was done

### Due now / overdue

Nothing pending.

### Due soon

Nothing pending.

Edit bike!

when I sign out, then go to sign in with google it won't let me select an acount even though I had signed out

- [ ] Connect to Strava
  - [ ] Add Strava OAuth provider + secure token refresh handling.
  - [ ] Add external activity mapping table to prevent duplicate imports.
  - [ ] Add "Import rides from Strava" flow with preview + manual confirmation.
  - [ ] Add sync metadata (last sync time, activity count, error state) in UI.

- [ ] Multi-bike optionality
  - [ ] Add bike switcher in app shell and persist selected bike per user.
  - [ ] Update server queries/services to use selected bike instead of `findFirst`.
  - [ ] Add create/edit/archive bike flows and safe defaults for first-time users.
  - [ ] Ensure all logging pages (rides, maintenance, pressure, fit, checklist) are bike-aware.

- [ ] Dev / Stage / Prod environment flow
  - [ ] Define separate env var sets and databases for development, staging, and production.
  - [ ] Add deployment workflow (preview/staging from branches, production from main).
  - [ ] Gate deploys with `lint`, `typecheck`, and integration tests.
  - [ ] Document migration + seed expectations by environment.

## P1 - UX and Account Improvements

- [ ] Profile page
  - [ ] Add `/profile` route and nav link.
  - [ ] Show and edit name/avatar/timezone/unit preferences.
  - [ ] Add default bike preference and account connection management (Google/Strava).

- [ ] UI enhancement pass
  - [ ] Tighten mobile layout for nav + dense dashboard cards.
  - [ ] Unify empty/loading/error states across all feature pages.
  - [ ] Add lightweight success/error toast feedback for mutations.
  - [ ] Run accessibility pass (keyboard focus, labels, contrast, hit targets).

## P2 - Reliability and Engineering

- [ ] Expand automated tests
  - [ ] Add integration tests for components, maintenance, pressure presets, fit, and checklist APIs.
  - [ ] Add edge-case tests for mileage recalculation + readiness scoring.

- [ ] Observability and operability
  - [ ] Add structured request/error logging for API routes.
  - [ ] Add error monitoring and basic product analytics events.
  - [ ] Add simple backup/restore runbook for production data.
