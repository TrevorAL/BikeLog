-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'SKIPPED', 'ERROR');

-- CreateTable
CREATE TABLE "UserNotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "phoneNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BikeNotificationPreference" (
    "id" TEXT NOT NULL,
    "userNotificationPreferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BikeNotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceNotificationLog" (
    "id" TEXT NOT NULL,
    "userNotificationPreferenceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "dueKey" TEXT NOT NULL,
    "dueStatus" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "dayKey" TEXT NOT NULL,
    "deliveryStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceNotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationPreference_userId_key" ON "UserNotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BikeNotificationPreference_userId_bikeId_key" ON "BikeNotificationPreference"("userId", "bikeId");

-- CreateIndex
CREATE INDEX "BikeNotificationPreference_userNotificationPreferenceId_idx" ON "BikeNotificationPreference"("userNotificationPreferenceId");

-- CreateIndex
CREATE INDEX "BikeNotificationPreference_bikeId_idx" ON "BikeNotificationPreference"("bikeId");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceNotificationLog_userId_bikeId_dueKey_channel_dayKey_key" ON "MaintenanceNotificationLog"("userId", "bikeId", "dueKey", "channel", "dayKey");

-- CreateIndex
CREATE INDEX "MaintenanceNotificationLog_bikeId_dayKey_idx" ON "MaintenanceNotificationLog"("bikeId", "dayKey");

-- AddForeignKey
ALTER TABLE "UserNotificationPreference" ADD CONSTRAINT "UserNotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeNotificationPreference" ADD CONSTRAINT "BikeNotificationPreference_userNotificationPreferenceId_fkey" FOREIGN KEY ("userNotificationPreferenceId") REFERENCES "UserNotificationPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BikeNotificationPreference" ADD CONSTRAINT "BikeNotificationPreference_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNotificationLog" ADD CONSTRAINT "MaintenanceNotificationLog_userNotificationPreferenceId_fkey" FOREIGN KEY ("userNotificationPreferenceId") REFERENCES "UserNotificationPreference"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceNotificationLog" ADD CONSTRAINT "MaintenanceNotificationLog_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;
