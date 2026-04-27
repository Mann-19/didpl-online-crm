-- ============================================================
-- Re-enable Row Level Security (RLS) on all CRM tables
-- Run in Supabase SQL Editor
-- ============================================================

-- Core tables
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_layouts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Verify RLS status on all tables
-- ============================================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
