# BikeLog

BikeLog is a full-stack bike maintenance tracker built with Next.js, TypeScript, Tailwind, Framer Motion, Prisma, and PostgreSQL.

It includes:
- Interactive garage-style home page
- Bike profile page
- Components tracking
- Ride logging (Prisma-backed)
- Maintenance overview
- Tire pressure calculator
- Fit measurements
- Before-ride checklist

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

### Full reset (remove data volume too)

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
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push Prisma schema to database
- `npm run db:seed` - Seed database using `prisma/seed.ts`

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

## Current Prisma-Backed Flow

- Rides page reads from PostgreSQL
- `POST /api/rides` creates rides and increments mileage on active mileage-based components

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
  api/rides/route.ts

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
  pressure.ts
  maintenance.ts
  readiness.ts
  rides.ts

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
