-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN "selectedBikeId" TEXT;

-- CreateIndex
CREATE INDEX "User_selectedBikeId_idx" ON "public"."User"("selectedBikeId");

-- AddForeignKey
ALTER TABLE "public"."User"
ADD CONSTRAINT "User_selectedBikeId_fkey"
FOREIGN KEY ("selectedBikeId") REFERENCES "public"."Bike"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill selected bike to the oldest owned bike for users with bikes and no selection
UPDATE "public"."User" u
SET "selectedBikeId" = b."id"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "id"
  FROM "public"."Bike"
  WHERE "userId" IS NOT NULL
  ORDER BY "userId", "createdAt" ASC
) b
WHERE u."id" = b."userId"
  AND u."selectedBikeId" IS NULL;
