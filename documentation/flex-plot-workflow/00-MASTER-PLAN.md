# Flex-Plot Workflow — Master Implementation Plan

> **Task Lifetime Documentation**
> Project: Aerotown Logistics Park — Flex-Plot ("Open-Assignment") Workflow
> Created: 2026-10-14
> Status: 🟡 DRAFT — Pending approval before execution

---

## 1. Problem Statement

The current system uses a **fixed-plot structure**: each project is seeded with a finite, pre-configured list of plots (plot number, area, price, etc.) in the database before any booking activity begins. The interactive layout and list view both render from this pre-seeded data.

**Aerotown Logistics Park** (and future similar projects) needs a different paradigm:

- **No pre-seeded plots.** The project starts empty.
- **Plots are assigned on demand**, directly as part of the booking process.
- Each plot gets its area and price defined at booking time by the user.
- The rest of the booking lifecycle (payments, partners, confirmation, allotment letters, receipts) remains identical to the existing flow.

---

## 2. Design Principles

| Principle | Decision |
|-----------|----------|
| **Non-interference** | Zero changes to existing fixed-plot code paths. |
| **Project-scoped** | The new behaviour activates only for projects flagged as `plot_structure = 'flex'`. |
| **Modular** | New files live in their own clearly-named folders; existing files are unchanged. |
| **Reusable** | Any future project can opt into either structure at creation time. |
| **DB-compatible** | Reuses existing `plots` + `bookings` tables with minimal, additive schema additions. |

---

## 3. Architecture Overview

```
projects table
 └── plot_structure: 'fixed' | 'flex'   ← NEW column (additive, nullable defaults to 'fixed')

Fixed-plot flow (existing — unchanged):
  project → pre-seeded plots → select plot → add client → booking → payments

Flex-plot flow (new — additive):
  project → empty plot list → "Assign Plot" modal → creates plot + booking atomically → payments
```

### 3.1 Where New Code Lives

```
crm/
├── app/(admin)/projects/[id]/
│   ├── layout/
│   │   └── page.tsx              ← MODIFIED (minimal): branch to FlexLayoutClient if flex
│   ├── list/
│   │   └── page.tsx              ← MODIFIED (minimal): branch to FlexListClient if flex
│   └── flex-plot/                ← NEW folder (flex-only server actions & page wrappers)
│       ├── flex-plots.actions.ts ← NEW server actions
│       └── [flexPlotId]/         ← NEW — reuses existing PlotDetailsClient internally
│           └── page.tsx
│
├── components/projects/
│   ├── flex/                     ← NEW component folder
│   │   ├── FlexLayoutClient.tsx  ← Empty state + "Assign Plot" CTA + card grid
│   │   ├── FlexListClient.tsx    ← Table view with "Assign Plot" CTA
│   │   └── AssignPlotModal.tsx   ← Modal: area + price + client + booking creation
│   └── renderers/                ← UNCHANGED
│
└── lib/analytics/
    └── projectStats.ts           ← UNCHANGED (flex stats calculated seamlessly)
```

---

## 4. Database Changes (Supabase Migration)

### 4.1 `projects` table — add discriminator column

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS plot_structure TEXT
    CHECK (plot_structure IN ('fixed', 'flex'))
    DEFAULT 'fixed';

-- Tag Aerotown Logistics Park
UPDATE projects
  SET plot_structure = 'flex'
  WHERE name ILIKE '%aerotown logistic%' OR name ILIKE '%aero town logistic%';
```

### 4.2 `plots` table — no new columns needed

Flex plots use the **same `plots` table**. The difference is:
- Created **at booking time** (not pre-seeded).
- `area_sqyd` and `price` are entered by the user in the modal.
- `plot_number` is auto-generated as a sequential label within the project.

No columns removed or renamed. Existing queries are fully backward-compatible.

---

## 5. New Workflow — Step by Step

```
User opens Aerotown Logistics Park
  └─> plot_structure === 'flex'?
        YES → FlexLayoutClient or FlexListClient
                └─> Any plots assigned?
                      NO  → Empty state + "Assign New Plot" button
                      YES → Grid/Table of existing flex plots + "Assign New Plot" button
                └─> AssignPlotModal opens:
                      Section A: Area (sq.yd) + Price (total or per-unit toggle)
                      Section B: Client picker + Total amount + Discount + Consultant
                      [Submit] → createFlexPlotAndBooking()
                                    → INSERT plots (new flex plot)
                                    → INSERT bookings (linked to new plot)
                                    → Redirect to /projects/[id]/plot/[newPlotId]
                                          (existing PlotDetailsClient — unchanged)
                                          └─> Full existing flow:
                                                payments, partners, confirm, allotment letter
