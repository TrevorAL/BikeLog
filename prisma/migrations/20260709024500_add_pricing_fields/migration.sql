-- AlterTable
ALTER TABLE "public"."Bike" ADD COLUMN     "purchasePrice" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "public"."Component" ADD COLUMN     "price" DOUBLE PRECISION;

-- RenameIndex
ALTER INDEX "public"."notif_log_dedup_key" RENAME TO "MaintenanceNotificationLog_userId_bikeId_dueKey_channel_day_key";
