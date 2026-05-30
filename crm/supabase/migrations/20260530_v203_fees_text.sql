-- Alter booking_fees columns to text to support percent or flat amount inputs
ALTER TABLE "public"."booking_fees" 
  ALTER COLUMN stamp_duty TYPE text USING stamp_duty::text,
  ALTER COLUMN stamp_duty SET DEFAULT '0',
  ALTER COLUMN legal_fees TYPE text USING legal_fees::text,
  ALTER COLUMN legal_fees SET DEFAULT '0',
  ALTER COLUMN maintenance_fees TYPE text USING maintenance_fees::text,
  ALTER COLUMN maintenance_fees SET DEFAULT '0';
