-- ============================================================
-- MIGRATION: Review-Based Change Approval System
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create the pending_changes table
CREATE TABLE IF NOT EXISTS public.pending_changes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who submitted it
  submitted_by    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- What entity is being changed
  entity_type     TEXT NOT NULL,  -- 'client' | 'consultant' | 'booking' | 'payment' | 'expense' | 'plot'
  entity_id       UUID,           -- NULL for new record creations
  
  -- The operation
  operation       TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  
  -- The actual data payload (new values for create/update, empty for delete)
  payload         JSONB NOT NULL DEFAULT '{}',
  
  -- Human-readable summary for the admin review panel
  description     TEXT NOT NULL,

  -- Review status
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES auth.users(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT
);

-- 2. Index for fast admin queries (pending items first)
CREATE INDEX IF NOT EXISTS idx_pending_changes_status     ON public.pending_changes(status);
CREATE INDEX IF NOT EXISTS idx_pending_changes_submitted  ON public.pending_changes(submitted_by);
CREATE INDEX IF NOT EXISTS idx_pending_changes_entity     ON public.pending_changes(entity_type, entity_id);

-- 3. RLS Policies
ALTER TABLE public.pending_changes ENABLE ROW LEVEL SECURITY;

-- Employees: can insert their own, can read their own
CREATE POLICY "employees_insert_own_changes"
  ON public.pending_changes FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "employees_read_own_changes"
  ON public.pending_changes FOR SELECT
  USING (
    auth.uid() = submitted_by
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
    )
  );

-- Admins: can read all, can update (approve/reject)
CREATE POLICY "admins_update_changes"
  ON public.pending_changes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'master_admin')
    )
  );

-- 4. Helper function: get pending count (used by sidebar badge)
CREATE OR REPLACE FUNCTION public.get_pending_changes_count()
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM public.pending_changes WHERE status = 'pending';
$$;

-- 5. Helper function: notify master_admin via Supabase realtime
--    (The Next.js app subscribes to this channel)
CREATE OR REPLACE FUNCTION public.notify_pending_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  PERFORM pg_notify(
    'pending_change',
    json_build_object(
      'id',          NEW.id,
      'entity_type', NEW.entity_type,
      'operation',   NEW.operation,
      'description', NEW.description
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pending_change_insert
  AFTER INSERT ON public.pending_changes
  FOR EACH ROW EXECUTE FUNCTION public.notify_pending_change();
