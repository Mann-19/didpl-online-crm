-- Add registration_fees column to booking_fees table
ALTER TABLE "public"."booking_fees"
  ADD COLUMN IF NOT EXISTS "registration_fees" text DEFAULT '0';
