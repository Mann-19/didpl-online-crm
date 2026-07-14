-- =============================================================================
-- Migration: v305 — Backfill company_id on All Existing Tables
-- Phase 3, Script 2 of 3
--
-- Assigns every existing row to the DIDPL company and DIDP Group workspace
-- by looking up their IDs via slug. No UUIDs are hardcoded.
--
-- Also populates workspace_members and company_members for all existing users.
--
-- Run this ONLY after v304 has been confirmed (workspace + companies exist).
-- Verify the row counts in the VERIFICATION section before running v306.
-- =============================================================================

BEGIN;

-- =============================================================================
-- Part A: Backfill entity tables → DIDPL
-- All existing data belongs to DIDPL.
-- =============================================================================

UPDATE public.projects
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.clients
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.consultants
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.employees
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.investors
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.investments
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.expenses
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

UPDATE public.pending_changes
SET company_id = (SELECT id FROM public.companies WHERE slug = 'didpl')
WHERE company_id IS NULL;

-- =============================================================================
-- Part B: Backfill profiles.workspace_id → DIDP Group workspace
-- =============================================================================

UPDATE public.profiles
SET workspace_id = (SELECT id FROM public.workspaces WHERE slug = 'didp-group')
WHERE workspace_id IS NULL;

-- =============================================================================
-- Part C: Populate workspace_members
-- One record per existing user in profiles.
-- Role mapping:
--   master_admin → 'owner'
--   admin        → 'admin'
--   employee     → 'member'
--   client       → 'member'
-- =============================================================================

INSERT INTO public.workspace_members (workspace_id, user_id, workspace_role, status)
SELECT
  (SELECT id FROM public.workspaces WHERE slug = 'didp-group'),
  p.id,
  CASE p.role
    WHEN 'master_admin' THEN 'owner'
    WHEN 'admin'        THEN 'admin'
    ELSE                     'member'
  END,
  'active'
FROM public.profiles p
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- =============================================================================
-- Part D: Populate company_members
-- All existing users are assigned to DIDPL with their current role.
-- =============================================================================

INSERT INTO public.company_members (company_id, user_id, role, status)
SELECT
  (SELECT id FROM public.companies WHERE slug = 'didpl'),
  p.id,
  p.role,
  'active'
FROM public.profiles p
ON CONFLICT (company_id, user_id) DO NOTHING;

-- =============================================================================
-- VERIFICATION — Run these queries before running v306.
-- Every table below must show 0 rows with a NULL company_id / workspace_id.
-- =============================================================================

-- 1. Check for any NULLs remaining (should all return 0)
-- SELECT 'projects'       AS tbl, COUNT(*) AS null_count FROM public.projects       WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'clients',                COUNT(*)               FROM public.clients         WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'consultants',            COUNT(*)               FROM public.consultants     WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'employees',              COUNT(*)               FROM public.employees       WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'investors',              COUNT(*)               FROM public.investors       WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'investments',            COUNT(*)               FROM public.investments     WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'expenses',               COUNT(*)               FROM public.expenses        WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'pending_changes',        COUNT(*)               FROM public.pending_changes WHERE company_id IS NULL
-- UNION ALL
-- SELECT 'profiles (workspace_id)',COUNT(*)               FROM public.profiles        WHERE workspace_id IS NULL;
--
-- Expected: All rows show 0.
--
-- 2. Check member counts match
-- SELECT
--   (SELECT COUNT(*) FROM public.profiles)          AS total_profiles,
--   (SELECT COUNT(*) FROM public.workspace_members) AS workspace_members,
--   (SELECT COUNT(*) FROM public.company_members)   AS company_members;
--
-- Expected: All three numbers should be equal.
-- =============================================================================

COMMIT;
