# BikeLog

BikeLog is a full-stack bike maintenance tracker built with Next.js, TypeScript, Tailwind, Framer Motion, Prisma, and PostgreSQL.

It includes:
- Interactive garage-style homepage
- Bike profile page with live summary metrics
- Component tracking with add/edit/replace flow
- Ride logging with edit/delete and component mileage updates
- Maintenance due-status logic and maintenance event history
- Tire pressure calculator + saved preset CRUD
- Bike fit measurement CRUD + mark current
- Before-ride checklist persistence (toggle/add/delete/reset)

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- Framer Motion
- Prisma ORM
- PostgreSQL
- Lucide React

## Prerequisites

- Node.js 18+
- npm 9+
- Docker Desktop (for local Postgres via Compose)

## Environment Variables

Copy the example env file:

```bash
cp .env.example .env
```

Default value in `.env.example`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bikelog"
```

## Local Database (Docker Compose)

A Postgres service is provided in `docker-compose.yml`.

### Start DB

```bash
docker compose up -d db
```

### Check status

```bash
docker compose ps
```

### View logs

```bash
docker compose logs -f db
```

### Stop DB (keep data)

```bash
docker compose stop db
```

### Stop and remove containers/network (keep data)

```bash
docker compose down
```

### Full reset (remove DB data volume)

```bash
docker compose down -v
```

## Install Dependencies

```bash
npm install
```

## Prisma Setup

Generate Prisma client:

```bash
npm run db:generate
```

Push schema to DB:

```bash
npm run db:push
```

Seed DB with default BikeLog data:

```bash
npm run db:seed
```

## Run the App

Start development server:

```bash
npm run dev
```

Open:
- http://localhost:3000

## Available npm Commands

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build production app
- `npm run start` - Start production server after build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks
- `npm run test:integration` - Run DB-backed integration tests for rides and maintenance logging
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push Prisma schema to database
- `npm run db:migrate:status` - Show Prisma Migrate status
- `npm run db:migrate:deploy` - Apply committed migrations
- `npm run db:backfill:initial-mileage` - One-time backfill for component `initialMileage`
- `npm run db:seed` - Seed database using `prisma/seed.ts`

Integration tests require Postgres running locally on `localhost:5432` (see Docker Compose commands above).

## Prisma Migrate Workflow

This project is now baselined with Prisma Migrate using:

- `prisma/migrations/0_init/migration.sql`

For future schema changes:

1. Update `prisma/schema.prisma`
2. Create a migration with Prisma Migrate (example):

```bash
npx prisma migrate dev --name your_change_name
```

3. Commit the new migration folder
4. Apply in other environments with:

```bash
npm run db:migrate:deploy
```

One-time data backfill already added for existing local data:

```bash
npm run db:backfill:initial-mileage
```

## Recommended First-Time Setup

From project root:

```bash
npm install
cp .env.example .env
docker compose up -d db
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

## Daily Development Workflow

Start DB and app:

```bash
docker compose up -d db
npm run dev
```

When done:

```bash
docker compose stop db
```

## Production Build Commands

```bash
npm run build
npm run start
```

## Current API-Backed Features

### Rides

- `POST /api/rides` creates ride and increments active mileage-based components
- `PATCH /api/rides/[rideId]` edits ride and adjusts component mileage delta
- `DELETE /api/rides/[rideId]` deletes ride and decrements component mileage

### Maintenance

- `POST /api/maintenance-events` creates maintenance events
- `/maintenance` uses real due/due soon/overdue status computation from rides/components/events

### Components

- `POST /api/components` add component
- `PATCH /api/components/[componentId]` edit component
- `POST /api/components/[componentId]/replace` replace component (old -> replaced, new active at 0 mi)
- `POST /api/components/recalculate-mileage` preview/apply mileage recalculation from rides (drift fix)

### Pressure Presets

- `POST /api/pressure-presets` create preset
- `PATCH /api/pressure-presets/[presetId]` edit preset
- `DELETE /api/pressure-presets/[presetId]` delete preset

### Fit

- `POST /api/fit-measurements` create measurement
- `PATCH /api/fit-measurements/[measurementId]` edit measurement
- `POST /api/fit-measurements/[measurementId]/mark-current` set current fit snapshot

### Checklist

- `POST /api/checklist-items` add custom item
- `PATCH /api/checklist-items/[itemId]` toggle/update item
- `DELETE /api/checklist-items/[itemId]` delete custom item
- `POST /api/checklist-items/reset` reset all checklist completion states

## Project Structure (High Level)

```text
app/
  page.tsx
  dashboard/page.tsx
  bike/page.tsx
  components/page.tsx
  rides/page.tsx
  maintenance/page.tsx
  pressure/page.tsx
  fit/page.tsx
  checklist/page.tsx
  api/
    rides/
    maintenance-events/
    components/
    pressure-presets/
    fit-measurements/
    checklist-items/

components/
  garage/
  layout/
  ui/
  bike/
  components/
  rides/
  maintenance/
  pressure/
  fit/
  checklist/

lib/
  db.ts
  constants.ts
  maintenance.ts
  bike-maintenance.ts
  readiness.ts
  rides.ts
  pressure.ts

prisma/
  schema.prisma
  seed.ts
```

## Troubleshooting

### Database connection errors

1. Verify DB is running:

```bash
docker compose ps
```

2. Verify `DATABASE_URL` in `.env`.

3. Re-apply schema and seed:

```bash
npm run db:push
npm run db:seed
```

### Need clean DB state

```bash
docker compose down -v
docker compose up -d db
npm run db:push
npm run db:seed
```
