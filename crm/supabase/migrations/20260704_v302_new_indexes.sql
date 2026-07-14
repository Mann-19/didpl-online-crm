-- =============================================================================
-- Migration: v302 — Performance Indexes
-- Phase 2, Script 3 of 4
--
-- Adds indexes to foreign keys and commonly sorted columns to prevent
-- sequential scans, especially important now that queries will be scoped
-- by company_id across all tables.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. New Tenant Tables Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_workspace_members_user
  ON public.workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_company_members_user
  ON public.company_members(user_id);

CREATE INDEX IF NOT EXISTS idx_company_members_company
  ON public.company_members(company_id);

CREATE INDEX IF NOT EXISTS idx_companies_workspace
  ON public.companies(workspace_id);

CREATE INDEX IF NOT EXISTS idx_companies_parent
  ON public.companies(parent_id);

CREATE INDEX IF NOT EXISTS idx_company_perm_overrides_company
  ON public.company_permission_overrides(company_id);

CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_user_company
  ON public.user_permission_overrides(user_id, company_id);

-- -----------------------------------------------------------------------------
-- 2. Foreign Key Indexes for Existing Tables (company_id scoping)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_projects_company
  ON public.projects(company_id);

CREATE INDEX IF NOT EXISTS idx_clients_company
  ON public.clients(company_id);

CREATE INDEX IF NOT EXISTS idx_expenses_company
  ON public.expenses(company_id);

CREATE INDEX IF NOT EXISTS idx_investors_company
  ON public.investors(company_id);

CREATE INDEX IF NOT EXISTS idx_pending_changes_company
  ON public.pending_changes(company_id);

-- -----------------------------------------------------------------------------
-- 3. Common Sort & Date Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_payments_payment_date
  ON public.payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_clients_created_at
  ON public.clients(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_date
  ON public.bookings(booking_date DESC);

-- =============================================================================
-- Verification
-- Run after COMMIT to confirm indexes exist.
-- =============================================================================
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND indexname IN (
--     'idx_workspace_members_user', 'idx_company_members_user',
--     'idx_company_members_company', 'idx_companies_workspace',
--     'idx_companies_parent', 'idx_company_perm_overrides_company',
--     'idx_user_perm_overrides_user_company', 'idx_projects_company',
--     'idx_clients_company', 'idx_expenses_company', 'idx_investors_company',
--     'idx_pending_changes_company', 'idx_payments_payment_date',
--     'idx_clients_created_at', 'idx_bookings_booking_date'
--   )
-- ORDER BY indexname;
--
-- Expected: 15 rows returned.
-- =============================================================================

COMMIT;
