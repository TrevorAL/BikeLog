# BikeLog

BikeLog is a full-stack bike maintenance tracker built with Next.js, TypeScript, Tailwind, Framer Motion, Prisma, and PostgreSQL.

## What This App Includes

- Dashboard-first homepage
- Bike profile and readiness summaries
- Component mileage tracking (add/edit/replace/recalculate)
- Ride logging (create/edit/delete with mileage updates)
- Maintenance tracking and due-status logic
- Tire pressure calculator with saved presets
- Bike fit measurement history
- Before-ride checklist
- Simple auth + user ownership scoping

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Prisma ORM
- PostgreSQL (Neon by default)

## Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop (optional, only if you want local Postgres instead of Neon)

## Database Strategy

- Default: Neon managed Postgres (recommended)
- Optional: local Postgres via Docker Compose

You do not need Docker for normal development if `.env` points to Neon.

## Environment Variables

Copy example env:

```bash
cp .env.example .env
```

Set these in `.env`:

```env
DATABASE_URL="postgresql://...-pooler.../neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://...without-pooler.../neondb?sslmode=require&channel_binding=require"
AUTH_SECRET="your-random-secret"
CRON_SECRET="your-random-cron-secret"
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
STRAVA_CLIENT_ID="your-strava-client-id"
STRAVA_CLIENT_SECRET="your-strava-client-secret"
STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"
STRAVA_SCOPES="read,activity:read,profile:read_all"
RESEND_API_KEY="your-resend-api-key"
NOTIFICATIONS_FROM_EMAIL="alerts@yourdomain.com"
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_FROM_PHONE="+15555550123"
```

- `DATABASE_URL`: pooled Neon URL (for app runtime)
- `DIRECT_URL`: non-pooled Neon URL (for Prisma migrations/CLI)
- `AUTH_SECRET`: signs Auth.js session state
- `CRON_SECRET`: secures scheduled cron invocations
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Google OAuth credentials for Auth.js
- `STRAVA_*`: Strava OAuth + import configuration
- `RESEND_API_KEY` / `NOTIFICATIONS_FROM_EMAIL`: email delivery for reminders
- `TWILIO_*`: SMS delivery for reminders

Generate a secret:

```bash
openssl rand -base64 32
```

## Google OAuth Setup

In Google Cloud Console, create OAuth credentials and add this redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

For deployed environments, add your production domain callback too:

```text
https://your-domain.com/api/auth/callback/google
```

## First-Time Setup (Neon Default)

From project root:

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

Open:

- http://localhost:3000
- http://localhost:3000/login

Use the login page to either:

- Sign up with Google
- Log in with Google

BikeLog creates/reuses your user and scopes all data to that user.

## Daily Development Workflow

For normal local work (Neon-backed):

```bash
npm run dev
```

No Docker command is required.

## Deployments (Main-Only + GitHub Actions)

This repo uses `main` as the only long-lived branch.

- Vercel Git deployments are disabled via [`vercel.json`](./vercel.json). Stage and production deploys happen only through GitHub Actions.
- Deployments are run manually from GitHub Actions:
  - `.github/workflows/deploy-stage.yml`
  - `.github/workflows/deploy-prod.yml`
- Workflow inputs:
  - `source_ref` (required): exact ref/tag/sha to deploy
  - `previous_version` (optional): prior released version for compare links
- Tag flow:
  - `Main` workflow creates `build-v<version>`
  - `Deploy to Stage` consumes `build-v<version>` and creates `stage-v<version>`
  - `Deploy to Prod` consumes `stage-v<version>` and creates `v<version>`

### Manual deployment operator flow

1. Merge PR to `main`.
2. Wait for `Main` workflow and copy `build-v...` from "Version Summary".
3. Run "Deploy to Stage":
  - `source_ref=build-v...`
  - `previous_version` blank (or prior stage version).
4. Validate stage.
5. Run "Deploy to Prod":
  - `source_ref=stage-v...`
  - `previous_version` blank (or prior prod version).

### Vercel dashboard settings you still need

If Vercel still auto-builds from Git after this config is merged, check Project Settings -> Git and confirm Git deployments are disabled for this project.

If you see "There is a problem with the server configuration" in production, verify Vercel Production env vars are set:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `STRAVA_CLIENT_ID`
- `STRAVA_CLIENT_SECRET`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `NOTIFICATIONS_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE`

Required GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `STAGING_DATABASE_URL`
- `STAGING_DIRECT_URL`
- `PROD_DATABASE_URL`
- `PROD_DIRECT_URL`

### Environment variable matrix

Keep each environment on its own database, OAuth app/callbacks, cron secret, and notification provider settings. Do not reuse secret values across development, staging, and production.

