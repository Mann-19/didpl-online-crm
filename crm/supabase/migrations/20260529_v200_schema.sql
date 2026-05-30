-- ============================================================
-- DIDP CRM — Schema Migration V2.0.0
-- Date: 2026-05-29
-- Author: Antigravity AI
-- Run on: TEST DB first, verify, then PRODUCTION
-- ============================================================
-- CHANGES:
--   1.  DROP TABLE project_layouts
--   2.  DROP TABLE otp_codes
--   3.  DROP COLUMNS plots(length, width, area_sqm)
--   4.  RECREATE plot_status_enum without 'partially_paid'
--   5.  DROP COLUMNS bookings(donation_amount, commission_amount, tds_amount)
--   6.  ADD COLUMN  bookings.booking_type
--   7.  DROP COLUMN payments.receipt_type
--   8.  DROP TYPE   receipt_type_enum
--   9.  CREATE TABLE booking_partners (junction table for multi-partner support)
--   10. MIGRATE partner_client_id → booking_partners
--   11. BACKFILL booking_type for existing partnerships
--   12. CREATE FUNCTION + TRIGGER sync_booking_type
--   13. ADD missing performance indexes
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. REMOVE project_layouts table
--    Confirmed empty, never actively used in production.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.project_layouts LIMIT 1) THEN
    RAISE EXCEPTION 'project_layouts is NOT empty — inspect data before dropping.';
  END IF;
END $$;

DROP TABLE IF EXISTS public.project_layouts CASCADE;

-- ────────────────────────────────────────────────────────────
-- 2. REMOVE otp_codes table
--    OTP-based client login flow is being removed.
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- ────────────────────────────────────────────────────────────
-- 3. REMOVE unused dimension columns from plots
--    area_sqyd remains as the primary unit used everywhere.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.plots
  DROP COLUMN IF EXISTS length,
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS area_sqm;

-- ────────────────────────────────────────────────────────────
-- 4. RECREATE plot_status_enum without 'partially_paid'
--    PostgreSQL does not support DROP VALUE from an existing enum.
--    We must: convert column to text → drop type → recreate → convert back.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.plots WHERE status::text = 'partially_paid') THEN
    RAISE EXCEPTION 'Cannot remove partially_paid — rows exist with this status. Fix them first.';
  END IF;
END $$;

-- Drop the column default FIRST — it holds a reference to the old enum type
-- Without this, DROP TYPE will fail with a dependency error.
ALTER TABLE public.plots ALTER COLUMN status DROP DEFAULT;

-- Convert column to plain text (breaks the enum type dependency)
ALTER TABLE public.plots ALTER COLUMN status TYPE text;

-- Now safe to drop the old enum
DROP TYPE IF EXISTS public.plot_status_enum;

-- Recreate enum without 'partially_paid'
CREATE TYPE public.plot_status_enum AS ENUM ('available', 'token_paid', 'sold');

-- Convert column back to the new enum type
ALTER TABLE public.plots
  ALTER COLUMN status TYPE public.plot_status_enum
  USING status::public.plot_status_enum;

-- Restore the default
ALTER TABLE public.plots
  ALTER COLUMN status SET DEFAULT 'available'::public.plot_status_enum;

-- ────────────────────────────────────────────────────────────
-- 5. REMOVE obsolete columns from bookings
--    - donation_amount:  never used in business logic
--    - commission_amount: now calculated per-payment and stored on payment row
--    - tds_amount:        now calculated per-payment and stored on payment row
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS donation_amount,
  DROP COLUMN IF EXISTS commission_amount,
  DROP COLUMN IF EXISTS tds_amount;

-- ────────────────────────────────────────────────────────────
-- 6. ADD booking_type to bookings
--    Values: 'single' (default) | 'partnership'
--    Kept in sync automatically by the trigger in step 12.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'single'
  CHECK (booking_type IN ('single', 'partnership'));

-- ────────────────────────────────────────────────────────────
-- 7. REMOVE receipt_type column from payments
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS receipt_type;

-- ────────────────────────────────────────────────────────────
-- 8. DROP receipt_type_enum (no longer used anywhere)
-- ────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.receipt_type_enum;

-- ────────────────────────────────────────────────────────────
-- 9. CREATE booking_partners junction table
--    Replaces single partner_client_id FK.
--    Supports unlimited partners with full referential integrity.
--    - booking_id → bookings(id) ON DELETE CASCADE
--    - client_id  → clients(id)  ON DELETE CASCADE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_partners (
  booking_id  UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.clients(id)  ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, client_id)
);

ALTER TABLE public.booking_partners ENABLE ROW LEVEL SECURITY;

-- RLS: admins and employees have full access
CREATE POLICY "booking_partners_admin_emp_all" ON public.booking_partners
  USING (public.is_admin() OR public.is_employee());

-- ────────────────────────────────────────────────────────────
-- 10. MIGRATE existing partner_client_id → booking_partners
--     Safely insert existing partnership data.
--     ON CONFLICT DO NOTHING handles any accidental duplicates.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.booking_partners (booking_id, client_id)
SELECT id, partner_client_id
FROM public.bookings
WHERE partner_client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 11. BACKFILL booking_type for already-existing partnerships
-- ────────────────────────────────────────────────────────────
UPDATE public.bookings
SET booking_type = 'partnership'
WHERE partner_client_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- NOTE: partner_client_id is intentionally NOT dropped here.
-- It will be dropped at the END of Phase 2, after all
-- application code is updated and verified on production.
-- During this window the old column is ignored by new code
-- but keeps old code working as a safety net.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 12. CREATE trigger to auto-sync booking_type
--     Fires AFTER INSERT or DELETE on booking_partners.
--     INSERT → sets booking.booking_type = 'partnership'
--     DELETE → if no more partners remain, reverts to 'single'
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_booking_type()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    UPDATE public.bookings
    SET booking_type = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.booking_partners WHERE booking_id = OLD.booking_id
      ) THEN 'partnership'
      ELSE 'single'
    END
    WHERE id = OLD.booking_id;
    RETURN OLD;
  ELSE
    UPDATE public.bookings
      SET booking_type = 'partnership'
      WHERE id = NEW.booking_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE TRIGGER on_booking_partner_change
  AFTER INSERT OR DELETE ON public.booking_partners
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_type();

-- ────────────────────────────────────────────────────────────
-- 13. ADD missing performance indexes
-- ────────────────────────────────────────────────────────────

-- plots
CREATE INDEX IF NOT EXISTS idx_plots_project_id
  ON public.plots(project_id);
CREATE INDEX IF NOT EXISTS idx_plots_status
  ON public.plots(status);

-- bookings
CREATE INDEX IF NOT EXISTS idx_bookings_plot_id
  ON public.bookings(plot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id
  ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings(status);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_entity_id
  ON public.payments(entity_id);

-- booking_partners
CREATE INDEX IF NOT EXISTS idx_booking_partners_client
  ON public.booking_partners(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_partners_booking
  ON public.booking_partners(booking_id);

COMMIT;

-- ============================================================
-- POST-PHASE-2 CLEANUP (run AFTER all code is deployed + verified)
-- DO NOT run this now. Keep partner_client_id alive during transition.
-- ============================================================
-- ALTER TABLE public.bookings DROP COLUMN IF EXISTS partner_client_id;
-- ============================================================
