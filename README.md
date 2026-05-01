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
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"
```

- `DATABASE_URL`: pooled Neon URL (for app runtime)
- `DIRECT_URL`: non-pooled Neon URL (for Prisma migrations/CLI)
- `AUTH_SECRET`: signs Auth.js session state
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`: Google OAuth credentials for Auth.js

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

### Apply committed migrations

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
- `npm run db:push` - Push Prisma schema (prototype use)
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

All write APIs require auth and enforce user ownership.

## Troubleshooting

### Can’t connect to DB

1. Verify `.env` URLs are correct for Neon.
2. Run:

```bash
npm run db:migrate:status
```

3. Re-seed if needed:

```bash
npm run db:seed
```

### Port 3000 in use

Stop the existing Next.js dev process, then rerun:

```bash
npm run dev
```
