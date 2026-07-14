-- =============================================================================
-- Migration: v300 — Workspace & Company Core Tables
-- Phase 2, Script 1 of 4
--
-- Creates the foundational multi-tenant tables. All existing tables are
-- untouched. This migration is purely additive.
--
-- Run this in Supabase Dashboard > SQL Editor.
-- Verify row counts and table structure before running script 2.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. workspaces
--    Top-level tenant container. DIDP Group is the single workspace for now.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspaces (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT          NOT NULL,
  slug            TEXT          NOT NULL UNIQUE,
  display_name    TEXT,
  description     TEXT,
  logo_url        TEXT,
  status          TEXT          NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'suspended', 'archived')),
  plan            TEXT          NOT NULL DEFAULT 'standard'
                                CHECK (plan IN ('standard', 'professional', 'enterprise')),
  metadata        JSONB         DEFAULT '{}'::jsonb,
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.workspaces IS
  'Top-level tenant container. Each organisation (e.g. DIDP Group) owns one workspace.';

-- -----------------------------------------------------------------------------
-- 2. companies
--    Business entities within a workspace. Supports a one-level
--    parent -> child hierarchy (e.g. DIDPL -> DIDLLP).
--
--    NOTE: A future `company_project_access` join table will allow projects
--    to be shared across companies within the same workspace.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.companies (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_id       UUID          REFERENCES public.companies(id) ON DELETE SET NULL,
  name            TEXT          NOT NULL,
  slug            TEXT          NOT NULL,
  display_name    TEXT,
  description     TEXT,
  logo_url        TEXT,
  company_type    TEXT          NOT NULL DEFAULT 'parent'
                                CHECK (company_type IN ('parent', 'child')),
  status          TEXT          NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'inactive', 'archived')),
  primary_email   TEXT,
  primary_phone   TEXT,
  address         TEXT,
  metadata        JSONB         DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT companies_workspace_slug_unique UNIQUE (workspace_id, slug)
);

COMMENT ON TABLE public.companies IS
  'Business entities (companies) within a workspace. E.g. DIDPL and DIDLLP both live inside the DIDP Group workspace.';

COMMENT ON COLUMN public.companies.parent_id IS
  'If set, this company is a child/subsidiary of the referenced company. Only one level of nesting is supported.';

-- -----------------------------------------------------------------------------
-- 3. workspace_members
--    Links a user to a workspace with a workspace-level role.
--    A user belongs to exactly one workspace.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id    UUID          NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_role  TEXT          NOT NULL DEFAULT 'member'
                                CHECK (workspace_role IN ('owner', 'admin', 'member')),
  status          TEXT          NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'suspended', 'invited')),
  joined_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  invited_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  PRIMARY KEY (workspace_id, user_id)
);

COMMENT ON TABLE public.workspace_members IS
  'Maps users to their workspace. One record per user (a user belongs to exactly one workspace).';

-- -----------------------------------------------------------------------------
-- 4. company_members
--    Links a user to a specific company within their workspace,
--    with a company-level role (reusing the existing role_enum).
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_members (
  company_id      UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            public.role_enum NOT NULL DEFAULT 'employee',
  status          TEXT          NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active', 'suspended', 'inactive')),
  assigned_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  assigned_by     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  PRIMARY KEY (company_id, user_id)
);

COMMENT ON TABLE public.company_members IS
  'Maps users to a specific company with their role within that company. A user may be a member of multiple companies within the same workspace.';

-- -----------------------------------------------------------------------------
-- 5. permissions
--    Master catalog of all permission keys in the system.
--    Seeded by Migration 4. Not edited at runtime.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissions (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT          NOT NULL UNIQUE,
  name            TEXT          NOT NULL,
  description     TEXT,
  module          TEXT          NOT NULL,
  master_admin    BOOLEAN       NOT NULL DEFAULT true,
  admin           BOOLEAN       NOT NULL DEFAULT false,
  employee        BOOLEAN       NOT NULL DEFAULT false,
  client          BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.permissions IS
  'Master catalog of all permission keys. Seeded from lib/permissions/catalog.ts defaults. Read-only at runtime.';

-- -----------------------------------------------------------------------------
-- 6. company_permission_overrides
--    Allows overriding a default permission for an entire role within a company.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_permission_overrides (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_key  TEXT          NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  role            public.role_enum,
  granted         BOOLEAN       NOT NULL,
  reason          TEXT,
  set_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT company_perm_override_unique UNIQUE (company_id, permission_key, role)
);

COMMENT ON TABLE public.company_permission_overrides IS
  'Overrides the default role-level permission for a specific company. Overrides the permissions table defaults, but is itself overridden by user_permission_overrides.';

-- -----------------------------------------------------------------------------
-- 7. user_permission_overrides
--    Per-user permission overrides. Highest priority. Always requires a reason.
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID          NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  permission_key  TEXT          NOT NULL REFERENCES public.permissions(key) ON DELETE CASCADE,
  granted         BOOLEAN       NOT NULL,
  expires_at      TIMESTAMPTZ,
  reason          TEXT          NOT NULL,
  set_by          UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT user_perm_override_unique UNIQUE (user_id, company_id, permission_key)
);

COMMENT ON TABLE public.user_permission_overrides IS
  'Highest-priority permission overrides scoped to a specific user + company pair. Always requires a reason for audit purposes.';

-- =============================================================================
-- Row Level Security
-- Enabled on all 7 new tables immediately.
-- Temporary open read policies for now — tightened in Phase 8 (Migration v307).
-- =============================================================================

ALTER TABLE public.workspaces                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_permission_overrides  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_overrides    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "temp_workspaces_authenticated_read"
  ON public.workspaces FOR SELECT TO authenticated USING (true);

CREATE POLICY "temp_companies_authenticated_read"
  ON public.companies FOR SELECT TO authenticated USING (true);

CREATE POLICY "temp_workspace_members_authenticated_read"
  ON public.workspace_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "temp_company_members_authenticated_read"
  ON public.company_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "temp_permissions_authenticated_read"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "temp_company_perm_overrides_authenticated_read"
  ON public.company_permission_overrides FOR SELECT TO authenticated USING (true);

CREATE POLICY "temp_user_perm_overrides_authenticated_read"
  ON public.user_permission_overrides FOR SELECT TO authenticated USING (true);

-- =============================================================================
-- updated_at trigger function (reusable across all tables)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Verification (run manually after COMMIT to confirm)
-- =============================================================================
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN (
--       'workspaces','companies','workspace_members',
--       'company_members','permissions',
--       'company_permission_overrides','user_permission_overrides'
--     )
--   ORDER BY table_name;
-- Expected: 7 rows returned.
-- =============================================================================

COMMIT;
