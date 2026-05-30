# Implementation Plan V2.0.0 — Database Schema Changes & System Overhaul
> **Version:** V2.0.0  
> **Date:** 2026-05-29  
> **Author:** Antigravity (AI Pair Programmer)  
> **Status:** APPROVED — Ready for Execution  

---

## Expert Analysis & Assessment

### ✅ What's Well-Built

- The approval workflow (`pending_changes`) is a solid, audit-friendly design pattern
- Using `entity_id + entity_type` for the payment ledger is a clean polymorphic design
- Server Actions as the sole backend interface is correct for this stack
- RLS on all tables is good security hygiene

### Design Decisions Locked In (Approved)

1. **`booking_partners` junction table** (not `partner_ids uuid[]`) — proper FK integrity, indexable, cascade-safe
2. **`booking_type` auto-synced via DB trigger** — always consistent with reality, no drift risk
3. **Removing partner does NOT create a new booking** — same booking kept, partner row deleted, trigger updates `booking_type` to `'single'`
4. **Commission calculated per-payment** — `payments.commission_amount = payment.amount × (booking.commission_percent / 100)`, TDS = 2% of that. No aggregate columns on bookings.

---

## Complete DB Changes Summary

| # | Change | Table | Type | Risk |
|---|---|---|---|---|
| 1 | Remove `project_layouts` table | `project_layouts` | DROP TABLE | Low |
| 2 | Remove `length`, `width`, `area_sqm` columns | `plots` | ALTER TABLE | Low |
| 3 | Remove `partially_paid` from `plot_status_enum` | enum | RECREATE TYPE | Medium |
| 4 | Add `booking_type` column | `bookings` | ALTER TABLE | Low |
| 5 | Remove `donation_amount` column | `bookings` | ALTER TABLE | Low |
| 6 | Remove `commission_amount` column | `bookings` | ALTER TABLE | Low |
| 7 | Remove `tds_amount` column | `bookings` | ALTER TABLE | Low |
| 8 | Remove `receipt_type` column | `payments` | ALTER TABLE | Low |
| 9 | Remove `receipt_type_enum` | enum | DROP TYPE | Low |
| 10 | Remove `otp_codes` table | `otp_codes` | DROP TABLE | Medium |
| 11 | Add `booking_partners` junction table | NEW | CREATE TABLE | Low |
| 12 | Migrate `partner_client_id` → `booking_partners` | `bookings` | Data Migration | Medium |
| 13 | Drop `partner_client_id` (after code updated) | `bookings` | ALTER TABLE | Low |
| 14 | Add `sync_booking_type` trigger | trigger | CREATE TRIGGER | Low |
| 15 | Add missing indexes | multiple | CREATE INDEX | Low |

---

## Phase 1 — Database Schema Migration

**Goal:** Apply all DB changes to Supabase (test first, then production).  
**Risk:** Medium — run on test DB first and verify before production.  
**Prerequisite:** Supabase Studio backup taken.

> [!CAUTION]
> Run on **test DB first**. Then production. Do NOT reverse the order.

> [!WARNING]
> For `otp_codes`: if client OTP login is still used anywhere in the live app, disabling the table will break client login. Confirm client OTP flow is fully removed from frontend before running this migration.

### 1.1 SQL Migration Script

