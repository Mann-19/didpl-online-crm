-- ============================================================
-- Fix: AeroTown Logistic Park — Add plot 26 + correct all plot data
-- Project code: AELP-001  |  Name: AeroTown Logistic Park
-- Run in Supabase SQL Editor
-- ============================================================

-- Step 1: Add the missing 26th plot
INSERT INTO plots (plot_code, plot_number, area_sqm, area_sqyd, price, price_per_unit, project_id, status, created_at)
SELECT
  'AELP-PLT-026',
  '26',
  ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,  -- 418.06 sq.m
  500,
  3749500,   -- 500 sq.yd × ₹7,499
  7499,
  id,
  'available',
  NOW()
FROM projects WHERE project_code = 'AELP-001'
ON CONFLICT (plot_code) DO NOTHING;

-- Step 2: Correct all existing plots to 500 sq.yd @ ₹7,499
UPDATE plots
SET
  area_sqm       = ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,
  area_sqyd      = 500,
  price          = 3749500,
  price_per_unit = 7499
WHERE project_id = (SELECT id FROM projects WHERE project_code = 'AELP-001');

-- Step 3: Fix layout config
UPDATE project_layouts
SET layout_config = '{"type":"custom","rows":6,"columns":5,"totalPlots":26}'::jsonb
WHERE project_id = (SELECT id FROM projects WHERE project_code = 'AELP-001');

-- Step 4: Verify
SELECT
  p.project_code,
  p.name,
  p.total_plots,
  p.area_size,
  COUNT(pl.id) AS plots_in_db
FROM projects p
LEFT JOIN plots pl ON pl.project_id = p.id
WHERE p.project_code = 'AELP-001'
GROUP BY p.project_code, p.name, p.total_plots, p.area_size;
