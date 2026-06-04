# Partnership Booking Feature — Architecture Guide

> **Written:** 2026-05-25  
> **Status:** Implemented  
> This document captures the design decisions, approach, constraints, and future notes for the shared/partnership booking feature in the DIDPL CRM.

---

## 1. Feature Overview

Two clients can now co-own a single booking on a plot. One is designated the **primary client** and the other is the **partner client**. Payments are tracked per-client, and both names appear everywhere the booking is displayed — in the plot detail view, allotment letter, and the client detail page.

---

## 2. Database Schema Decision

### Approach Chosen: `partner_client_id` column on `bookings` table

```sql
ALTER TABLE bookings ADD COLUMN partner_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
```

**Why this approach:**
- Minimal schema change — one nullable FK column.
- All existing queries work with zero breakage; only queries that explicitly need the partner join get updated.
- The existing `payments.entity_id` column already stores *which client* made the payment, so per-partner payment attribution was free — no extra schema needed.

**Trade-off accepted:**
- This approach only supports exactly 2 clients per booking (primary + one partner).
- **If 3+ partners are ever needed in future**, we would migrate to a `booking_partners` junction table. That migration would require updating every query that currently reads `partner_client_id`. This was noted and accepted as a future concern.

---

## 3. Primary vs. Partner Client Rules

| Rule | Decision |
|------|----------|
| Who is the primary? | The client originally added via the "Add Client" booking flow. The one whose `client_id` is on `bookings.client_id`. |
| Who is the partner? | The client added later via the "Add Partner" button. Their ID is stored in `bookings.partner_client_id`. |
| Can partner be added to pending bookings? | **Yes.** Both `pending` and `confirmed` bookings can have a partner added. |
| Is there an ownership percentage? | **No.** The system does not enforce split percentages. Total payments from both clients are summed as a whole for the booking. |
| `plots.client_id` with two partners? | **Primary client always.** `plots.client_id` continues to store only the primary booking client's ID. The partner is exclusively visible via the booking join. |

---

## 4. Payment Attribution

The `payments` table has an `entity_id` column that stores the ID of the client who made the payment. This was already in place.

- When adding a payment on a partnership booking, a **"Payment By"** dropdown appears in the modal so the admin can select whether the payment is from the **primary** or **partner** client.
- In the payment history table on the plot detail page, a **"By"** column displays which client made each payment.
- On the client detail page, the payment history is inherited from all bookings that client is part of (primary or partner).

---

## 5. Transfer & Merge Decision

### The Scenario
Client A books Plot 10. Client A is also the partner on Plot 5 (alongside Client B as primary). Client A wants to merge their Plot 10 booking into Plot 5 (their partnership plot).

### Decision: **Merge into Partnership**

This is treated as a **merge**, not a standard transfer:
1. All payments from Client A's Plot 10 booking are **moved** to Plot 5's booking (`booking_id` updated on each payment row).
2. The source booking (Plot 10) is **deleted**.
3. Plot 10's status is recalculated based on any remaining bookings.
4. Plot 5's booking now carries all of Client A's historical payments — attributed correctly via `entity_id = clientA.id`.

### Transfer Modal Enhancement
The transfer plot selector now uses `getTransferablePlotsForClient` instead of `getAvailablePlots`:
- Shows **available** plots (standard transfer)
- Shows the client's **own existing booking plots** (allows re-routing)
- Shows **partnership plots** of the client (tagged with `[Partnership — Merge]` in the dropdown)

When a partnership plot is selected, the system fetches the target booking ID on that plot where `partner_client_id = transferring client's ID` and stores it for the merge call.

---

## 6. Allotment Letter

The `generateAllotmentLetter` utility was updated to accept an optional `partner_name` field:
- If present: greeting becomes `"Dear Client A & Partner B,"`
- Filename becomes: `Allotment_Letter_Client_A_and_Partner_B.pdf`
- If absent: behaves exactly as before.

---

## 7. Client Detail Page

On a client's detail page (`/clients/[id]`):
- Bookings where this client is the **primary** appear normally.
- Bookings where this client is the **partner** appear with a purple **"Partnership"** badge and show the primary client's name (e.g., "w/ Client A").
- The `getClientById` query in `people.actions.ts` now runs a second query for `bookings.partner_client_id = clientId` and merges the results, tagging each with an `isPartnership` flag.

---

## 8. Stats / Financial Integrity

### `confirmedPlots` double-count prevention
`calculateProjectStats` in `projects.actions.ts` increments `confirmedPlots` **once per booking**, not per client. Since both clients share the same booking row, there is no double-count issue — this was verified before implementation.

### `amountReceived` calculation
`amountReceived` sums all `payments.amount` from the booking's payment array regardless of `entity_id`. Both clients' payments are summed together for the booking total — consistent with the "no enforced split" decision.

### `totalRevenue`
No change needed. `totalRevenue` is based on `plots.price` (listed price) and the confirmed booking's deal value — agnostic to how many clients are on the booking.

---

## 9. Files Modified

| File | Change |
|------|--------|
| `plots.actions.ts` | Added `addPartnerToBooking`, `removePartnerFromBooking`, `getTransferablePlotsForClient`, `mergeTransferIntoPartnership`. Updated `getPlotDetails` query to join `partner:partner_client_id`. |
| `people.actions.ts` | Updated `getClientById` to also fetch and merge partnership bookings. |
| `projects.actions.ts` | Updated booking select queries in `getProjectsWithStats`, `getProjectOverview`, `getProjectPlots` to include `partner_client_id` and `partner:partner_client_id(id, name)`. |
| `generateAllotmentLetter.ts` | Added `partner_name` support in greeting and filename. |
| `PlotDetailsClient.tsx` | Added Add Partner modal, Remove Partner button, "By" column in payment table, "Payment By" dropdown, dual-name booking header, updated transfer modal for merge detection. |
| `ClientDetailClient.tsx` | Added Partnership badge and co-owner name in bookings table. |

---

## 10. Future Notes

- **3+ partners:** Currently `partner_client_id` supports only one partner. For multi-partner support, create a `booking_partners` junction table with `(booking_id, client_id, added_at)` and migrate existing `partner_client_id` values into it. All queries currently reading `partner:partner_client_id(...)` would need to switch to a join on that table.
- **Employee workflow:** Currently the "Add Partner" button performs the action directly for admins. For the employee role, this should go through a `submitChangeRequest` in a future iteration.
- **Merge transfer for employees:** The merge path currently bypasses the change-request system. For strict audit trails, a change-request flow for merge transfers would be ideal.
- **Partner on Allotment Letter body:** Currently only the greeting uses both names. If needed, the body text of the letter (the plot detail section) can also be updated to list both names.