```sql
-- ============================================================
-- DIDP CRM — Schema Migration V2.0.0
-- Date: 2026-05-29
-- Run on: Test DB first, then Production
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. REMOVE project_layouts table
--    (table confirmed empty, never actively used)
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.project_layouts LIMIT 1) THEN
    RAISE EXCEPTION 'project_layouts is not empty — cannot drop safely. Inspect before dropping.';
  END IF;
END $$;

DROP TABLE IF EXISTS public.project_layouts CASCADE;

-- ────────────────────────────────────────────────────────────
-- 2. REMOVE otp_codes table
--    (OTP auth flow is being removed)
-- ────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.otp_codes CASCADE;

-- ────────────────────────────────────────────────────────────
-- 3. REMOVE unused columns from plots
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.plots
  DROP COLUMN IF EXISTS length,
  DROP COLUMN IF EXISTS width,
  DROP COLUMN IF EXISTS area_sqm;

-- ────────────────────────────────────────────────────────────
-- 4. REMOVE partially_paid from plot_status_enum
--    PostgreSQL does not support DROP VALUE from an enum.
--    We must convert column to text, recreate the type, convert back.
-- ────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.plots WHERE status::text = 'partially_paid') THEN
    RAISE EXCEPTION 'Cannot remove partially_paid — rows exist with this status. Update them first.';
  END IF;
END $$;

ALTER TABLE public.plots ALTER COLUMN status TYPE text;
DROP TYPE IF EXISTS public.plot_status_enum;
CREATE TYPE public.plot_status_enum AS ENUM ('available', 'token_paid', 'sold');
ALTER TABLE public.plots
  ALTER COLUMN status TYPE public.plot_status_enum
  USING status::public.plot_status_enum;
ALTER TABLE public.plots
  ALTER COLUMN status SET DEFAULT 'available'::public.plot_status_enum;

-- ────────────────────────────────────────────────────────────
-- 5. REMOVE columns from bookings
--    - donation_amount  (not used in business logic)
--    - commission_amount (now calculated per-payment)
--    - tds_amount       (now calculated per-payment)
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  DROP COLUMN IF EXISTS donation_amount,
  DROP COLUMN IF EXISTS commission_amount,
  DROP COLUMN IF EXISTS tds_amount;

-- ────────────────────────────────────────────────────────────
-- 6. ADD booking_type column to bookings
--    Trigger will keep this in sync automatically.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'single'
  CHECK (booking_type IN ('single', 'partnership'));

-- ────────────────────────────────────────────────────────────
-- 7. REMOVE receipt_type column and its enum from payments
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.payments
  DROP COLUMN IF EXISTS receipt_type;

DROP TYPE IF EXISTS public.receipt_type_enum;

-- ────────────────────────────────────────────────────────────
-- 8. CREATE booking_partners junction table
--    Replaces the single partner_client_id FK column.
--    Supports unlimited partners with full referential integrity.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.booking_partners (
  booking_id  UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id   UUID        NOT NULL REFERENCES public.clients(id)  ON DELETE CASCADE,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (booking_id, client_id)
);

ALTER TABLE public.booking_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "booking_partners_admin_emp_all" ON public.booking_partners
  USING (public.is_admin() OR public.is_employee());

-- ────────────────────────────────────────────────────────────
-- 9. MIGRATE existing partner_client_id data → booking_partners
-- ────────────────────────────────────────────────────────────
INSERT INTO public.booking_partners (booking_id, client_id)
SELECT id, partner_client_id
FROM public.bookings
WHERE partner_client_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 10. BACKFILL booking_type for existing partnership bookings
-- ────────────────────────────────────────────────────────────
UPDATE public.bookings
SET booking_type = 'partnership'
WHERE partner_client_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 11. CREATE trigger: auto-sync booking_type on partner changes
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_booking_type()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    -- After removing a partner, check if any remain
    UPDATE public.bookings
    SET booking_type = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.booking_partners WHERE booking_id = OLD.booking_id
      ) THEN 'partnership'
      ELSE 'single'
    END
    WHERE id = OLD.booking_id;
    RETURN OLD;
  ELSE
    -- After adding a partner, mark as partnership
    UPDATE public.bookings
      SET booking_type = 'partnership'
      WHERE id = NEW.booking_id;
    RETURN NEW;
  END IF;
END;
$$;

CREATE OR REPLACE TRIGGER on_booking_partner_change
  AFTER INSERT OR DELETE ON public.booking_partners
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_type();

-- ────────────────────────────────────────────────────────────
-- 12. NOTE: partner_client_id column is kept for now
--     It will be dropped at the END of Phase 2, after all
--     application code is updated and verified.
--     Keeping it here means old code still reads correctly
--     during the transition window.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 13. ADD missing indexes for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plots_project_id      ON public.plots(project_id);
CREATE INDEX IF NOT EXISTS idx_plots_status          ON public.plots(status);
CREATE INDEX IF NOT EXISTS idx_bookings_plot_id      ON public.bookings(plot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id    ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id   ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_entity_id    ON public.payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_booking_partners_client  ON public.booking_partners(client_id);
CREATE INDEX IF NOT EXISTS idx_booking_partners_booking ON public.booking_partners(booking_id);

COMMIT;
```

