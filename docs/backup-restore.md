# Backup & Restore Runbook (Neon Postgres)

How to recover the BikeLog database after data loss or corruption, and how to run
a restore drill so you know the process works *before* you need it.

## What we rely on

- **Database**: Neon Postgres. Connection via `DATABASE_URL` (pooled) and
  `DIRECT_URL` (direct, used for migrations) — see
  [`prisma/schema.prisma`](../prisma/schema.prisma).
- **Separate databases per environment**: `development`, `staging`, `production`
  each have their own Neon project/branch and env var set. A restore in one must
  never point at another's `DATABASE_URL`.
- **Neon Point-in-Time Restore (PITR)**: Neon continuously retains WAL history
  and lets you create a branch from any timestamp inside the retention window.
  This is the primary recovery mechanism — no manual `pg_dump` cron required for
  the retention window.

### Recovery objectives

| Metric | Target | Basis |
| --- | --- | --- |
| RPO (max data loss) | ≈ minutes | Neon PITR is continuous within retention |
| RTO (time to restore) | < 30 min | Create branch + repoint `DATABASE_URL` |
| Retention window | Check Neon project settings | Free tier is limited; verify current value |

> **Action item**: confirm the production Neon project's PITR retention window in
> the Neon console (Project → Settings → Storage). If it is shorter than your
> comfort level, either upgrade the plan or add scheduled logical dumps (below).

## Recovery scenarios

### A. Accidental bad data (bad migration, bulk delete, corruption)

Use **Neon PITR** to a timestamp just before the bad event. This is the common
case and the fastest path.

1. **Stop writes.** In Vercel, pause the cron GitHub Actions
   (`strava-sync`, `strava-retry`, `notifications-hourly`) and, if the damage is
   ongoing, put the app in maintenance / disable the deployment. This prevents
   new writes racing the restore.
2. **Identify the target time.** Determine the latest timestamp *before* the bad
   change (from the migration time, Sentry event, or audit log).
3. **Create a restore branch in Neon.** Neon console → project → **Branches** →
   *Create branch* → *from a point in time* → enter the target timestamp. Name it
   e.g. `restore-2026-06-17`.
4. **Inspect before promoting.** Connect to the branch's connection string with
   `psql` and spot-check the data is intact:
   ```bash
   psql "<restore-branch-connection-string>" -c "select count(*) from \"User\";"
   psql "<restore-branch-connection-string>" -c "select count(*) from \"Ride\";"
   ```
5. **Cut over.** Two options:
   - **Promote the branch** to be the new primary (Neon supports making a branch
     the default), **or**
   - Update `DATABASE_URL` / `DIRECT_URL` in the **production** Vercel
     environment to the restore branch, then redeploy.
6. **Verify the app.** Log in, load dashboard, confirm bikes/rides/maintenance
   render and a test write succeeds.
7. **Re-enable crons** once healthy.
8. **Post-incident**: write up what happened (see
   [`incident-response`](#) workflow / postmortem), and delete stale restore
   branches after a cooling-off period.

### B. Schema drift / failed migration on a shared DB

Do **not** `prisma migrate reset` or `db push` against staging/prod (see
[`CLAUDE.md`](../CLAUDE.md)). Instead:

1. Run `npm run db:migrate:status` against the affected env to see drift.
2. If a migration is recorded as failed/partially applied, resolve it:
   ```bash
   npx prisma migrate resolve --applied <migration_folder_name>
   npm run db:migrate:deploy
   ```
3. If the data itself is wrong as a result, fall back to scenario A (PITR to
   before the migration).

### C. Total project loss (Neon project deleted / unrecoverable)

This is what scheduled logical backups protect against, since PITR lives inside
the same project. If you have dumps (see below), restore the latest into a fresh
Neon project:

```bash
# Against a brand-new, empty Neon database:
pg_restore --no-owner --no-privileges -d "<new-database-url>" latest.dump
# or for a plain SQL dump:
psql "<new-database-url>" < latest.sql
```

Then point `DATABASE_URL` / `DIRECT_URL` at the new project and redeploy.

## Optional: scheduled logical backups (defense in depth)

PITR covers A and B. For C (and for keeping backups beyond the retention
window), take periodic `pg_dump` snapshots to off-Neon storage:

```bash
# Custom format (compressed, supports selective restore):
pg_dump "$DATABASE_URL" -Fc -f "bikelog-$(date +%Y%m%d).dump"
```

Store these somewhere independent of Neon (e.g. an S3/R2 bucket or local
encrypted archive). A weekly GitHub Actions job mirroring the existing cron
workflows would automate this — not yet implemented; track as a follow-up if you
decide retention beyond Neon's window matters.

## Restore drill (do this — it's the part that actually de-risks you)

Run this against a **throwaway target**, never production data. Goal: prove you
can produce a working database from a backup and connect the app to it.

1. **Pick a safe target.** Create a fresh Neon branch from the **staging** (or a
   dedicated `drill`) database — never operate on production in a drill.
2. **Simulate loss + restore via PITR:**
   - Note the current time.
   - Make a visible change in staging (e.g. delete a test ride).
   - Create a branch from a timestamp *before* that change.
   - Confirm the deleted row exists again on the restore branch:
     ```bash
     psql "<restore-branch-connection-string>" -c "select count(*) from \"Ride\";"
     ```
3. **Connect the app to the restored branch** (locally is fine): set
   `DATABASE_URL` / `DIRECT_URL` to the branch, run `npm run dev`, log in, and
   confirm data loads and a write works.
4. **Time it.** Record how long steps 1–3 took — that is your real RTO. Update
   the table above if it differs from the 30-min target.
5. **Tear down.** Delete the drill branch.
6. **Record the result.** Add a dated line to the drill log below.

### Drill log

| Date | Performed by | Scenario | RTO observed | Notes |
| --- | --- | --- | --- | --- |
| _pending_ | | PITR branch restore | | First drill not yet run |

## Pre-flight checklist (before any production restore)

- [ ] Writes are paused (crons disabled, app in maintenance if needed)
- [ ] Target restore timestamp confirmed
- [ ] Restore branch inspected with `psql` before cutover
- [ ] `DATABASE_URL` **and** `DIRECT_URL` both updated for the env
- [ ] App smoke-tested after cutover (login + read + write)
- [ ] Crons re-enabled
- [ ] Incident written up; stale restore branches cleaned up later
