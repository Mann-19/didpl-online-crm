-- =============================================================================
-- Migration: v306 — Enforce NOT NULL on company_id Columns
-- Phase 3, Script 3 of 3
--
-- Now that every existing row has been backfilled with a company_id (v305),
-- we lock down the schema so future inserts are NEVER allowed without one.
--
-- IMPORTANT: Only run this after confirming all NULL checks from v305
-- returned 0. If any table still has NULLs, this migration will fail.
--
-- Note: profiles.workspace_id is intentionally left nullable for now.
-- New users created via Supabase Auth won't have a workspace assigned
-- at signup time — the application layer handles that assignment.
-- =============================================================================

BEGIN;

ALTER TABLE public.projects        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.clients         ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.consultants     ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.employees       ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.investors       ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.investments     ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.expenses        ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.pending_changes ALTER COLUMN company_id SET NOT NULL;

-- =============================================================================
-- Verification — Run after COMMIT to confirm constraints are in place
-- =============================================================================
-- SELECT table_name, column_name, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name = 'company_id'
--   AND table_name IN (
--     'projects','clients','consultants','employees',
--     'investors','investments','expenses','pending_changes'
--   )
-- ORDER BY table_name;
--
-- Expected: All 8 rows show is_nullable = NO
-- =============================================================================

COMMIT;
