-- CreateEnum
CREATE TYPE "DistanceUnit" AS ENUM ('MI', 'KM');

-- CreateEnum
CREATE TYPE "PressureUnit" AS ENUM ('PSI', 'BAR');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "timezone" TEXT,
ADD COLUMN "distanceUnit" "DistanceUnit" NOT NULL DEFAULT 'MI',
ADD COLUMN "pressureUnit" "PressureUnit" NOT NULL DEFAULT 'PSI';