### 1.2 Phase 1 Verification Checklist

- [ ] `project_layouts` table gone
- [ ] `otp_codes` table gone
- [ ] `plots.length`, `.width`, `.area_sqm` columns gone
- [ ] `plots.status = 'partially_paid'` is rejected (INSERT test)
- [ ] `bookings.donation_amount`, `.commission_amount`, `.tds_amount` gone
- [ ] `bookings.booking_type` column exists with DEFAULT `'single'`
- [ ] `payments.receipt_type` column gone, `receipt_type_enum` type gone
- [ ] `booking_partners` table exists with correct PKs and FKs
- [ ] Existing `partner_client_id` data exists in `booking_partners` (SELECT COUNT)
- [ ] Existing partnership bookings have `booking_type = 'partnership'`
- [ ] Trigger test: insert into `booking_partners` → booking_type becomes `'partnership'`
- [ ] Trigger test: delete from `booking_partners` → booking_type reverts to `'single'`
- [ ] All 9 new indexes exist

---

## Phase 2 — Application Code Updates

**Goal:** Update all server actions and UI for the new schema.  
**Risk:** High — test thoroughly on dev before production deploy.

### 2.1 `plots.actions.ts` — Full Change List

#### `getPlotDetails()` — Update booking join
```typescript
// BEFORE
bookings (
  *,
  client:client_id ( id, name, phone, email, client_code ),
  partner:partner_client_id ( id, name, phone, email, client_code ),
  ...
)
// AFTER
bookings (
  *,
  client:client_id ( id, name, phone, email, client_code ),
  booking_partners ( client:client_id ( id, name, phone, email, client_code ) ),
  ...
)
```

#### `addPayment()` — Commission/TDS calculated per-payment, stored on payment row
```typescript
// BEFORE: commission stored as aggregate on booking (commission_amount, tds_amount)
// AFTER:  calculate commission per payment and store ONLY on the payment row
//         No booking aggregate update at all.

const commission_amount = booking.commission_percent
  ? formData.amount * (booking.commission_percent / 100)
  : 0
const tds_amount = commission_amount * 0.02

// Insert payment with commission_amount and tds_amount on the payment row
// ← NO booking.update() for commission/TDS anymore
```

#### `addPartnerToBooking(bookingId, partnerClientId)` — Use junction table
```typescript
// BEFORE: supabase.from('bookings').update({ partner_client_id: partnerClientId })
// AFTER:  supabase.from('booking_partners').insert([{ booking_id, client_id: partnerClientId }])
// booking_type auto-updated by trigger
```

#### `removePartnerFromBooking(bookingId, partnerClientId)` — Signature change
```typescript
// BEFORE: removePartnerFromBooking(bookingId) — sets partner_client_id = null
// AFTER:  removePartnerFromBooking(bookingId, partnerClientId) — deletes specific row
//         from booking_partners. booking_type auto-updated by trigger.
//         Same booking_id. Payments remain. No new booking created.
```

#### `getTransferablePlotsForClient()` — Query via booking_partners
```typescript
// BEFORE: .eq('partner_client_id', clientId)
// AFTER:  query booking_partners WHERE client_id = clientId, join bookings → plots
```

#### `createBooking()` — Add confirmed-plot guard
```typescript
// Add check: if plot has ANY confirmed booking, reject the new booking
const { data: existingConfirmed } = await supabase
  .from('bookings')
  .select('id')
  .eq('plot_id', formData.plot_id)
  .eq('status', 'confirmed')
  .limit(1)
if (existingConfirmed?.length > 0) {
  return { success: false, error: 'Plot already has a confirmed booking' }
}
```

#### `revertBooking()` — Fix client_id inconsistency
```typescript
// BEFORE: plots.update({ status: 'token_paid', client_id: null })
// AFTER:  plots.update({ status: 'token_paid', client_id: booking.client_id })
//         The booking still knows its client — keep the plot linked.
```

#### `deletePayment()` — Remove was no-op on commission; now nothing extra needed
```typescript
// Commission is now ONLY on payment rows — deleting a payment correctly
// removes that commission contribution automatically. No additional logic needed.
```