| Variable | Local `.env` | Vercel Preview / Stage | Vercel Production | GitHub Actions |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Development database | Staging database | Production database | Test DB in CI; `STAGING_DATABASE_URL` / `PROD_DATABASE_URL` for deploy workflows |
| `DIRECT_URL` | Development direct DB URL | Staging direct DB URL | Production direct DB URL | Test DB in CI; `STAGING_DIRECT_URL` / `PROD_DIRECT_URL` for deploy workflows |
| `AUTH_SECRET` | Local-only secret | Staging secret | Production secret | Not needed outside app runtime |
| `AUTH_GOOGLE_ID` | Local OAuth client | Staging OAuth client | Production OAuth client | Not needed outside app runtime |
| `AUTH_GOOGLE_SECRET` | Local OAuth secret | Staging OAuth secret | Production OAuth secret | Not needed outside app runtime |
| `STRAVA_CLIENT_ID` | Local/dev Strava app | Staging Strava app | Production Strava app | Not needed outside app runtime |
| `STRAVA_CLIENT_SECRET` | Local/dev Strava secret | Staging Strava secret | Production Strava secret | Not needed outside app runtime |
| `STRAVA_REDIRECT_URI` | `http://localhost:3000/api/strava/callback` | Stage callback URL | Production callback URL | Not needed outside app runtime |
| `STRAVA_SCOPES` | `read,activity:read,profile:read_all` | Same unless scopes change | Same unless scopes change | Not needed outside app runtime |
| `CRON_SECRET` | Optional local cron testing secret | Staging cron secret | Production cron secret | `STAGING_CRON_SECRET` / `PROD_CRON_SECRET` for notification dispatch |
| `RESEND_API_KEY` | Optional local email testing key | Staging Resend key | Production Resend key | Not needed outside app runtime |
| `NOTIFICATIONS_FROM_EMAIL` | Optional local sender | Staging sender | Production sender | Not needed outside app runtime |
| `TWILIO_ACCOUNT_SID` | Optional local SMS testing SID | Staging Twilio SID | Production Twilio SID | Not needed outside app runtime |
| `TWILIO_AUTH_TOKEN` | Optional local SMS testing token | Staging Twilio token | Production Twilio token | Not needed outside app runtime |
| `TWILIO_FROM_PHONE` | Optional local SMS sender | Staging sender number | Production sender number | Not needed outside app runtime |
| `VERCEL_TOKEN` | Not needed | Not stored in Vercel | Not stored in Vercel | Required for deploy workflows |
| `VERCEL_ORG_ID` | Not needed | Not stored in Vercel | Not stored in Vercel | Required for deploy workflows |
| `VERCEL_PROJECT_ID` | Not needed | Not stored in Vercel | Not stored in Vercel | Required for deploy workflows |
| `STAGING_NOTIFICATIONS_CRON_URL` | Not needed | Not stored in Vercel | Not stored in Vercel | Full stage cron URL for hourly dispatch |
| `PROD_NOTIFICATIONS_CRON_URL` | Not needed | Not stored in Vercel | Not stored in Vercel | Full production cron URL for hourly dispatch |

## Background Notification Dispatch

BikeLog includes a cron endpoint that dispatches maintenance reminders even when no user opens the app.

- Route: `/api/cron/notifications/daily`
- Production Vercel cron: `5 13 * * *` (UTC), configured in [`vercel.json`](./vercel.json)
- GitHub Actions dispatcher: hourly at minute `5`, configured in [`.github/workflows/notifications-hourly.yml`](./.github/workflows/notifications-hourly.yml)

Security:

- Set `CRON_SECRET` in your Vercel environment variables.
- Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically to cron endpoints.
- Unauthorized calls to the endpoint return `401`.

GitHub Actions secrets:

- `PROD_NOTIFICATIONS_CRON_URL`: full production URL ending in `/api/cron/notifications/daily`
- `PROD_CRON_SECRET`: production `CRON_SECRET`
- `PROD_VERCEL_BYPASS_SECRET`: optional Vercel Deployment Protection bypass secret, only needed if production is protected
- `STAGING_NOTIFICATIONS_CRON_URL`: full staging URL ending in `/api/cron/notifications/daily`
- `STAGING_CRON_SECRET`: staging `CRON_SECRET`
- `STAGING_VERCEL_BYPASS_SECRET`: Vercel Deployment Protection bypass secret for protected staging dispatches

Important:

- Vercel cron jobs run only on **Production** deployments.

## Docker (Optional Local Postgres)

Use this only if you want to run Postgres locally instead of Neon.

### Start local DB

```bash
docker compose up -d db
```

### Stop local DB (keep container + data)

```bash
docker compose stop db
```

### Shut down compose stack (remove containers/network, keep data volume)

```bash
docker compose down
```

### Full reset (remove containers/network + DB volume data)

```bash
docker compose down -v
```

### Check status and logs

```bash
docker compose ps
docker compose logs -f db
```

