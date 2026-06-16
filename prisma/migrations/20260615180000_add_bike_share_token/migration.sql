-- Fix drifted unique index on MaintenanceNotificationLog (Postgres silently truncated the
-- auto-generated 66-char name to 63 chars). Drop the truncated name, recreate with the
-- explicit short name now declared in the Prisma schema.
DROP INDEX IF EXISTS "MaintenanceNotificationLog_userId_bikeId_dueKey_channel_day_key";
DROP INDEX IF EXISTS "MaintenanceNotificationLog_userId_bikeId_dueKey_channel_dayKey_";

CREATE UNIQUE INDEX IF NOT EXISTS "notif_log_dedup_key"
  ON "MaintenanceNotificationLog"("userId", "bikeId", "dueKey", "channel", "dayKey");

-- Add share-token fields to Bike
ALTER TABLE "Bike" ADD COLUMN IF NOT EXISTS "shareToken" TEXT;
ALTER TABLE "Bike" ADD COLUMN IF NOT EXISTS "isShared"   BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Bike_shareToken_key" ON "Bike"("shareToken");
