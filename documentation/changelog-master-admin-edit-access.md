# Changelog: Master Admin Full Edit Access

**Date:** 2026-05-21  
**Type:** Feature  
**Scope:** All core CRM entities  
**Author:** System  

---

## Overview

Added unrestricted edit (and delete) access for the `master_admin` role across all major CRM entities. This gives master administrators the ability to directly correct any data in the system without going through the change-request workflow.

**Role hierarchy after this change:**

| Role | Access Level |
|---|---|
| `employee` | Read + change requests (approval required) |
| `admin` | Direct writes to most entities |
| `master_admin` | Full edit + delete on everything (**new**) |

---

## Entities Now Fully Editable by Master Admin

### 1. Plots (Plot Details Page)

**New "Edit Plot" button** on the plot detail page header.

**Editable fields:**
- `plot_number` — the identifier shown on the grid
- `area_sqyd` — area in square yards
- `price` — list price
- `status` — available / token_paid / partially_paid / sold

**New "Edit Booking" button** on each booking card.

**Editable booking fields:**
- `total_amount` — agreed deal value
- `discount_amount` — discount applied
- `commission_percent` — consultant commission rate
- `status` — pending / confirmed / cancelled

**Payment rows now have Edit / Delete icons** (master_admin only).

**Editable payment fields:**
- `amount`
- `payment_date`
- `payment_mode`
- `description` / `transaction_id`

---

### 2. Clients (Client Detail Page)

**New "Delete Client" button** in the header (master_admin only).

> ⚠️ **Cascade Delete:** Deleting a client permanently removes:
> - All bookings belonging to that client
> - All payments linked to those bookings
> - All client-level payment records
> - The client record itself
> - Affected plots are reset to `available`

**Edit Profile modal now includes `client_code`** field (master_admin only).

**Payment History table now has Edit / Delete icons** on each row (master_admin only).

---

### 3. Consultants (Consultant Detail Page)

**Edit Profile modal now includes `consultant_code`** field (master_admin only).

**Payout History entries now have Edit / Delete buttons** (master_admin only).

**Editable payout fields:**
- `amount`
- `payment_date`
- `payment_mode`
- `description` (notes/reference)

---

### 4. Projects (Project Overview Page)

**New "Edit Project" button** in the project overview header (master_admin only).

**Editable project fields:**
- `name`
- `location`
- `description`
- `total_area_sqyd`

---

## Files Changed

### Server Actions

| File | Changes |
|---|---|
| `crm/app/(admin)/plots.actions.ts` | Added `updatePlot`, `updateBooking`, `updatePayment`, `deletePayment` |
| `crm/app/(admin)/people.actions.ts` | Added `deleteClient`, `updateClientPayment`, `deleteClientPayment`, `updateConsultantPayout`, `deleteConsultantPayout` |

### UI Components

| File | Changes |
|---|---|
| `crm/app/(admin)/projects/[id]/plot/[plotId]/PlotDetailsClient.tsx` | Edit Plot modal, Edit Booking modal, Edit/Delete payment rows |
| `crm/app/(admin)/clients/[id]/ClientDetailClient.tsx` | Delete Client button, client_code in edit modal, Edit/Delete payment rows |
| `crm/app/(admin)/consultants/[id]/ConsultantDetailClient.tsx` | consultant_code in edit modal, Edit/Delete payout rows |
| `crm/app/(admin)/projects/[id]/page.tsx` | Role fetch + ProjectEditButton integration |
| `crm/app/(admin)/projects/[id]/ProjectEditButton.tsx` | **NEW** — client component for project editing |

---

## Design Decisions

- **master_admin only:** All new edit/delete controls are gated behind `role === 'master_admin'`. Regular `admin` users do not see them.
- **Hard delete for clients:** Deleting a client cascades to all related records. Affected plots are reset to `available`.
- **Commission not recalculated on payment edit:** Editing a payment amount does not retroactively change the `commission_amount` already stored on the booking. This is intentional to avoid unintended side effects.
- **Project page stays a server component:** A dedicated `ProjectEditButton.tsx` client component was extracted to keep the server component pattern for the project overview page.

---

## Related Previous Changes

- [changelog-phase-6.md](./changelog-phase-6.md) — Change request / approvals system
- Revert booking to pending feature (added same session as this changelog)
