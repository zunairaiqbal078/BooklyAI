-- AlterTable
ALTER TABLE "services" ADD COLUMN "image_url" TEXT;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "review_requested" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "price_cents" INTEGER,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_business_id_idx" ON "offers"("business_id");
CREATE INDEX "offers_business_id_is_active_idx" ON "offers"("business_id", "is_active");
CREATE INDEX "offers_service_id_idx" ON "offers"("service_id");
CREATE UNIQUE INDEX "reviews_appointment_id_key" ON "reviews"("appointment_id");
CREATE INDEX "reviews_business_id_idx" ON "reviews"("business_id");
CREATE INDEX "reviews_service_id_idx" ON "reviews"("service_id");
CREATE INDEX "reviews_customer_id_idx" ON "reviews"("customer_id");
CREATE INDEX "reviews_business_id_created_at_idx" ON "reviews"("business_id", "created_at");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "offers" ADD CONSTRAINT "offers_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