### 2.2 `projects.actions.ts` — Full Change List

#### `getProjectsWithStats()` / `getProjectOverview()` / `getProjectPlots()`
```typescript
// BEFORE: partner_client_id, partner:partner_client_id(id, name)
// AFTER:  booking_partners(client:client_id(id, name))
// Also remove partner_client_id from select lists
```

#### `calculateProjectStats()` — Remove dead code
```typescript
// REMOVE: plot.status === 'partially_paid' from all conditionals
// REMOVE: cancelledPlots counter (no UI uses this; simplify stats object)
// SIMPLIFY: tokenPlots condition — just plot.status === 'token_paid'
```

#### `getProjectClients()` — Remove legacy branch
```typescript
// REMOVE: the activeBookings.length === 0 && p.clients fallback branch
//         This was for legacy data. With clean DB, every non-available plot
//         has a booking. The fallback is dead code.
// REMOVE: partially_paid references in status filtering
```

### 2.3 `people.actions.ts` — Full Change List

#### `getClientById()` — Partnership query via booking_partners
```typescript
// BEFORE:
//   supabase.from('bookings').select(...).eq('partner_client_id', clientId)
//
// AFTER:
//   supabase.from('booking_partners')
//     .select('booking_id')
//     .eq('client_id', clientId)
//   → then fetch those bookings by ID with full joins

const { data: partnerRows } = await supabase
  .from('booking_partners')
  .select(`
    booking:booking_id (
      id, status, total_amount, discount_amount, booking_date, booking_type,
      client:client_id ( id, name ),
      plots ( id, plot_number, project_id, projects ( id, name ) ),
      payments ( id, amount, payment_date, payment_mode, transaction_id, description, entity_id )
    )
  `)
  .eq('client_id', clientId)
```

#### `getClients()` — Update bookings join (remove partner_client_id refs)
```typescript
// No structural change needed here — this query only reads bookings.client_id
// Confirm no partner_client_id leaks in select
```

#### `deleteClient()` — booking_partners cascade handles cleanup
```typescript
// booking_partners rows CASCADE DELETE when client is deleted (FK ON DELETE CASCADE)
// No manual cleanup needed for partnership references
// Verify the cascade is correct after Phase 1
```

### 2.4 `change-requests.actions.ts` — Fix Redundant Double-Update

```typescript
// BEFORE: After calling confirmBooking() / revertBooking(), code falls through
//         to a generic update() on the booking — which is redundant.
//
// AFTER: Return immediately after the specialized handler succeeds

if (payload.status === 'confirmed') {
  const { data: b } = await supabase.from('bookings').select('plot_id, client_id').eq('id', entity_id).single()
  if (b) {
    const { confirmBooking } = await import('./plots.actions')
    const res = await confirmBooking(entity_id, b.plot_id, b.client_id)
    if (!res.success) return res
    return { success: true }  // ← EXIT HERE, do not fall through
  }
} else if (payload.status === 'pending') {
  const { data: b } = await supabase.from('bookings').select('plot_id').eq('id', entity_id).single()
  if (b) {
    const { revertBooking } = await import('./plots.actions')
    const res = await revertBooking(entity_id, b.plot_id)
    if (!res.success) return res
    return { success: true }  // ← EXIT HERE, do not fall through
  }
} else if (payload.plot_id) {
  const { transferBooking } = await import('./plots.actions')
  const res = await transferBooking(entity_id, payload.plot_id)
  if (!res.success) return res
  return { success: true }
}

// Only reach here for non-special booking updates (e.g., discount_amount change)
const result = await supabase.from(table).update(payload).eq('id', entity_id)
```

### 2.5 `reports.actions.ts` — Commission Report Update

```typescript
// BEFORE: commission_earned = bookings.commission_amount (the removed aggregate column)
//
// AFTER: sum commission_amount from individual payment rows
//        commission_earned = SUM(payments.commission_amount WHERE booking_id = X)

// In getCommissionReport():
payments ( id, amount, payment_date, payment_mode, entity_type, commission_amount, tds_amount )

// Then:
const commissionEarned = (b.payments || [])
  .filter((p: any) => p.entity_type === 'client')
  .reduce((s: number, p: any) => s + Number(p.commission_amount || 0), 0)

const tds = (b.payments || [])
  .filter((p: any) => p.entity_type === 'client')
  .reduce((s: number, p: any) => s + Number(p.tds_amount || 0), 0)
```

