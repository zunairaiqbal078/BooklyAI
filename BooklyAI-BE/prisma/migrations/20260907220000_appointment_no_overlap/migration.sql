-- Hard guarantee: no two PENDING/CONFIRMED appointments can overlap for the same business.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_active_overlap"
EXCLUDE USING gist (
  "business_id" WITH =,
  tsrange("start_time", "end_time", '[)') WITH &&
) WHERE ("status" = ANY (ARRAY['PENDING'::"AppointmentStatus", 'CONFIRMED'::"AppointmentStatus"]));
