-- CreateEnum
CREATE TYPE "BusinessCategory" AS ENUM ('SALON', 'CLINIC', 'SPA', 'WELLNESS', 'FITNESS', 'OTHER');

-- AlterTable
ALTER TABLE "businesses"
  ADD COLUMN "category" "BusinessCategory" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "city" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "cover_image_url" TEXT,
  ADD COLUMN "is_published" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "review_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "services" ADD COLUMN "price_cents" INTEGER;

-- CreateIndex
CREATE INDEX "businesses_category_idx" ON "businesses"("category");
CREATE INDEX "businesses_city_idx" ON "businesses"("city");
CREATE INDEX "businesses_is_published_idx" ON "businesses"("is_published");
CREATE INDEX "businesses_is_published_city_idx" ON "businesses"("is_published", "city");
CREATE INDEX "businesses_is_published_category_idx" ON "businesses"("is_published", "category");
