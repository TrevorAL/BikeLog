-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ComponentType" AS ENUM ('CHAIN', 'CASSETTE', 'FRONT_TIRE', 'REAR_TIRE', 'FRONT_BRAKE_PAD', 'REAR_BRAKE_PAD', 'FRONT_ROTOR', 'REAR_ROTOR', 'CHAINRINGS', 'CLEATS', 'BAR_TAPE', 'DI2_BATTERY', 'PEDALS', 'WHEELSET', 'CRANKSET', 'HANDLEBAR', 'STEM', 'SADDLE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ComponentStatus" AS ENUM ('ACTIVE', 'REPLACED', 'RETIRED');

-- CreateEnum
CREATE TYPE "public"."RideType" AS ENUM ('OUTDOOR', 'INDOOR', 'RACE', 'GROUP_RIDE', 'TRAINING', 'RECOVERY', 'LONG_RIDE');

-- CreateEnum
CREATE TYPE "public"."MaintenanceEventType" AS ENUM ('LUBED_CHAIN', 'CLEANED_CHAIN', 'CHECKED_CHAIN_WEAR', 'REPLACED_CHAIN', 'CHECKED_TIRE_PRESSURE', 'INSPECTED_TIRE', 'REPLACED_TIRE', 'INSPECTED_BRAKE_PADS', 'REPLACED_BRAKE_PADS', 'CHARGED_DI2', 'CHECKED_BOLTS', 'FIT_ADJUSTMENT', 'REPLACED_COMPONENT', 'OTHER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Bike" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "type" TEXT,
    "frameSize" TEXT,
    "frameMaterial" TEXT,
    "drivetrain" TEXT,
    "brakeType" TEXT,
    "wheelset" TEXT,
    "tireSetup" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Component" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "type" "public"."ComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "installDate" TIMESTAMP(3),
    "initialMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentMileage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "public"."ComponentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ride" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,
    "durationMinutes" INTEGER,
    "rideType" "public"."RideType" NOT NULL DEFAULT 'OUTDOOR',
    "weather" TEXT,
    "roadCondition" TEXT,
    "wasWet" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MaintenanceEvent" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "componentId" TEXT,
    "type" "public"."MaintenanceEventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mileageAtService" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TirePressureSetup" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "riderWeightLbs" DOUBLE PRECISION NOT NULL,
    "bikeWeightLbs" DOUBLE PRECISION NOT NULL,
    "gearWeightLbs" DOUBLE PRECISION,
    "frontTireWidthMm" INTEGER NOT NULL,
    "rearTireWidthMm" INTEGER NOT NULL,
    "tubeless" BOOLEAN NOT NULL,
    "surface" TEXT NOT NULL,
    "preference" TEXT NOT NULL,
    "frontPsi" DOUBLE PRECISION NOT NULL,
    "rearPsi" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TirePressureSetup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FitMeasurement" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "saddleHeightMm" DOUBLE PRECISION,
    "saddleSetbackMm" DOUBLE PRECISION,
    "saddleTiltDeg" DOUBLE PRECISION,
    "stemLengthMm" DOUBLE PRECISION,
    "handlebarWidthMm" DOUBLE PRECISION,
    "crankLengthMm" DOUBLE PRECISION,
    "spacerStackMm" DOUBLE PRECISION,
    "reachToHoodsMm" DOUBLE PRECISION,
    "cleatNotes" TEXT,
    "notes" TEXT,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FitMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ChecklistItem" (
    "id" TEXT NOT NULL,
    "bikeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- AddForeignKey
ALTER TABLE "public"."Bike" ADD CONSTRAINT "Bike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Component" ADD CONSTRAINT "Component_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "public"."Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ride" ADD CONSTRAINT "Ride_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "public"."Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "public"."Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "public"."Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TirePressureSetup" ADD CONSTRAINT "TirePressureSetup_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "public"."Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FitMeasurement" ADD CONSTRAINT "FitMeasurement_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "public"."Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ChecklistItem" ADD CONSTRAINT "ChecklistItem_bikeId_fkey" FOREIGN KEY ("bikeId") REFERENCES "public"."Bike"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

