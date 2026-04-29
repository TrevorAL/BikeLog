-- CreateEnum
CREATE TYPE "StravaSyncStatus" AS ENUM ('CONNECTED', 'SUCCESS', 'NO_NEW_DATA', 'ERROR');

-- CreateTable
CREATE TABLE "StravaConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stravaAthleteId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncImportedCount" INTEGER NOT NULL DEFAULT 0,
    "lastSyncStatus" "StravaSyncStatus" NOT NULL DEFAULT 'CONNECTED',
    "lastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StravaActivityImport" (
    "id" TEXT NOT NULL,
    "stravaConnectionId" TEXT NOT NULL,
    "stravaActivityId" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "rideId" TEXT,
    "activityName" TEXT,
    "activityType" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "distanceMeters" DOUBLE PRECISION,
    "movingTimeSeconds" INTEGER,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StravaActivityImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_userId_key" ON "StravaConnection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaConnection_stravaAthleteId_key" ON "StravaConnection"("stravaAthleteId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivityImport_rideId_key" ON "StravaActivityImport"("rideId");

-- CreateIndex
CREATE UNIQUE INDEX "StravaActivityImport_stravaConnectionId_stravaActivityId_key" ON "StravaActivityImport"("stravaConnectionId", "stravaActivityId");

-- AddForeignKey
ALTER TABLE "StravaConnection" ADD CONSTRAINT "StravaConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaActivityImport" ADD CONSTRAINT "StravaActivityImport_stravaConnectionId_fkey" FOREIGN KEY ("stravaConnectionId") REFERENCES "StravaConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaActivityImport" ADD CONSTRAINT "StravaActivityImport_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "Bike"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StravaActivityImport" ADD CONSTRAINT "StravaActivityImport_rideId_fkey" FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE SET NULL ON UPDATE CASCADE;
