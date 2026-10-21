# Flex-Plot Workflow — Architecture Corrections (from deep analysis)

> Supplement to 00-MASTER-PLAN.md — filed after full codebase research
> Date: 2026-10-14

---

## Key findings that refine the plan

### 1. No project_type column exists — layout discriminated by name only
The name-matching system is the canonical pattern for all project-type branching.
Our `plot_structure = 'flex'` DB column is therefore the **first true discriminator** in the codebase.
The existing name-based layout renderer selection is NOT our concern — we branch BEFORE that logic.

### 2. Active renderer directory is in `app/`, not `components/`
- **Active**: `app/(admin)/projects/[id]/layout/renderers/`
- **Legacy/duplicate**: `components/projects/renderers/`
Our new code should follow the active pattern.

### 3. Plot status is 100% DB-trigger-maintained
`trg_update_plot_status` fires on bookings changes.
Flex plots will benefit from this automatically — no extra application logic needed.

### 4. Unique constraint: `bookings(client_id, plot_id)` is UNIQUE
This means one booking per client-plot pair. Flex plots created atomically with one client are fine.
Multi-negotiation on a flex plot would require different clients (same as fixed plots — no difference).

### 5. `amount_paid` on bookings is trigger-maintained
`trg_update_booking_amount_paid` keeps this denormalized field in sync automatically.

### 6. Both renderers directories exist; LayoutGridClient imports from `app/.../layout/renderers/`
The `components/projects/renderers/index.ts` is unused dead code.
