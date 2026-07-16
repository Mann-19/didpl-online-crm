-- =============================================================================
-- Migration: v309 — Set DEFAULT company_id to DIDPL on all constrained tables
--
-- Problem: v306 enforced NOT NULL on company_id across 8 tables, but the
--          application forms (Add Client, Add Employee, etc.) don't set
--          company_id yet — causing insert failures.
--
-- Fix: Create a stable helper function that returns DIDPL's company ID, then
--      set it as the column DEFAULT on all affected tables. New records will
--      silently belong to DIDPL until the UI gets company dropdowns.
--
-- Note: The NOT NULL constraint is intentionally kept — nulls are wrong.
--       The DEFAULT simply means "DIDPL" when no company is explicitly given.
-- =============================================================================

BEGIN;

-- Helper function: returns DIDPL's UUID at insert time (stable, not volatile)
CREATE OR REPLACE FUNCTION public.default_company_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT id FROM public.companies WHERE slug = 'didpl' LIMIT 1;
$$;

-- Set the DEFAULT on all tables that v306 made NOT NULL
ALTER TABLE public.clients         ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.consultants     ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.employees       ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.investors       ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.investments     ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.expenses        ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.projects        ALTER COLUMN company_id SET DEFAULT public.default_company_id();
ALTER TABLE public.pending_changes ALTER COLUMN company_id SET DEFAULT public.default_company_id();

-- =============================================================================
-- Verification — Run after COMMIT
-- =============================================================================
-- SELECT column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'clients'
--   AND column_name = 'company_id';
--
-- Expected: column_default = 'public.default_company_id()'
-- =============================================================================

COMMIT;
