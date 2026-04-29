-- AlterTable
ALTER TABLE "public"."Bike"
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Bike_userId_isArchived_idx" ON "public"."Bike"("userId", "isArchived");