## Prisma Workflow

This repo is baselined with:

- `prisma/migrations/0_init/migration.sql`

### Running the app (no schema change)

```bash
npm install
npm run db:generate
npm run db:migrate:deploy
npm run dev
```

### Exact DB change workflow (use this every time)

Use `migrate dev` only against a development database you can change freely (local Postgres or dedicated Neon dev branch), not stage/prod.

1. Create a feature branch from `main`.
2. Update `prisma/schema.prisma`.
3. Create a migration:

```bash
npx prisma migrate dev --name your_change_name
```

4. Regenerate Prisma client and validate:

```bash
npm run db:generate
npm run lint
npm run typecheck
npm run build
```

5. Commit all of these together:
- schema changes
- new migration folder under `prisma/migrations`
- app code using the new schema

6. Open PR to `main` and merge after checks pass.
7. Run manual deploy workflows from GitHub Actions:
- `Deploy to Stage` with inputs `version` and `previous_version`
- `Deploy to Prod` with inputs `version` and `previous_version`
8. Both deploy workflows run Prisma migrations against their target DB before deployment.

### Apply committed migrations manually (if needed)

```bash
npm run db:migrate:deploy
```

### Check migration status

```bash
npm run db:migrate:status
```

### Create a new migration during development

```bash
npx prisma migrate dev --name your_change_name
```

Then commit the new folder under `prisma/migrations`.

### Do not do this on shared stage/production DBs

- Do not run `npm run db:push` (or `prisma db push`) against shared environments.
- Do not run `npx prisma migrate reset` unless you explicitly want to drop all data.
- Do not edit schema manually in Neon and then expect migration history to stay valid.
- Do not push directly to `main`; use PRs only.

### Why drift happens

Drift usually happens when database state changes outside migration history, for example:
- schema pushed with `db push`
- manual DB edits in Neon
- migration files added after direct DB changes

Prisma then sees: "database schema and migration history do not match."

### One-time data backfill helper

```bash
npm run db:backfill:initial-mileage
```

## Commands

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build production app
- `npm run start` - Run production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run test:integration` - Run DB-backed integration tests
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push Prisma schema (local prototype only; avoid shared DBs)
- `npm run db:migrate:status` - Show migration status
- `npm run db:migrate:deploy` - Apply committed migrations
- `npm run db:backfill:initial-mileage` - Backfill `initialMileage`
- `npm run db:seed` - Seed default BikeLog data

## Project Backlog

- See [`TODO.md`](./TODO.md) for prioritized roadmap items and implementation tasks.

## Current API-Backed Features

### Rides

- `POST /api/rides`
- `PATCH /api/rides/[rideId]`
- `DELETE /api/rides/[rideId]`

### Maintenance

- `POST /api/maintenance-events`
- `PATCH /api/maintenance-events/[eventId]`
- `DELETE /api/maintenance-events/[eventId]`

### Components

- `POST /api/components`
- `PATCH /api/components/[componentId]`
- `POST /api/components/[componentId]/replace`
- `POST /api/components/recalculate-mileage`

### Pressure Presets

- `POST /api/pressure-presets`
- `PATCH /api/pressure-presets/[presetId]`
- `DELETE /api/pressure-presets/[presetId]`

### Fit

- `POST /api/fit-measurements`
- `PATCH /api/fit-measurements/[measurementId]`
- `POST /api/fit-measurements/[measurementId]/mark-current`

### Checklist

- `POST /api/checklist-items`
- `PATCH /api/checklist-items/[itemId]`
- `DELETE /api/checklist-items/[itemId]`
- `POST /api/checklist-items/reset`

### Notifications

- `GET /api/notifications/state`
- `PATCH /api/notifications/preferences`
- `GET /api/cron/notifications/daily` (cron-secured dispatch)

All write APIs require auth and enforce user ownership.

## Troubleshooting

### Can’t connect to DB

1. Verify `.env` URLs are correct for Neon.
2. Run:

```bash
npm run db:migrate:status
```

3. Confirm `DIRECT_URL` is the non-pooler Neon URL.
4. Re-seed if needed (non-production only):

```bash
npm run db:seed
```

### Drift detected / Prisma wants reset

If `npx prisma migrate dev` says drift and asks to reset, do not reset a shared DB.

1. Check pending migrations:

```bash
npm run db:migrate:status
```

2. If a migration's changes are already in the DB, mark it applied:

```bash
npx prisma migrate resolve --applied <migration_folder_name>
```

3. Apply the rest:

```bash
npm run db:migrate:deploy
```

4. Re-check:

```bash
npm run db:migrate:status
```

For this project, when in doubt: ask before running `migrate reset` or `db push` on shared Neon environments.

### Port 3000 in use

Stop the existing Next.js dev process, then rerun:

```bash
npm run dev
```
