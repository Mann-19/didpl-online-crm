-- Add payment_type to payments
ALTER TABLE "public"."payments" ADD COLUMN IF NOT EXISTS "payment_type" text DEFAULT 'Plot payment';