### 2.6 End-of-Phase-2 Cleanup SQL

After all code is deployed and verified, run this final cleanup:

```sql
-- Drop the legacy column — all code now uses booking_partners
ALTER TABLE public.bookings DROP COLUMN IF EXISTS partner_client_id;
```

### 2.7 Phase 2 Verification Checklist

- [ ] Plot detail page loads with partners via `booking_partners` join
- [ ] Add partner → appears in partner list, `booking_type = 'partnership'`
- [ ] Remove specific partner → removed from list, booking stays, `booking_type` auto-reverts if last partner
- [ ] Payment on partnership booking: commission/TDS stored on payment row correctly
- [ ] Commission report uses sum from payment rows (not booking column)
- [ ] Transfer booking → works, old plot recalculated
- [ ] Merge transfer to partnership plot → payments re-attributed, source booking deleted
- [ ] Client detail page: primary bookings + partnership bookings both shown
- [ ] Confirm booking via approval workflow → plot becomes sold ✅
- [ ] `cancelBooking` (via approval delete) → plot returns to available ✅
- [ ] No `partially_paid` references in any console errors
- [ ] No `receipt_type`, `donation_amount`, `commission_amount`/`tds_amount` (booking) references in errors

---

## Phase 3 — Code Quality & Reliability

**Goal:** Fix structural code quality issues identified during architecture review.  
**Risk:** Low — no business logic changes, just correctness improvements.

### 3.1 Standardize Error Handling

Fix `updateProject()` — currently throws instead of returning `{success, error}`:
```typescript
// BEFORE: if (error) throw new Error(error.message)
// AFTER:  if (error) return { success: false, error: error.message }
//         return { success: true }
```

### 3.2 Fix Entity Code Generation — Add Retry Loop

```typescript
async function generateUniqueEntityCode(
  supabase: any,
  prefix: string,
  name: string,
  table: string,
  column: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateEntityCode(prefix, name)
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(column, code)
    if (count === 0) return code
  }
  throw new Error('Could not generate unique entity code after 5 attempts')
}
```

### 3.3 Add `is_active` Flag to `plots` (Remove Hardcoded Filter)

```sql
-- Add column
ALTER TABLE public.plots ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Mark inactive DH3 plots
UPDATE public.plots SET is_active = FALSE
WHERE project_id = (SELECT id FROM public.projects WHERE name ILIKE '%dholera homes 3%')
  AND plot_number::int NOT IN (
    1, 30, 33, 48, 49, 61, 62, 63, 71, 72, 73, 78, 92, 97,
    103, 104, 105, 111, 112, 115, 116, 117, 121, 122, 134, 137, 138,
    144, 145, 148, 149, 166, 167, 173, 181, 182, 188, 189, 194, 195,
    199, 207, 208, 217, 218, 219, 220, 225, 236, 243, 244, 245, 247,
    255, 266, 267, 268, 269, 270, 273, 283, 294
  );

-- Mark inactive Aerotown Residency plots
UPDATE public.plots SET is_active = FALSE
WHERE project_id = (SELECT id FROM public.projects WHERE name ILIKE '%aerotown residency%')
  AND plot_number::int NOT IN (
    8, 11, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92,
    93, 94, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107,
    108, 109, 110, 119, 120, 121, 122, 123, 124, 125, 126, 127
  );
```

Replace `filterActivePlots()` calls with `.eq('is_active', true)` in all queries. Delete `project-utils.ts` once done.

### 3.4 Input Validation on Key Actions

Add UUID validation at entry points to prevent malformed IDs causing DB errors:
```typescript
// Already exists in plots.actions.ts — extend to all action files
function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}
```

---

## Phase 4 — Performance Optimization

**Goal:** Query efficiency for project list, plot grid, and report pages.  
**Risk:** Low.

### 4.1 Add `is_active` Index (from Phase 3)
```sql
CREATE INDEX IF NOT EXISTS idx_plots_is_active ON public.plots(is_active);
```