```

---

## 6. New Files & Their Purpose

### 6.1 `flex-plots.actions.ts` (Server Actions)

| Function | Purpose |
|----------|---------|
| `createFlexPlotAndBooking(projectId, plotData, bookingData)` | Atomic: inserts plot + booking |
| `getFlexPlots(projectId)` | Fetches all flex plots with booking status |
| `getNextFlexPlotNumber(projectId)` | Returns next sequential label |

### 6.2 `FlexLayoutClient.tsx`

- Responsive card grid of assigned flex plots.
- Each card shows: plot number, area, price, client name, payment status colour.
- "Assign New Plot" button always in top-right.
- Clicking a card → existing `PlotDetailsClient` page (same route).

### 6.3 `FlexListClient.tsx`

- Table view (mirrors `PlotsDataTable` columns).
- Same "Assign New Plot" button in header.
- Row → existing `PlotDetailsClient` page.

### 6.4 `AssignPlotModal.tsx`

Two-section modal:

**Section A — Plot Details:**
- Area in sq.yd (required)
- Price toggle: `Total Price` ↔ `Per sq.yd rate`
- Auto-calculates and shows the other value

**Section B — Client & Booking:**
- Searchable client picker (same style as existing "Start Negotiation" modal)
- Total agreed value (auto-filled from plot price, editable)
- Discount amount
- Consultant picker + commission %

On submit: `createFlexPlotAndBooking()` → redirect to plot detail page.

---

## 7. Route Branching Strategy

**Minimal change to 2 existing files:**

```tsx
// layout/page.tsx — only addition (after fetching overview)
if (project.plot_structure === 'flex') {
  const flexPlots = await getFlexPlots(projectId);
  return <FlexLayoutClient project={project} plots={flexPlots} />;
}
// existing code below unchanged...
return <LayoutGridClient project={project} plots={plots} />;
```

Same pattern in `list/page.tsx`.

---

## 8. Reuse of Existing Booking Flow

| Feature | Reuse? | Notes |
|---------|--------|-------|
| `PlotDetailsClient` | ✅ Full reuse | Same page, same route |
| `BookingDetailsClient` | ✅ Full reuse | Same page, same route |
| Payment recording | ✅ Full reuse | `addPayment()` unchanged |
| Booking confirmation | ✅ Full reuse | `confirmBooking()` unchanged |
| Partner add/remove | ✅ Full reuse | `addPartnerToBooking()` unchanged |
| Allotment Letter PDF | ✅ Full reuse | Same generator |
| Payment Receipt PDF | ✅ Full reuse | Same generator |
| Transfer | ✅ Full reuse | `transferBooking()` unchanged |
| Change Requests | ✅ Full reuse | `submitChangeRequest()` unchanged |
| Project Dashboard | ✅ Auto-works | `calculateProjectStats()` needs no changes |

---

## 9. Implementation Chunks

| # | Chunk | Description | Estimated Complexity |
|---|-------|-------------|----------------------|
| **CP-01** | DB Migration | Add `plot_structure` column; tag Aerotown Logistics Park | Low |
| **CP-02** | Server Actions | Write `flex-plots.actions.ts` | Medium |
| **CP-03** | `AssignPlotModal` component | Two-section form modal | Medium-High |
| **CP-04** | `FlexLayoutClient` | Card grid + empty state + modal trigger | Medium |
| **CP-05** | `FlexListClient` | Table view matching existing style | Medium |
| **CP-06** | Route branching | Minimal changes to `layout/page.tsx` + `list/page.tsx` | Low |
| **CP-07** | Overview adaptation | Verify stats; flex-aware display tweaks if needed | Low |
| **CP-08** | Testing & Polish | Full E2E flow, edge cases, mobile | Medium |

---

## 10. Open Questions (Needs Confirmation Before CP-01)

1. **Plot numbering**: Auto-sequential (LP-001, LP-002...) or plain (1, 2, 3...) or user-typed custom label?

2. **Multiple negotiations per flex plot**: Should flex plots support multiple pending bookings like fixed plots, or is it one-shot (one booking per plot at assignment time)?

3. **Plot-only creation**: Can a user create a flex plot without immediately assigning a client (e.g., reserve area first, assign client later)? Or is the modal always bundle-mode (plot + client together)?

4. **Layout view style**: Simple card grid (current plan) or attempt a visual map? (No fixed geometry for logistics park, so card grid is the sensible default.)

5. **Editing flex plot area/price post-creation**: Allowed (master_admin only), or locked?

---

## 11. Checkpoint Log

| Checkpoint | Status | Date | Notes |
|-----------|--------|------|-------|
| CP-00: Plan drafted | ✅ Done | 2026-10-14 | Master plan confirmed |
| CP-01: DB Migration | ✅ Done | 2026-10-14 | Migration v312 applied & seeded |
| CP-02: Server Actions | ✅ Done | 2026-10-14 | `flex-plots.actions.ts` created |
| CP-03: AssignPlotModal | ✅ Done | 2026-10-14 | Dual-section modal implemented |
| CP-04: FlexLayoutClient | ✅ Done | 2026-10-14 | Grid client & empty states built |
| CP-05: FlexListClient | ✅ Done | 2026-10-14 | Tabular view & filters built |
| CP-06: Route branching | ✅ Done | 2026-10-14 | Minimal branching in layout & list |
| CP-07: Overview adaptation | ✅ Done | 2026-10-14 | Dashboard aggregates dynamically |
| CP-08: Testing & Polish | ✅ Done | 2026-10-14 | E2E verified, build passed |
