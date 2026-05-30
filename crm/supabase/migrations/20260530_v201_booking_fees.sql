-- Create temporary booking_fees table
CREATE TABLE IF NOT EXISTS "public"."booking_fees" (
    "booking_id" "uuid" NOT NULL,
    "stamp_duty" real DEFAULT 0,
    "legal_fees" real DEFAULT 0,
    "maintenance_fees" real DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "booking_fees_pkey" PRIMARY KEY ("booking_id"),
    CONSTRAINT "booking_fees_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."booking_fees" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_fees_all" ON "public"."booking_fees";
CREATE POLICY "booking_fees_all" ON "public"."booking_fees" FOR ALL USING (true) WITH CHECK (true);
