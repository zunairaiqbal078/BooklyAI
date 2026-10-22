-- CreateEnum
CREATE TYPE "StaffPermission" AS ENUM ('VIEW_CALENDAR', 'MANAGE_CALENDAR', 'CHAT_CLIENTS', 'MANAGE_SERVICES', 'MANAGE_STAFF', 'VIEW_ANALYTICS');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN "staff_id" UUID;

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Team Member',
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "permissions" "StaffPermission"[] DEFAULT ARRAY['VIEW_CALENDAR']::"StaffPermission"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_availability_rules" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "staff_availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_leaves" (
    "id" UUID NOT NULL,
    "staff_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'APPROVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable for implicit M:N between Service and StaffMember
CREATE TABLE "_ServiceStaff" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_ServiceStaff_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "staff_members_business_id_idx" ON "staff_members"("business_id");
CREATE INDEX "staff_members_business_id_is_active_idx" ON "staff_members"("business_id", "is_active");
CREATE INDEX "staff_availability_rules_staff_id_idx" ON "staff_availability_rules"("staff_id");
CREATE INDEX "staff_availability_rules_staff_id_day_of_week_idx" ON "staff_availability_rules"("staff_id", "day_of_week");
CREATE INDEX "staff_leaves_staff_id_idx" ON "staff_leaves"("staff_id");
CREATE INDEX "staff_leaves_staff_id_start_date_end_date_idx" ON "staff_leaves"("staff_id", "start_date", "end_date");
CREATE INDEX "_ServiceStaff_B_index" ON "_ServiceStaff"("B");
CREATE INDEX "appointments_staff_id_idx" ON "appointments"("staff_id");
CREATE INDEX "appointments_staff_id_status_start_time_idx" ON "appointments"("staff_id", "status", "start_time");

-- AddForeignKey
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_members" ADD CONSTRAINT "staff_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "staff_availability_rules" ADD CONSTRAINT "staff_availability_rules_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "staff_leaves" ADD CONSTRAINT "staff_leaves_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ServiceStaff" ADD CONSTRAINT "_ServiceStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ServiceStaff" ADD CONSTRAINT "_ServiceStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Drop old business-wide constraint and replace with dual staff/business exclusion constraints
ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_no_active_overlap";

-- Staff-scoped overlap constraint (guaranteed no double-booking for the same staff member)
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_no_active_overlap"
EXCLUDE USING gist (
  "staff_id" WITH =,
  tsrange("start_time", "end_time", '[)') WITH &&
) WHERE ("status" = ANY (ARRAY['PENDING'::"AppointmentStatus", 'CONFIRMED'::"AppointmentStatus"]) AND "staff_id" IS NOT NULL);

-- Legacy/unassigned fallback: if staff_id is NULL, business-scoped exclusion applies
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_business_no_active_overlap"
EXCLUDE USING gist (
  "business_id" WITH =,
  tsrange("start_time", "end_time", '[)') WITH &&
) WHERE ("status" = ANY (ARRAY['PENDING'::"AppointmentStatus", 'CONFIRMED'::"AppointmentStatus"]) AND "staff_id" IS NULL);
