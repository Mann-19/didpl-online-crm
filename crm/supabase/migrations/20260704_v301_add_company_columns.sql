-- =============================================================================
-- Migration: v301 — Add company_id / workspace_id to Existing Tables
-- Phase 2, Script 2 of 4
--
-- Purely additive. All new columns are nullable — no existing rows are broken.
-- NOT NULL enforcement happens AFTER the data backfill in Migration v304.
--
-- Uses ADD COLUMN IF NOT EXISTS throughout so this script is safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- profiles
-- Add workspace_id (link to workspace) and updated_at (for audit trail)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS workspace_id  UUID        REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- projects
-- -----------------------------------------------------------------------------

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS company_id  UUID  REFERENCES public.companies(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_id  UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- consultants
-- -----------------------------------------------------------------------------

ALTER TABLE public.consultants
  ADD COLUMN IF NOT EXISTS company_id  UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- employees
-- -----------------------------------------------------------------------------

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS company_id  UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- investors
-- -----------------------------------------------------------------------------

ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS company_id  UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- investments
-- -----------------------------------------------------------------------------

ALTER TABLE public.investments
  ADD COLUMN IF NOT EXISTS company_id  UUID  REFERENCES public.companies(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- expenses
-- -----------------------------------------------------------------------------

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS company_id  UUID        REFERENCES public.companies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- -----------------------------------------------------------------------------
-- pending_changes
-- -----------------------------------------------------------------------------

ALTER TABLE public.pending_changes
  ADD COLUMN IF NOT EXISTS company_id  UUID  REFERENCES public.companies(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- bookings
-- -----------------------------------------------------------------------------

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT NOW();

-- =============================================================================
-- updated_at Triggers
-- Attaches the handle_updated_at() function (created in v300) to every table
-- that received an updated_at column in this migration.
-- Uses CREATE OR REPLACE so safe to re-run.
-- =============================================================================

CREATE OR REPLACE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER consultants_updated_at
  BEFORE UPDATE ON public.consultants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER investors_updated_at
  BEFORE UPDATE ON public.investors
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Verification
-- Run after COMMIT to confirm all columns were added.
-- =============================================================================
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name IN ('company_id', 'workspace_id', 'updated_at')
--   AND table_name IN (
--     'profiles','projects','clients','consultants',
--     'employees','investors','investments',
--     'expenses','pending_changes','bookings'
--   )
-- ORDER BY table_name, column_name;
--
-- Expected: company_id on 8 tables, workspace_id on profiles,
--           updated_at on 7 tables. All is_nullable = YES.
-- =============================================================================

COMMIT;