### 4.2 Paginate Report Queries

```typescript
export async function getBookingReport(page = 1, pageSize = 50) {
  const from = (page - 1) * pageSize
  const { data, count } = await supabase
    .from('bookings')
    .select('...', { count: 'exact' })
    .range(from, from + pageSize - 1)
  return { data, total: count, page, pageSize }
}
```

Apply to: `getBookingReport`, `getRecoveryReport`, `getCommissionReport`, `getReceiptReport`, `getLedger`.

### 4.3 Cache `getProjectsWithStats`

```typescript
import { unstable_cache } from 'next/cache'

export const getProjectsWithStats = unstable_cache(
  async () => { /* implementation */ },
  ['projects-with-stats'],
  { revalidate: 30 }
)
```

---

## Phase 5 — UI Improvements

**Goal:** Expose new multi-partner functionality and booking type in the UI.  
**Risk:** Low (frontend changes only, data layer stable by this phase).

### 5.1 Multi-Partner UI on Plot Detail Page

- Replace single "Add Partner" button with "Manage Partners" section
- List all partners with individual **Remove** buttons per partner
- Payment modal "Payment By" dropdown: Primary Client + all partners listed
- Show `booking_type` badge: 🔵 Single / 🟣 Partnership

### 5.2 Partner Client Portal RLS (Optional)

```sql
DROP POLICY IF EXISTS "bookings_client_read" ON public.bookings;

CREATE POLICY "bookings_client_read" ON public.bookings
FOR SELECT USING (
  client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  OR
  id IN (
    SELECT booking_id FROM public.booking_partners
    WHERE client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  )
);
```

### 5.3 Allotment Letter — Multiple Partners

Update `generateAllotmentLetter` to accept `partners: string[]` and format:
```
Dear Client A, Partner B & Partner C,
```

---

## File Change Summary

### Phase 1 (DB only)
| File | Action |
|---|---|
| `crm/supabase/migrations/20260529_v200_schema.sql` | [NEW] Phase 1 migration SQL |
| `documentation/database-schema.md` | [MODIFY] Update to V2.0.0 |

### Phase 2 (Code changes)
| File | Change |
|---|---|
| `crm/app/(admin)/plots.actions.ts` | getPlotDetails, addPayment, addPartner, removePartner, getTransferable, createBooking, revertBooking |
| `crm/app/(admin)/projects.actions.ts` | getProjectsWithStats, getProjectOverview, getProjectPlots, calculateProjectStats, getProjectClients |
| `crm/app/(admin)/people.actions.ts` | getClientById, deleteClient |
| `crm/app/(admin)/change-requests.actions.ts` | applyApprovedChange — fix double-update |
| `crm/app/(admin)/reports.actions.ts` | getCommissionReport — commission from payment rows |
| `crm/app/(admin)/projects/[id]/plot/[plotId]/PlotDetailsClient.tsx` | Multi-partner UI, booking_type badge |
| `crm/app/(admin)/clients/[id]/ClientDetailClient.tsx` | Partnership bookings via new query |

### Phase 3 (Quality)
| File | Change |
|---|---|
| `crm/app/(admin)/projects.actions.ts` | updateProject error handling |
| `crm/app/(admin)/people.actions.ts` | generateUniqueEntityCode with retry |
| `crm/app/project-utils.ts` | [DELETE] after is_active DB flag added |

---

## Rollback Plan

> [!CAUTION]
> Take a Supabase backup before Phase 1. Supabase Studio → Settings → Database → Backups.

**Phase 1 partial failure (after data migration, before code):**
- Old code still reads `partner_client_id` (not dropped yet) — app continues to work
- `booking_partners` data exists but isn't read — safe to truncate if rollback needed

**Phase 2 code bug:**
- Revert deployment — old code works because `partner_client_id` still exists
- Fix bugs, redeploy

**`partner_client_id` column drop (end of Phase 2):**
- This is a one-way operation — only run after full verification
- If needed, data can be reconstructed from `booking_partners` table

---

*End of Implementation Plan V2.0.0 — 2026-05-29 (Updated 2026-05-29 13:14)*
