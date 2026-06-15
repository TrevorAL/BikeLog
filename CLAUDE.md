# BikeLog

Full-stack bike maintenance tracker. Next.js (App Router) + TypeScript + Tailwind + Framer Motion + Prisma + PostgreSQL (Neon).

## Stack & Structure

- `app/` - routes (App Router), grouped by feature: `bike`, `dashboard`, `maintenance`, `rides`, `pressure`, `fit`, `checklist`, `profile`, `settings`, `login`, plus `app/api/*` for API routes
- `components/` - UI components, grouped to mirror `app/` (`bike`, `maintenance`, `rides`, `pressure`, `fit`, `checklist`, `profile`, `garage`, `layout`, `ui`, `auth`, `components`)
- `lib/` - business logic / services (e.g. `maintenance.ts`, `readiness.ts`, `rides.ts`, `component-service.ts`, `strava*.ts`, `notifications.ts`, `pressure.ts`, `ownership.ts`, `db.ts`)
- `prisma/` - schema, migrations, seed
- `tests/integration/` - DB-backed integration tests (Node test runner + tsx)

Path alias: `@/*` -> project root.

## Commands

```bash
npm run dev              # start dev server
npm run lint             # eslint
npm run typecheck        # tsc --noEmit
npm run build             # production build
npm run test:integration  # DB-backed integration tests
npm run db:generate        # prisma generate
npm run db:migrate:status  # check migration status
npm run db:migrate:deploy   # apply committed migrations
npm run db:seed             # seed default data
```

Always run `lint`, `typecheck`, and `build` before considering schema/data-layer changes done.

## Database / Prisma Workflow (important)

- Schema changes: `npx prisma migrate dev --name <change_name>` against a local/dev DB only.
- Never run `db:push` or `prisma migrate reset` against shared (staging/prod) Neon databases.
- Commit schema changes, the new migration folder, and the app code together.
- If drift is reported, do not reset shared DBs — use `prisma migrate resolve --applied <folder>` then `db:migrate:deploy`. Ask before running `migrate reset`/`db push` on shared environments.

## Git / Deployment Model

- `main` is the only long-lived branch. Feature branches -> PR -> `main`.
- Vercel Git auto-deploys are disabled. Deploys happen only via GitHub Actions (`deploy-stage.yml`, `deploy-prod.yml`), using tags (`build-v...` -> `stage-v...` -> `v...`).
- Do not push directly to `main`.
- Background cron jobs: `/api/cron/notifications/daily` (maintenance reminders) and `/api/cron/strava/sync` (Strava sync + retry), secured via `CRON_SECRET`.

## Data Model Notes

- All data is scoped per-user via `userId` ownership (`lib/ownership.ts`); write APIs must enforce this.
- Core entities: `User` -> `Bike` -> `Component`, `Ride`, `MaintenanceEvent`, `TirePressureSetup`, `FitMeasurement`, `ChecklistItem`.
- Strava integration: `StravaConnection` + `StravaActivityImport`, with auto-sync/retry tracked via `consecutiveSyncFailures` / `syncRetryAfter`.
- Notifications: `UserNotificationPreference` + per-bike `BikeNotificationPreference`, dedup via `MaintenanceNotificationLog` (unique on user/bike/dueKey/channel/day).

## Current Priorities (see TODO.md)

- P0 remaining: confirm env secrets aren't shared across environments; cron monitoring/alerting and token-health checks for Strava.
- P1: Strava sync conflict/retry tests, e2e smoke test, error monitoring (Sentry), structured logging, backup/restore runbook, privacy/terms pages, onboarding for new users.
- P2: production domain, multi-Strava-account support, webhook-based sync.

Check `TODO.md` for the full prioritized backlog before starting new feature work.
