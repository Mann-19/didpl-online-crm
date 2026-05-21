-- ============================================================
-- Migration: Add master_admin to role_enum
-- Date: 2026-05-21
-- Description:
--   1. Adds 'master_admin' to the role_enum type
--   2. Updates the is_admin() helper function so that
--      master_admin users pass all existing RLS policies
--      that currently check for 'admin' role
--   3. Updates the admins_update_changes and
--      employees_read_own_changes policies to also allow
--      master_admin to approve/view change requests
-- ============================================================

-- Step 1: Add master_admin to the enum
ALTER TYPE "public"."role_enum" ADD VALUE IF NOT EXISTS 'master_admin';

-- Step 2: Update is_admin() so master_admin passes RLS policies
CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'master_admin')
  );
$$;

-- Step 3: Update the admins_update_changes policy to also allow master_admin
DROP POLICY IF EXISTS "admins_update_changes" ON "public"."pending_changes";
CREATE POLICY "admins_update_changes" ON "public"."pending_changes"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin'::public.role_enum, 'master_admin'::public.role_enum)
    )
  );

-- Step 4: Update employees_read_own_changes to also allow master_admin to view all changes
DROP POLICY IF EXISTS "employees_read_own_changes" ON "public"."pending_changes";
CREATE POLICY "employees_read_own_changes" ON "public"."pending_changes"
  FOR SELECT USING (
    (auth.uid() = submitted_by)
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin'::public.role_enum, 'master_admin'::public.role_enum)
    )
  );
