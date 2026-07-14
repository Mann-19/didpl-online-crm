-- =============================================================================
-- Migration: v308 — Add Aerotown Company + company_id on payments
-- Phase 3.5
--
-- Part A: Inserts Aerotown as a peer (root-level) company alongside DIDPL.
--         Aerotown is NOT a child of DIDPL — it has its own bank account
--         and is a separate business entity in the same workspace.
--
-- Part B: Adds company_id to the payments table so individual payment
--         records can be tagged to a specific company/bank account.
--         This is the column that powers the "company" dropdown in the
--         payment creation modal.
--
-- company_id on payments is NULLABLE intentionally:
--   - Existing payments have no company context → remain NULL
--   - All new payments created via the modal will always set this value
--   - Reports treat NULL as "unassigned" (can be bulk-updated later if needed)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Part A: Insert Aerotown as a peer company
-- -----------------------------------------------------------------------------

INSERT INTO public.companies (workspace_id, parent_id, name, slug, display_name, company_type, status)
VALUES (
  (SELECT id FROM public.workspaces WHERE slug = 'didp-group'),
  NULL,                          -- No parent — peer company, not a subsidiary
  'Aerotown',
  'aerotown',
  'AeroTown Realty',
  'parent',
  'active'
)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Part B: Add company_id to payments
-- -----------------------------------------------------------------------------

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Index for fast company-scoped financial queries
CREATE INDEX IF NOT EXISTS idx_payments_company
  ON public.payments(company_id);

-- =============================================================================
-- Verification — Run after COMMIT
-- =============================================================================
-- 1. Confirm all 3 companies exist:
-- SELECT name, slug, company_type, status
-- FROM public.companies
-- ORDER BY name;
-- Expected: Aerotown, DIDLLP, DIDPL — 3 rows.
--
-- 2. Confirm payments.company_id column exists:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'payments'
--   AND column_name = 'company_id';
-- Expected: 1 row, is_nullable = YES.
-- =============================================================================

COMMIT;
