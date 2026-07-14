-- =============================================================================
-- Migration: v307 — Permission Resolution Functions
-- Phase 4, Script 1 of 1
--
-- Creates two PostgreSQL functions:
--   1. resolve_permission() — evaluates a user's effective access for one key
--   2. set_company_context() — writes company UUID to local transaction config
--
-- Resolution order (highest priority last wins... actually first match in order wins):
--   1. User override   (user_permission_overrides) — checks expires_at
--   2. Company override (company_permission_overrides) — for the user's role
--   3. Default grant   (permissions table) — by role column
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. resolve_permission(user_id, company_id, permission_key)
--    Returns TRUE/FALSE for whether the user has the permission.
--    SECURITY DEFINER so it can read the permission tables without exposing them.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_permission(
  p_user_id       UUID,
  p_company_id    UUID,
  p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role          public.role_enum;
  v_granted       BOOLEAN;
BEGIN
  -- Step 1: Get the user's role within this company
  SELECT role INTO v_role
  FROM public.company_members
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND status = 'active';

  -- If user has no active membership in this company, deny
  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Step 2: Check user-level override (highest priority)
  SELECT granted INTO v_granted
  FROM public.user_permission_overrides
  WHERE user_id       = p_user_id
    AND company_id    = p_company_id
    AND permission_key = p_permission_key
    AND (expires_at IS NULL OR expires_at > NOW());

  IF FOUND THEN
    RETURN v_granted;
  END IF;

  -- Step 3: Check company-level override for this role
  SELECT granted INTO v_granted
  FROM public.company_permission_overrides
  WHERE company_id    = p_company_id
    AND permission_key = p_permission_key
    AND role           = v_role;

  IF FOUND THEN
    RETURN v_granted;
  END IF;

  -- Step 4: Fall back to the default grant in the permissions catalog
  SELECT
    CASE v_role
      WHEN 'master_admin' THEN master_admin
      WHEN 'admin'        THEN admin
      WHEN 'employee'     THEN employee
      WHEN 'client'       THEN client
      ELSE FALSE
    END
  INTO v_granted
  FROM public.permissions
  WHERE key = p_permission_key;

  -- If the permission key doesn't exist in the catalog, deny
  RETURN COALESCE(v_granted, FALSE);
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. set_company_context(company_id)
--    Writes the active company UUID into a transaction-local config variable.
--    Read back in RLS policies via current_setting('app.company_id', true).
--    This is called by the Supabase server client on each request.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_company_context(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.company_id', p_company_id::TEXT, true);
END;
$$;

-- Grant execute to the authenticated role
GRANT EXECUTE ON FUNCTION public.resolve_permission(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_company_context(UUID)            TO authenticated;

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
--   AND routine_name IN ('resolve_permission', 'set_company_context');
--
-- Expected: 2 rows.
-- =============================================================================

COMMIT;
