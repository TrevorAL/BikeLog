-- CreateEnum
CREATE TYPE "NotificationSendPolicy" AS ENUM ('INSTANT', 'DIGEST_DAILY');

-- AlterTable
ALTER TABLE "UserNotificationPreference"
ADD COLUMN "sendPolicy" "NotificationSendPolicy" NOT NULL DEFAULT 'DIGEST_DAILY',
ADD COLUMN "digestHourLocal" INTEGER NOT NULL DEFAULT 9,
ADD COLUMN "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "quietHoursStartHour" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN "quietHoursEndHour" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN "sendWindowEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "sendWindowStartHour" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN "sendWindowEndHour" INTEGER NOT NULL DEFAULT 21;

-- Guardrails
ALTER TABLE "UserNotificationPreference"
ADD CONSTRAINT "UserNotificationPreference_digestHourLocal_check"
CHECK ("digestHourLocal" >= 0 AND "digestHourLocal" <= 23),
ADD CONSTRAINT "UserNotificationPreference_quietHoursStartHour_check"
CHECK ("quietHoursStartHour" >= 0 AND "quietHoursStartHour" <= 23),
ADD CONSTRAINT "UserNotificationPreference_quietHoursEndHour_check"
CHECK ("quietHoursEndHour" >= 0 AND "quietHoursEndHour" <= 23),
ADD CONSTRAINT "UserNotificationPreference_sendWindowStartHour_check"
CHECK ("sendWindowStartHour" >= 0 AND "sendWindowStartHour" <= 23),
ADD CONSTRAINT "UserNotificationPreference_sendWindowEndHour_check"
CHECK ("sendWindowEndHour" >= 0 AND "sendWindowEndHour" <= 23);
