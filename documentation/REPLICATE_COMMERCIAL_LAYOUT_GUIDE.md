# Guide: Replicate Commercial Warehouse Layout for Airport Estate Commercial

This guide provides the exact steps and data required to replicate the **Commercial Warehouse** (26-plot) interactive grid layout for the new **Airport Estate Commercial** project.

## 1. System Context

The CRM uses a dynamic layout renderer system. The frontend automatically picks the correct renderer based on the project name (case-insensitive substring match).

| Project Name | Renderer |
|---|---|
| `Commercial Warehouse` | `renderCommercialWarehouseLayout` |
| `Airport Estate Commercial` | `renderCommercialWarehouseLayout` (reused) |

The mapping is defined in `crm/app/(admin)/projects/[id]/layout/renderers/index.ts` and is **already in place** — no frontend changes needed.

### Layout Spec

| Property | Value |
|---|---|
| Grid | 6 rows × 5 columns |
| Total cells | 30 |
| Active plots | 26 (plots 1–26) |
| Empty placeholders | 4 (bottom-right cells) |
| Plot size | 500 sq.yd (418.06 sq.m) |
| Price per sq.yd | ₹7,499 |
| Total price per plot | ₹3,749,500 |

---

## 2. Database Seeding (PostgreSQL / Supabase)

> **Important:** The database uses auto-generated UUID primary keys. Do **not** specify `id` manually. Conflicts are resolved by `project_code` and `plot_code`.

### Option A — Use the Dedicated Seed File (Recommended)

Run the contents of `documentation/seed_airport_estate_commercial.sql` in your Supabase SQL Editor.

### Option B — Run the SQL Inline

```sql
-- Step 1: Insert the Airport Estate Commercial project
INSERT INTO projects (project_code, name, location, description, total_plots, area_size, status, created_at)
VALUES (
  'AEC-001',
  'Airport Estate Commercial',
  'Airport Estate',
  'Commercial plotting project with 26 plots of 500 sq.yd each. Exact replica of the Commercial Warehouse layout. Located at Airport Estate.',
  26,
  13000,   -- 26 plots × 500 sq.yd each
  'active',
  NOW()
)
ON CONFLICT (project_code) DO NOTHING;

-- Step 2: Insert layout config + all 26 plots
DO $$
DECLARE
  proj_aec_id UUID;
  i INTEGER;
BEGIN
  SELECT id INTO proj_aec_id FROM projects WHERE project_code = 'AEC-001';

  -- Layout configuration (tells the renderer the grid dimensions)
  INSERT INTO project_layouts (project_id, layout_type, layout_config, updated_at)
  VALUES (
    proj_aec_id,
    'custom',
    '{"type":"custom","rows":6,"columns":5,"totalPlots":26}'::jsonb,
    NOW()
  )
  ON CONFLICT (project_id) DO NOTHING;

  -- 26 plots: 500 sq.yd each @ ₹7,499/sq.yd = ₹3,749,500 total
  FOR i IN 1..26 LOOP
    INSERT INTO plots (plot_code, plot_number, area_sqm, area_sqyd, price, price_per_unit, project_id, status, created_at)
    VALUES (
      'AEC-PLT-' || LPAD(i::TEXT, 3, '0'),
      i::TEXT,
      ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,  -- 418.06 sq.m
      500,
      3749500,  -- 500 sq.yd × ₹7,499
      7499,
      proj_aec_id,
      'available',
      NOW()
    )
    ON CONFLICT (plot_code) DO NOTHING;
  END LOOP;
END $$;
```

---

## 3. Existing Commercial Warehouse Data Fix

> **⚠ Action Required (if already seeded):** The original `seed_all_projects.sql` incorrectly seeded Commercial Warehouse (CW-001) with **25 plots at 2,000 sq.yd**. The renderer expects **26 plots at 500 sq.yd**. Run this correction if CW-001 already exists in your database:

```sql
-- Correct the CW-001 project metadata
UPDATE projects
SET
  total_plots = 26,
  area_size = 13000,
  description = 'Commercial warehouse plots in Dholera Special Investment Region. 26 plots of 500 sq.yd each in a 6×5 interactive grid layout.'
WHERE project_code = 'CW-001';

-- Correct the layout config
UPDATE project_layouts
SET layout_config = '{"type":"custom","rows":6,"columns":5,"totalPlots":26}'::jsonb
WHERE project_id = (SELECT id FROM projects WHERE project_code = 'CW-001');

-- Add the 26th plot if missing (CW-PLT-026)
INSERT INTO plots (plot_code, plot_number, area_sqm, area_sqyd, price, price_per_unit, project_id, status, created_at)
SELECT
  'CW-PLT-026', '26',
  ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,
  500, 3749500, 7499,
  id, 'available', NOW()
FROM projects WHERE project_code = 'CW-001'
ON CONFLICT (plot_code) DO NOTHING;

-- Correct all existing CW plots to 500 sq.yd
UPDATE plots
SET
  area_sqm = ROUND((500 * 0.836127)::NUMERIC, 2)::REAL,
  area_sqyd = 500,
  price = 3749500,
  price_per_unit = 7499
WHERE project_id = (SELECT id FROM projects WHERE project_code = 'CW-001');
```

---

## 4. Frontend Renderer (Already Configured)

The mapping is already present in `index.ts`. No changes needed:

```typescript
// crm/app/(admin)/projects/[id]/layout/renderers/index.ts
const PROJECT_RENDERERS: Record<string, Function> = {
    // ...
    'commercial warehouse': renderCommercialWarehouseLayout,
    'airport estate commercial': renderCommercialWarehouseLayout,  // ✅ already mapped
    'commercial': renderCommercialWarehouseLayout,
};
```

The renderer (`CommercialWarehouseLayout.ts`) places plots 1–26 in a 6×5 grid. Cells 27–30 are rendered as grey placeholder tiles.

---

## 5. Verification Checklist

After running the seed script, verify the following:

- [ ] **Projects Page** `/projects` — New card **"Airport Estate Commercial"** appears
- [ ] **Stats** — Card shows **26 Total Lands**, **0 Confirmed**, **26 Available**
- [ ] **Interactive Layout** `/projects/<id>/layout` — 6×5 grid renders with plots 1–26 interactive and 4 grey placeholder cells in the bottom-right
- [ ] **Plot Hover** — Tooltip shows plot number; details bar shows `500 sq.yd` and `₹37,49,500`
- [ ] **Plot Click** — Navigates to `/projects/<id>/plot/<num>` correctly
- [ ] **Commercial Warehouse** — Also now shows 26 plots (if corrected)
