# DIDP CRM — Project Data Context Guide
## For AI Agents: Adding New Projects, Plots & Interactive Layouts

This document is a complete, self-contained reference for adding new real estate projects to the **online Next.js + Supabase CRM**. It covers the full stack: database seeding, layout renderer creation, and registry updates.

---

## 1. Current State of the System

### Live Projects in the Database

| Project ID | Project Code | Name | Plots | Location | Plot Price/SqYd |
|---|---|---|---|---|---|
| `proj_aero_town_city_001` | `ATC-001` | AeroTown Residency | 127 | Aero Town City, Phase 1 | ₹14,999 |
| `proj_dholera_homes_3_001` | `DH3-001` | Dholera Homes 3 | 319 | Dholera | ₹7,499 |
| `proj_com_warehouse_001` | `CW-001` | Commercial Warehouse | 25 | Industrial Area | ₹7,499 |

### Layout Renderers Available

| Project Name (Matched via `includes()`) | Renderer File |
|---|---|
| `aerotown` | `AerotownLayout.js` |
| `dholera homes 3` | `DholeraHomes3Layout.js` |
| `commercial warehouse` | `CommercialWarehouseLayout.js` |

---

## 2. Architecture Overview

### How Projects Appear in the UI

1. **`/projects` page** — Lists all projects from Supabase. Fetches `GET /projects` then `GET /plots/project/:id` for each.
2. **`/projects/:id` page** — Overview: financials, area, status breakdown, recent activity.
3. **`/projects/:id/layout` page** — **Interactive grid map** showing every plot as a colored cell.
4. **`/projects/:id/list` page** — Paginated table of all plots.
5. **`/projects/:id/plot/:plotNumber` page** — Individual plot detail + booking info.

### Data Flow for the Layout Map

```
Layout page loads
  → api.get(`/projects/${projectId}`)  → gets project name
  → api.get(`/plots/project/${projectId}`)  → gets all plots with status + payment info
  → getLayoutRenderer(projectName)  → picks the right renderer function
  → renderer({ grid, dataMap, utils })  → draws the interactive SVG/DOM grid
```

The `dataMap` is a dictionary keyed by `plot_number` (string AND numeric):
```js
// Both work for lookup:
dataMap["001"]    // padded string
dataMap[1]        // numeric
dataMap["1"]      // plain string
```

---

## 3. Database Schema (Supabase PostgreSQL)

### `projects` table

