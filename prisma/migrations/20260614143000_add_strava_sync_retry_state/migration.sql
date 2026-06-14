ALTER TABLE "StravaConnection"
ADD COLUMN "consecutiveSyncFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "syncRetryAfter" TIMESTAMP(3);
