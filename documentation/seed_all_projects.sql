-- ============================================================
-- DIDP CRM — Full Project Seed (3 Projects)
-- Supabase PostgreSQL — UUID PKs
-- Run in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PROJECT 1: AeroTown Residency (127 plots @ ₹14,999/sq.yd)
-- ============================================================

INSERT INTO projects (project_code, name, location, description, total_plots, area_size, status, created_at)
VALUES (
  'ATC-001',
  'AeroTown Residency',
  'Aero Town City, Phase 1',
  'Premium residential plots in Aero Town City Phase 1. Well planned township near airport corridor.',
  127,
  63496,  -- approx total sq.yd (127 plots × ~500 sq.yd avg)
  'active',
  NOW()
)
ON CONFLICT (project_code) DO NOTHING;

-- Store the generated UUID for plots
DO $$
DECLARE
  proj_aero_id UUID;
  i INTEGER;
  plot_areas REAL[] := ARRAY[
    -- Row 1: Plots 1-12 (left of center)
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    -- Row 1: Plots 13-20 (right of center)
    500, 500, 500, 500, 500, 500, 500, 500,
    -- Row 3: Plots 21-46 (rows 3 left+right combined → 17+9=26)
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    500, 500, 500, 500, 500, 500, 500, 500, 500,
    -- Row 4: Plots 47-72 (14+11=25)
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    -- Row 6: Plots 73-95 (12+12=24, but actually 83-95 + 84-95... adjust)
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    -- Row 7: Plots 96-119 (9+14=23)
    500, 500, 500, 500, 500, 500, 500, 500, 500,
    500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
    -- Row 9: Plots 120-127 (3+6=9, minus overlap → adjust to 127 total)
    500, 500, 500, 500, 500, 500, 500
  ];
BEGIN
  SELECT id INTO proj_aero_id FROM projects WHERE project_code = 'ATC-001';

  -- Insert layout config
  INSERT INTO project_layouts (project_id, layout_type, layout_config, updated_at)
  VALUES (
    proj_aero_id,
    'custom',
    '{"type":"custom","rows":14,"columns":40,"totalPlots":127}'::jsonb,
    NOW()
  )
  ON CONFLICT (project_id) DO NOTHING;

  -- Insert all 127 plots
  FOR i IN 1..127 LOOP
    INSERT INTO plots (plot_code, plot_number, area_sqm, area_sqyd, price, price_per_unit, project_id, status, created_at)
    VALUES (
      'ATC-PLT-' || LPAD(i::TEXT, 3, '0'),
      i::TEXT,
      ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,
      500,
      ROUND((500 * 14999)::NUMERIC, 0)::REAL,
      14999,
      proj_aero_id,
      'available',
      NOW()
    )
    ON CONFLICT (plot_code) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- PROJECT 2: Dholera Homes 3 (319 plots @ ₹7,499/sq.yd)
-- ============================================================

INSERT INTO projects (project_code, name, location, description, total_plots, area_size, status, created_at)
VALUES (
  'DH3-001',
  'Dholera Homes 3',
  'Dholera Special Investment Region, Gujarat',
  'Residential plots in Dholera SIR — Indias first greenfield smart city. Phase 3.',
  319,
  159788,  -- approx (319 × ~500 sq.yd avg)
  'active',
  NOW()
)
ON CONFLICT (project_code) DO NOTHING;

DO $$
DECLARE
  proj_dh3_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO proj_dh3_id FROM projects WHERE project_code = 'DH3-001';

  INSERT INTO project_layouts (project_id, layout_type, layout_config, updated_at)
  VALUES (
    proj_dh3_id,
    'custom',
    '{"type":"custom","rows":34,"columns":40,"totalPlots":319}'::jsonb,
    NOW()
  )
  ON CONFLICT (project_id) DO NOTHING;

  -- 319 plots, padded plot_number format (e.g. '001', '002' ... '319')
  -- Area varies: most are ~500 sq.yd. Use 500 as default.
  FOR i IN 1..319 LOOP
    INSERT INTO plots (plot_code, plot_number, area_sqm, area_sqyd, price, price_per_unit, project_id, status, created_at)
    VALUES (
      'DH3-PLT-' || LPAD(i::TEXT, 3, '0'),
      LPAD(i::TEXT, 3, '0'),    -- DH3 uses padded plot numbers: '001', '002'...
      ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,
      500,
      ROUND((500 * 7499)::NUMERIC, 0)::REAL,
      7499,
      proj_dh3_id,
      'available',
      NOW()
    )
    ON CONFLICT (plot_code) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- PROJECT 3: Commercial Warehouse (25 plots @ ₹7,499/sq.yd)
-- ============================================================

INSERT INTO projects (project_code, name, location, description, total_plots, area_size, status, created_at)
VALUES (
  'CW-001',
  'Commercial Warehouse',
  'Industrial Area, Dholera SIR',
  'Commercial warehouse plots in Dholera Special Investment Region. Ideal for industrial use.',
  25,
  50000,  -- approx (25 × 2000 sq.yd avg for commercial)
  'active',
  NOW()
)
ON CONFLICT (project_code) DO NOTHING;

DO $$
DECLARE
  proj_cw_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO proj_cw_id FROM projects WHERE project_code = 'CW-001';

  INSERT INTO project_layouts (project_id, layout_type, layout_config, updated_at)
  VALUES (
    proj_cw_id,
    'custom',
    '{"type":"custom","rows":31,"columns":26,"totalPlots":25}'::jsonb,
    NOW()
  )
  ON CONFLICT (project_id) DO NOTHING;

  -- 25 commercial plots, all same size (2000 sq.yd each)
  FOR i IN 1..25 LOOP
    INSERT INTO plots (plot_code, plot_number, area_sqm, area_sqyd, price, price_per_unit, project_id, status, created_at)
    VALUES (
      'CW-PLT-' || LPAD(i::TEXT, 3, '0'),
      i::TEXT,
      ROUND((2000 * 0.836127)::NUMERIC, 2)::REAL,
      2000,
      ROUND((2000 * 7499)::NUMERIC, 0)::REAL,
      7499,
      proj_cw_id,
      'available',
      NOW()
    )
    ON CONFLICT (plot_code) DO NOTHING;
  END LOOP;
END $$;

-- ============================================================
-- VERIFY: Check what was inserted
-- ============================================================
SELECT
  p.project_code,
  p.name,
  p.location,
  p.total_plots,
  COUNT(pl.id) AS plots_in_db
FROM projects p
LEFT JOIN plots pl ON pl.project_id = p.id
GROUP BY p.id, p.project_code, p.name, p.location, p.total_plots
ORDER BY p.created_at;