```sql
CREATE TABLE projects (
  id            TEXT PRIMARY KEY,          -- e.g. 'proj_green_valley_001'
  project_code  TEXT,                      -- e.g. 'GV-001'
  name          TEXT NOT NULL,             -- e.g. 'Green Valley Residency'
  location      TEXT,
  description   TEXT,
  total_plots   INTEGER,
  area_size     NUMERIC,                   -- total area in sq.m or sq.yd (legacy, use plots aggregate)
  status        TEXT DEFAULT 'active',     -- 'active' | 'completed' | 'inactive'
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### `project_layouts` table

```sql
CREATE TABLE project_layouts (
  id            TEXT PRIMARY KEY,          -- e.g. 'layout_green_valley_001'
  project_id    TEXT REFERENCES projects(id),
  layout_type   TEXT DEFAULT 'custom',
  layout_config JSONB,                     -- Grid metadata, e.g. {"type":"custom","rows":10,"columns":10,"totalPlots":95}
  updated_at    TIMESTAMP DEFAULT NOW()
);
```

### `plots` table

```sql
CREATE TABLE plots (
  id              TEXT PRIMARY KEY,        -- e.g. 'plot_gv_001'
  plot_code       TEXT,                    -- e.g. 'GV-PLT-001'
  plot_number     TEXT,                    -- e.g. '1', '2', ... (used as display number in layout)
  area_sqm        NUMERIC,
  area_sqyd       NUMERIC,                 -- PRIMARY unit used in UI (sq. yards)
  length          NUMERIC,
  width           NUMERIC,
  price           NUMERIC,                 -- List price (used when no booking exists)
  price_per_unit  NUMERIC,                 -- Price per sq.yd
  project_id      TEXT REFERENCES projects(id),
  client_id       TEXT,                    -- NULL if available
  status          TEXT DEFAULT 'available', -- 'available' | 'token_paid' | 'partially_paid' | 'sold'
  created_at      TIMESTAMP DEFAULT NOW()
);
```

### Key Virtual Fields from API

When the API returns plots (via `GET /plots/project/:id`), the backend joins booking + payment data:
- `total_amount` — Agreed deal price (from active/confirmed booking)
- `discount_amount` — Discount applied to deal
- `amount_paid` — Total payments received
- `confirmed_client_name` — Client name from confirmed booking

---

## 4. Supabase Seed SQL Format (PostgreSQL)

**IMPORTANT**: The existing seed file uses SQLite `INSERT OR IGNORE` syntax. For Supabase, use:

```sql
INSERT INTO projects (id, project_code, name, location, description, total_plots, area_size, status, created_at)
VALUES (...)
ON CONFLICT (id) DO NOTHING;
```

### Template for a New Project

```sql
-- 1. Project record
INSERT INTO projects (id, project_code, name, location, description, total_plots, area_size, status, created_at)
VALUES (
  'proj_green_valley_001',
  'GV-001',
  'Green Valley Residency',
  'Vadodara Ring Road, Gujarat',
  'Premium residential plots. Start: 2025-01-01',
  95,
  40000,           -- approximate total area in sq.yd
  'active',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Layout config (for the grid renderer to know its dimensions)
INSERT INTO project_layouts (id, project_id, layout_type, layout_config, updated_at)
VALUES (
  'layout_green_valley_001',
  'proj_green_valley_001',
  'custom',
  '{"type":"custom","rows":10,"columns":10,"totalPlots":95}',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Plots (repeat for each plot)
INSERT INTO plots (id, plot_code, plot_number, area_sqm, area_sqyd, length, width, price, price_per_unit, project_id, client_id, status, created_at)
VALUES (
  'plot_gv_001',
  'GV-PLT-001',
  '1',
  418.06,          -- area in sq.m (area_sqyd * 0.836127)
  500,             -- area in sq.yd
  NULL,            -- length (optional)
  NULL,            -- width (optional)
  3749500,         -- price = area_sqyd * price_per_unit
  7499,            -- price per sq.yd
  'proj_green_valley_001',
  NULL,
  'available',
  NOW()
) ON CONFLICT (id) DO NOTHING;
```

### Naming Conventions

| Field | Pattern | Example |
|---|---|---|
| `projects.id` | `proj_{slug}_{seq}` | `proj_green_valley_001` |
| `project_layouts.id` | `layout_{slug}_{seq}` | `layout_green_valley_001` |
| `plots.id` | `plot_{prefix}_{NNN}` | `plot_gv_001` |
| `plots.plot_code` | `{CODE}-PLT-{NNN}` | `GV-PLT-001` |
| `plots.plot_number` | `'1'`, `'2'` ... | Plain integers as strings |

---

## 5. Interactive Layout Renderer System

### How It Works

The layout page (`/projects/:id/layout/page.js`) uses a **DOM-based CSS Grid renderer**. Each plot is a `<div>` positioned via `grid-row` / `grid-column`. The layout is drawn by a JavaScript function specific to each project.

### File Structure

```
src/app/projects/[id]/layout/
├── page.js                ← Main layout page (do NOT modify)
└── renderers/
    ├── index.js           ← Registry — maps project names → renderer functions
    ├── AerotownLayout.js
    ├── DholeraHomes3Layout.js
    └── CommercialWarehouseLayout.js
```

### Step 1: Create a New Renderer File

Create: `src/app/projects/[id]/layout/renderers/GreenValleyLayout.js`

```js
export function renderGreenValleyLayout({ grid, dataMap, utils }) {
    const { placePlot, placeCell } = utils;

    // STEP A: Define grid dimensions
    // - gridTemplateColumns: how many columns total (including roads)
    // - gridTemplateRows: how many rows total (including roads)
    // - aspectRatio: cols / rows → controls visual shape
    grid.style.gridTemplateColumns = "repeat(22, 1fr)";
    grid.style.gridTemplateRows = "repeat(12, 1fr)";
    grid.style.aspectRatio = "22 / 12";

    // STEP B: Roads (use placeCell)
    // placeCell({ row, col, span, className, label })
    // className options: "h-road" | "vertical-road" | "h-road wide-road" | "bushes" | "garden" | "common-plot"

    // Top horizontal road
    placeCell({ row: 1, col: 1, span: 22, className: "h-road", label: "12.0 M MAIN ROAD" });

    // Bottom road
    placeCell({ row: 12, col: 1, span: 22, className: "h-road", label: "7.5 M ROAD" });

    // Middle road (row 6)
    placeCell({ row: 6, col: 1, span: 22, className: "h-road", label: "7.5 M ROAD" });

    // Vertical road example
    const vRoad = document.createElement("div");
    vRoad.className = "vertical-road";
    vRoad.innerHTML = `<span>7.5 M ROAD</span>`;
    vRoad.style.gridColumn = "11 / 12";
    vRoad.style.gridRow = "2 / 6";
    grid.appendChild(vRoad);

    // STEP C: Place plots using placePlot
    // placePlot(plotNumber, row, col, dataMap[plotNumber], rowSpan?, colSpan?)
    // plotNumber = the number shown on the cell (should match plots.plot_number in DB)

    // Row 2: plots 1-10 on left side
    for (let i = 0; i < 10; i++) {
        placePlot(i + 1, 2, i + 1, dataMap[i + 1]);
    }

    // Row 2: plots 11-20 on right side  
    for (let i = 0; i < 10; i++) {
        placePlot(i + 11, 2, i + 12, dataMap[i + 11]);
    }

    // Row 3-5: more plots...
    // (continue pattern based on actual layout map)

    // STEP D: Special elements
    placeCell({ row: 7, col: 1, span: 5, className: "bushes", label: "PARK" });
    placeCell({ row: 7, col: 18, span: 5, className: "garden", label: "GARDEN" });
}
```

### Step 2: Register in `index.js`

Open `src/app/projects/[id]/layout/renderers/index.js` and add:

```js
import { renderAerotownLayout } from "./AerotownLayout";
import { renderDholeraHomes3Layout } from "./DholeraHomes3Layout";
import { renderCommercialWarehouseLayout } from "./CommercialWarehouseLayout";
import { renderGreenValleyLayout } from "./GreenValleyLayout";  // ← ADD THIS

const PROJECT_RENDERERS = {
    'dholera homes 3': renderDholeraHomes3Layout,
    'dholera-homes-3': renderDholeraHomes3Layout,
    'aerotown': renderAerotownLayout,
    'commercial warehouse': renderCommercialWarehouseLayout,
    'airport estate commercial': renderCommercialWarehouseLayout,
    'commercial': renderCommercialWarehouseLayout,
    'green valley': renderGreenValleyLayout,     // ← ADD THIS (lowercase of project name)
};

export function getLayoutRenderer(projectName) {
    if (!projectName) return renderAerotownLayout;
    const normalizedName = projectName.toLowerCase();
    for (const [key, renderer] of Object.entries(PROJECT_RENDERERS)) {
        if (normalizedName.includes(key)) {
            return renderer;
        }
    }
    return renderAerotownLayout; // Default fallback
}
```

> **Critical**: The key in `PROJECT_RENDERERS` must be a **lowercase substring** of the project's `name` field in the database. The matching uses `includes()`.

---

## 6. Renderer API Reference

### `placePlot(plotNumber, row, col, plotData, rowSpan?, colSpan?)`

Places an interactive plot cell on the grid.

| Param | Type | Description |
|---|---|---|
| `plotNumber` | `number \| string` | Plot number (shown on cell, used for click routing) |
| `row` | `number` | CSS grid row (1-indexed) |
| `col` | `number` | CSS grid column (1-indexed) |
| `plotData` | `object \| undefined` | Data from `dataMap[plotNumber]`. If `undefined`, cell shows as available (white) |
| `rowSpan` | `number` | Optional, default 1 |
| `colSpan` | `number` | Optional, default 1 |

**Click behavior**: Clicking a plot navigates to `/projects/:projectId/plot/:plotNumber`

**Hover behavior**: Shows tooltip + details bar (area, price, client, payment %)

### `placeCell({ row, col, span, className, label })`

Places a non-interactive decorative cell (road, park, etc.).

| Param | Type | Description |
|---|---|---|
| `row` | `number` | CSS grid row |
| `col` | `number` | CSS grid column |
| `span` | `number` | How many columns it spans |
| `className` | `string` | CSS class(es) — see below |
| `label` | `string` | Text to display inside |

**Available CSS classes for cells:**

| Class | Appearance | Use For |
|---|---|---|
| `h-road` | Light grey dashed | Horizontal roads |
| `vertical-road` | Grey dashed, rotated text | Vertical roads |
| `h-road wide-road` | Darker grey dashed | Main/wide roads |
| `bushes` | Bright green | Parks |
| `garden` | Medium green | Garden areas |
| `common-plot` | Green | Common plots / amenity areas |

### Plot Status Colors

| Status (DB value) | Color Class | Visual |
|---|---|---|
| `available` | `status-available` | White border, green outline |
| `token_paid` | `status-token` | Yellow tint |
| `partially_paid` | `status-partial` | Orange tint |
| `sold` | `status-sold` | Red/rose tint |

---

## 7. Plot Number Lookup — Critical Notes

The `dataMap` is built with THREE keys for every plot:
1. **String as-is**: `dataMap["1"]` → for `plot_number = '1'`
2. **Numeric**: `dataMap[1]`
3. **Zero-padded**: `dataMap["001"]`

When calling `placePlot()`, always use the **plain integer** as `plotNumber` (e.g., `1`, not `"001"`).

For projects using padded numbers in the DB (like DH3 which has `plot_dh3_001` → `plot_number = '1'`), use the `padPlotNumber` helper:
```js
const padPlotNumber = (num) => String(num).padStart(3, '0');
// Then: dataMap[padPlotNumber(1)] → dataMap["001"]
```

---

## 8. Grid Layout Design Guide

### Choosing Grid Dimensions

Your grid is defined by two numbers: **columns × rows**. Think of these as a spreadsheet:

```
grid.style.gridTemplateColumns = "repeat(22, 1fr)";  // 22 columns
grid.style.gridTemplateRows    = "repeat(12, 1fr)";  // 12 rows
grid.style.aspectRatio         = "22 / 12";          // width:height ratio
```

**Rule of thumb:**
- Count all columns needed: plots + internal roads + borders
- Count all rows needed: horizontal roads + plot rows

### Typical Layout Pattern

```
Row 1:  [MAIN ROAD spanning full width]
Row 2:  [Plot][Plot][Plot] ... [VRoad] ... [Plot][Plot][Plot]
Row 3:  [Plot][Plot][Plot] ... [VRoad] ... [Plot][Plot][Plot]
Row 4:  [MID ROAD spanning full width]
Row 5:  [Plot][Plot][Plot] ... [VRoad] ... [Plot][Plot][Plot]
Row 6:  [Plot][Plot][Plot] ... [VRoad] ... [Plot][Plot][Plot]
Row 7:  [BOTTOM ROAD spanning full width]
```

### Example: Simple 5×4 Grid with Center Road

```js
grid.style.gridTemplateColumns = "repeat(11, 1fr)"; // 5+road+5 = 11
grid.style.gridTemplateRows = "repeat(6, 1fr)";     // road+2+road+2+road = 6
grid.style.aspectRatio = "11 / 6";

placeCell({ row: 1, col: 1, span: 11, className: "h-road", label: "MAIN ROAD" });
// Left block: plots 1-10
for (let i = 0; i < 5; i++) placePlot(i + 1, 2, i + 1, dataMap[i + 1]);  // row 2
for (let i = 0; i < 5; i++) placePlot(i + 6, 3, i + 1, dataMap[i + 6]);  // row 3

placeCell({ row: 4, col: 1, span: 11, className: "h-road", label: "INTERNAL ROAD" });

// Center vertical road
const vr = document.createElement("div");
vr.className = "vertical-road"; vr.innerHTML = `<span>ROAD</span>`;
vr.style.gridColumn = "6 / 7"; vr.style.gridRow = "2 / 4";
grid.appendChild(vr);
```

---

## 9. Adding a New Project — Complete Checklist

For each new project, complete these steps:

### Step 1: Prepare the Data

- [ ] Collect: project name, location, total plots, price per sq.yd, area per plot (in sq.yd)
- [ ] Assign a unique ID slug (lowercase-hyphenated): e.g., `sunrise-meadows`
- [ ] Assign a project code: e.g., `SM-001`
- [ ] Get the physical layout map (how plots are arranged geographically)

### Step 2: Generate Supabase SQL

- [ ] Write `INSERT INTO projects ...` statement
- [ ] Write `INSERT INTO project_layouts ...` statement with JSON grid metadata
- [ ] Write `INSERT INTO plots ...` for all plots (with correct `plot_number`, `area_sqyd`, `price`)
- [ ] Execute SQL in Supabase SQL Editor

### Step 3: Create the Layout Renderer

- [ ] Create `src/app/projects/[id]/layout/renderers/{ProjectName}Layout.js`
- [ ] Export a function `render{ProjectName}Layout({ grid, dataMap, utils })`
- [ ] Set `gridTemplateColumns`, `gridTemplateRows`, `aspectRatio`
- [ ] Place roads with `placeCell()`
- [ ] Place all plots with `placePlot()` using correct row/col positions from the physical map
- [ ] Test hover and click interaction works correctly

### Step 4: Register the Renderer

- [ ] Open `src/app/projects/[id]/layout/renderers/index.js`
- [ ] Import the new renderer at the top
- [ ] Add entry to `PROJECT_RENDERERS` object (key = lowercase substring of project name)

### Step 5: Verify

- [ ] Navigate to `/projects` — new project card should appear with correct stats
- [ ] Navigate to `/projects/:id` — overview should show correct plots/financials
- [ ] Navigate to `/projects/:id/layout` — interactive grid should render all plots
- [ ] Click any plot cell — should navigate to `/projects/:id/plot/:plotNumber`
- [ ] Hover over a plot — should show details bar with area, price, client info

---

## 10. Existing Renderer Study Guide

### AeroTown Residency (AerotownLayout.js) — Simple Horizontal Layout

```
Grid: 40 cols × 14 rows
Center vertical road at column 20
3 horizontal roads at rows 2, 5, 8
127 plots arranged in 5 rows
Park at bottom-left, Garden at bottom-right
```

Key pattern: Plots are placed in left-of-center and right-of-center blocks separated by a vertical road.

### Dholera Homes 3 (DholeraHomes3Layout.js) — Column-Block Layout

```
Grid: 40 cols × 34 rows  
319 plots in 6 column-pairs (BLOCK1_LEFT/RIGHT, BLOCK2_LEFT/RIGHT, etc.)
5 internal vertical roads between blocks
2 main horizontal roads splitting plot rows
Left main road (col 2) + Right main road (col 20-21)
Common Plot areas at top-left and bottom-center
```

Key pattern: Plots face each other in column pairs, numbered in a specific winding order.

### Commercial Warehouse (CommercialWarehouseLayout.js) — Simple Grid

```
Grid: 26 cols × 31 rows (computed)
5×6 uniform plot grid
Horizontal + vertical roads between every row/column
All plots same size (500 sq.yd each)
```

Key pattern: Fully algorithmic — uses loops to place roads and plots uniformly.

---

## 11. Quick Reference: API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `GET /projects` | List all projects |
| `GET /projects/:id` | Single project details |
| `GET /plots/project/:id` | All plots for a project (with booking/payment join) |
| `GET /payments` | All payments (filtered by plot IDs on client side) |

The API base URL is set in `src/utils/api.js`. All calls go through `api.get()` and `api.post()` wrappers.

---

## 12. CSS Classes Quick Reference

```css
/* Plot status (auto-applied by placePlot based on dataMap) */
.status-available  { white bg, green border }
.status-token      { yellow bg, yellow border }
.status-partial    { orange bg, orange border }
.status-sold       { rose/red bg, rose border }

/* Road types (use as className in placeCell) */
.h-road            { light grey dashed horizontal }
.vertical-road     { light grey dashed vertical, rotated text }
.wide-road         { darker grey, use with h-road: "h-road wide-road" }

/* Amenity types */
.bushes            { bright green }
.garden            { medium green }
.common-plot       { green }

/* Entry markers (create manually like vertical roads) */
.entry-marker      { ENTRY + arrow }
.entry-arrow       { bouncing arrow animation }
```

---

*This guide should be used as primary context when asking an AI agent to add a new project. Provide the plot data, layout map, and project details alongside this document.*
