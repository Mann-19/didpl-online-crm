-- =============================================================================
-- Migration: v304 — Seed Workspace and Company Records
-- Phase 3, Script 1 of 3
--
-- Creates:
--   1. The "DIDP Group" workspace (the top-level tenant container)
--   2. The "DIDPL" parent company
--   3. The "DIDLLP" child company (linked to DIDPL as parent)
--
-- Uses ON CONFLICT DO NOTHING so this script is safe to re-run.
-- =============================================================================

BEGIN;

-- Step 1: Insert the workspace
INSERT INTO public.workspaces (name, slug, display_name, status, plan)
VALUES (
  'DIDP Group',
  'didp-group',
  'DIDP Group',
  'active',
  'standard'
)
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Insert DIDPL as the parent company
INSERT INTO public.companies (workspace_id, name, slug, display_name, company_type, status)
VALUES (
  (SELECT id FROM public.workspaces WHERE slug = 'didp-group'),
  'DIDPL',
  'didpl',
  'DIDP Land Private Limited',
  'parent',
  'active'
)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- Step 3: Insert DIDLLP as a child company under DIDPL
INSERT INTO public.companies (workspace_id, parent_id, name, slug, display_name, company_type, status)
VALUES (
  (SELECT id FROM public.workspaces WHERE slug = 'didp-group'),
  (SELECT id FROM public.companies WHERE slug = 'didpl'),
  'DIDLLP',
  'didllp',
  'DIDP Land LLP',
  'child',
  'active'
)
ON CONFLICT (workspace_id, slug) DO NOTHING;

-- =============================================================================
-- Verification — Run after COMMIT
-- =============================================================================
-- SELECT w.name AS workspace, c.name AS company, c.slug, c.company_type, c.status
-- FROM public.companies c
-- JOIN public.workspaces w ON w.id = c.workspace_id
-- ORDER BY c.company_type DESC, c.name;
--
-- Expected: 2 rows — DIDPL (parent) and DIDLLP (child)
-- Also check:
-- SELECT id, name, slug FROM public.workspaces;
-- Expected: 1 row — DIDP Group
-- =============================================================================

COMMIT;
