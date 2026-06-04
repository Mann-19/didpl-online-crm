# DIDP CRM — Backend Architecture Documentation
> **Version:** V1.0.0  
> **Date:** 2026-05-29  
> **Scope:** Complete backend logic, server actions, data flows, and architectural patterns  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Database Architecture](#4-database-architecture)
5. [Server Action Modules](#5-server-action-modules)
   - [projects.actions.ts](#51-projectsactionsts)
   - [plots.actions.ts](#52-plotsactionsts)
   - [people.actions.ts](#53-peopleactionsts)
   - [change-requests.actions.ts](#54-change-requestsactionsts)
   - [reports.actions.ts](#55-reportsactionsts)
   - [expenses.actions.ts](#56-expensesactionsts)
6. [Utility Modules](#6-utility-modules)
7. [Booking Lifecycle — Deep Dive](#7-booking-lifecycle--deep-dive)
8. [Partnership Booking Architecture](#8-partnership-booking-architecture)
9. [Plot Status State Machine](#9-plot-status-state-machine)
10. [Payment System Architecture](#10-payment-system-architecture)
11. [Employee Change Request Workflow](#11-employee-change-request-workflow)
12. [Client Portal Architecture](#12-client-portal-architecture)
13. [Known Issues & Code Quality Notes](#13-known-issues--code-quality-notes)

---

## 1. System Overview

DIDP CRM is a **Next.js 14 (App Router)** web application used to manage real estate plot sales for Dholera Infra Development Pvt. Ltd. It connects to a **Supabase (PostgreSQL)** backend with Row Level Security for data isolation.

**Core business domain:** Manage plots across multiple real estate projects, track client bookings, record instalment payments, generate receipts, handle consultant commissions, and manage investors.

**Two separate Supabase environments:**
- **Production:** `fbthhsxsmnmwoizhxlkv.supabase.co` — live data
- **Test/Dev:** `qfujzswndxzunetlacfs.supabase.co` — seeded from production via `migrate.js`

**Three active projects:**
- `AeroTown Residency` — 42 active plots
- `Dholera Homes 3` — 62 active plots
- `AeroTown Logistic Park` — all plots active

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, Server Components) |
| Database | Supabase (PostgreSQL with RLS) |
| Auth | Supabase Auth + OTP for clients |
| Server Logic | Next.js Server Actions (`'use server'`) |
| PDF Generation | jsPDF (client-side) |
| Styling | Vanilla CSS |
| Session Management | Supabase SSR + `last_active` cookie |

**Data access pattern:** All database operations go through **Next.js Server Actions** (files named `*.actions.ts` with `'use server'` directive). There are no traditional API routes for data — only for auth flows (`/api/auth/*`).

---

## 3. Authentication & Authorization

### `middleware.ts`

The **Next.js middleware** runs on every request (excluding static assets) and enforces:

1. **Session validation** — Uses Supabase `auth.getUser()` to check if user is logged in
2. **Inactivity timeout** — Reads `last_active` cookie; if `now - lastActive > 10 minutes`, signs user out and redirects to `/login?expired=true`
3. **Role-based route guard** — Fetches `profiles.role` and enforces:

| Role | Access |
|---|---|
| `client` | Only `/my-portal` and `/my-deal` |
| `employee` | All CRM routes except `/settings`, `/reports`, `/expenses`, `/approvals` |
| `admin` / `master_admin` | All routes |
| Unauthenticated | Redirect to `/login` |

> **Bug noted:** `master_admin` is not explicitly handled in the middleware role block — it falls into the `else` branch and is treated like admin. Works fine but is implicit.

### Supabase RLS

Two helper functions gate all RLS policies:
- `is_admin()` — `true` if role is `admin` OR `master_admin`
- `is_employee()` — `true` if role is `employee`

Clients access their data through RLS chains:
```
auth.uid() → clients.auth_user_id → bookings.client_id → payments.booking_id
```

### OTP Auth (Client Portal)

Clients without passwords log in via email OTP stored in the `otp_codes` table. OTPs expire and are single-use (`used = true` after consumption).

---

## 4. Database Architecture

### Current Schema Summary

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | Auth user identity & role | `id` (mirrors auth.users), `role` |
| `clients` | Plot buyers / clients | `id`, `auth_user_id`, `name`, `phone` |
| `consultants` | Sales agents earning commission | `id`, `commission_*` fields |
| `employees` | Internal staff | `profile_id` → `profiles` |
| `projects` | Real estate projects | `id`, `name`, `status` |
| `project_layouts` | Layout grid config (EMPTY) | `project_id`, `layout_config` (JSONB) |
| `plots` | Individual land units | `id`, `status`, `client_id`, `price`, `area_sqyd` |
| `bookings` | Sale agreements | `client_id`, `plot_id`, `total_amount`, `status`, `partner_client_id` |
| `payments` | Universal financial ledger | `entity_id`, `entity_type`, `booking_id`, `amount` |
| `investments` | Fixed-term investor deposits | `investor_id`, `invested_amount`, `status` |
| `investors` | Investor profiles | `id`, `name` |
| `expenses` | Company outgoings | `id`, `amount`, `expense_type` |
| `pending_changes` | Employee change request queue | `operation`, `payload`, `status` |
| `otp_codes` | Client login OTPs | `email`, `code`, `expires_at` |

### Key Constraints

- `bookings(client_id, plot_id)` — **UNIQUE** — prevents double-booking same plot by same client
- `project_layouts(project_id)` — **UNIQUE** — one layout per project (table is empty, never used)
- `plots.client_id` — stores only the **primary** client (partner stored in `bookings.partner_client_id`)

### Active Plot Filtering (Application-Level)

Two projects use **application-level** plot filtering because their DB contains all plots but only a subset are "active" for sale:

```typescript
// app/project-utils.ts
export const DH3_ACTIVE_PLOTS = new Set([1, 30, 33, ...]); // 62 plots
export const AEROTOWN_RESIDENCY_ACTIVE_PLOTS = new Set([8, 11, 79, ...]); // 42 plots

export function filterActivePlots(projectName: string, plots: any[]): any[]
```

This function is called in `getProjectsWithStats`, `getProjectOverview`, `getProjectPlots` to filter before any stats or rendering. **This is a workaround** — ideally plots would have an `is_active` flag in the DB.

---

## 5. Server Action Modules

### 5.1 `projects.actions.ts`

**Purpose:** Fetch and calculate project-level data including stats dashboards. Also handles plot fetching and layout config.

#### `calculateProjectStats(project, plots)` — Private Helper

Iterates all plots for a project and aggregates:
- `totalPlots`, `confirmedPlots`, `soldPlots`, `tokenPlots`, `cancelledPlots`, `availablePlots`
- `totalRevenue` — sum of confirmed booking deal values + list prices of non-booked plots
- `amountReceived` — sum of all payments across all active bookings
- `totalAreaSqYd`, `soldAreaSqYd`, `areaPercentageSold`
- `collectionRate`, `pendingAmount`, `clientCount`

**Important nuance:** For each plot, it first finds `activeBookings` (status = `confirmed` or `pending`). Revenue contribution only happens for confirmed bookings. The `partner_client_id` is fetched to avoid double-counting — both clients share one booking row, so stats always count once per booking.

**Issue:** `soldPlots` counter logic (`isSold && !isConfirmed`) seems contradictory — a "sold" plot is one fully paid AND confirmed. These counters are visually confusing.

#### `getProjectsWithStats()` — Public

Fetches all projects + all plots with their bookings and payments, groups by project, filters active plots per project, calculates stats, returns enriched project array.

**N+1 Problem:** Fetches ALL plots from the DB in one query then groups in JS. This is intentional and avoids N+1 per project, but results in a large payload when there are many plots.

#### `getProjectOverview(projectId)` — Public

Same as `getProjectsWithStats` but for a single project. Returns `{ project: stats, statusCounts }`.

#### `getProjectPlots(projectId)` — Public

Fetches plots for a project with client and booking data for the UI layout grid. Returns sorted list (numerically by `plot_number`).

#### `getProjectLayout(projectId)` — Public

Queries `project_layouts` table for the layout config. Returns `null` if not found (error code `PGRST116` is silently ignored). **This table is empty** — nothing calls this in a meaningful way.

#### `updateProject(projectId, formData)` — Public

Simple update to the `projects` table. Throws on error (does not return `{ success, error }` pattern — inconsistent with other actions).

#### `getProjectClients(projectId, status?)` — Public

Fetches all plots for a project with their bookings and clients, then **deduplicates by client ID** into a flat list. Optionally filters by status (confirmed/sold/token_paid/cancelled).

**Logic complexity:** This function has deeply nested conditional logic to handle cases where the plot has a directly linked client (`p.clients`) but no booking (legacy data), vs. bookings that have their own client join. There is **dead code** inside the loop — `activeBookings.length === 0 && p.clients` branch is rarely hit in practice.

---

### 5.2 `plots.actions.ts`

**Purpose:** Core booking and payment operations. The most critical action file in the system — handles all booking CRUD and state transitions.

#### `getPlotDetails(plotId, projectId?)` — Public

Fetches a single plot with full detail including:
- Project and client info
- All bookings with payments
- Partner client info (joined via `partner:partner_client_id`)
- Consultant info

Supports lookup by UUID or by `plot_number + project_id` pair.

#### `addPayment(formData)` — Public

Adds a payment record to `payments` table for a booking.

**Commission calculation:** If the booking has a `commission_percent` and a `consultant_id`, the function calculates:
```
commission_amount = payment_amount × (commission_percent / 100)
tds_amount = commission_amount × 0.02  // Fixed 2% TDS
```

Also **updates the booking's aggregate** `commission_amount` and `tds_amount` by adding to existing values.

**Issue:** Uses `formData.entity_id` to set `payments.entity_id`, which allows tracking which client (primary or partner) made the payment. However, `entity_type` is hardcoded to `'client'` — this is correct for plot payments.

#### `createBooking(formData)` — Public

Creates a new booking record and updates plot status:
1. Inserts booking with status = `'pending'`
2. Updates plot to `status: 'token_paid'` and links `client_id` — **only if plot is still `available`**
3. If plot was already `token_paid` (another booking exists), the plot update is a no-op (`.eq('status', 'available')` guard)

**Issue:** The second step silently does nothing if the plot is already occupied. There's no error returned to the caller. If someone creates a second booking on the same plot, it inserts fine (no DB constraint prevents it for different clients), but the plot doesn't update.

#### `confirmBooking(bookingId, plotId, clientId)` — Public

Marks a booking as the winning deal:
1. Sets `booking.status = 'confirmed'`
2. Cancels all OTHER pending bookings on the same plot
3. Updates plot to `status: 'sold'` and links `client_id`

This is the "winner takes the plot" operation. Called both directly and via the change-request system.

#### `cancelBooking(bookingId, plotId)` — Public

Cancels/removes a booking:
1. Deletes the booking row
2. Checks remaining bookings on the plot
3. Recalculates plot status:
   - Has confirmed booking → `sold` (early return, no update needed)
   - Has pending bookings → `token_paid`
   - No bookings → `available`, `client_id = null`

#### `transferBooking(bookingId, newPlotId)` — Public

Transfers a pending booking to a different plot:
1. Fetches current booking (plot_id, status, client_id)
2. Fetches new plot price
3. Updates booking: `plot_id = newPlotId`, `total_amount = newPlot.price`
4. Updates new plot: `status = 'token_paid'`, `client_id = clientId`
5. Recalculates old plot status using remaining bookings

**Issue:** Step 3 always resets `total_amount` to the list price of the new plot. Any custom discount negotiated on the old plot is wiped — this may or may not be intentional behavior.

**Issue:** The comment `// only pending bookings can be transferred` is present but not enforced. No guard prevents transferring a confirmed booking.

#### `getAvailablePlots(projectId)` — Public

Simple query: plots with `status = 'available'` for a given project, sorted by plot_number.

#### `getTransferablePlotsForClient(projectId, clientId)` — Public

Returns plots a specific client can transfer to:
1. All available plots in the project
2. Plots where client has a primary booking (status = pending/confirmed)
3. Plots where client is a partner

Deduplicates results, tags partnership plots with `isPartnership: true`. Used by the transfer modal to detect if the destination is a merge.

#### `addPartnerToBooking(bookingId, partnerClientId)` — Public

Simple update: sets `partner_client_id` on the booking row.

**Limitation:** No check for existing partner. Will silently overwrite existing partner if called twice.

#### `removePartnerFromBooking(bookingId)` — Public

Sets `partner_client_id = null` on the booking row. No cascading logic (partner's payment history remains tied to the booking via `entity_id`).

#### `mergeTransferIntoPartnership(sourceBookingId, targetBookingId)` — Public

The most complex operation in the system:
1. Fetches source booking and its payment IDs
2. Moves all payments to the target booking (`booking_id` update on each payment)
3. Deletes source booking
4. Recalculates source plot status

This is triggered when a client transfers to a plot where they're already a partner, merging their payment history into the partnership booking.

#### `updateBookingDiscount(bookingId, discountAmount)` — Public

Updates `discount_amount` on a booking. Simple patch.

#### `revertBooking(bookingId, plotId)` — Public

Reverts a confirmed booking back to pending:
1. Sets `booking.status = 'pending'`
2. Sets `plot.status = 'token_paid'`, `client_id = null`

**Issue:** After revert, `client_id` on the plot becomes null even though the booking still has a `client_id`. This creates an inconsistency where the booking knows its client but the plot doesn't.

#### `updatePlot(plotId, fields)` — Master Admin Only

Direct patch to `plots` table. Accepts: `plot_number`, `area_sqyd`, `price`, `status`.

#### `updateBooking(bookingId, fields)` — Master Admin Only

Direct patch to `bookings` table. Accepts: `total_amount`, `discount_amount`, `commission_percent`, `status`.

#### `updatePayment(paymentId, fields)` — Master Admin Only

Direct patch to `payments` table.

#### `deletePayment(paymentId)` — Master Admin Only

Hard deletes a single payment record.

---

### 5.3 `people.actions.ts`

**Purpose:** CRUD for clients, consultants, and employees.

#### `getClients()` — Public

Fetches all clients with their bookings → plots → projects chain to derive which projects each client is associated with. Returns enriched client objects with `projects: string[]` and `project_name: string` (first project).

#### `generateEntityCode(prefix, name)` — Private Helper

Generates human-readable codes like `CLI-MA-3821` (prefix + 2 initials + 4-digit random). Not unique-guaranteed in DB — there's no retry loop if a collision occurs.

**Issue:** Random collision risk. Should use a sequence or retry loop.

#### `addClient(formData)` — Public

Generates a `client_code` and inserts into `clients` table.

#### `getClientById(clientId)` — Public

Fetches a single client with:
- **Primary bookings** (where `client_id = clientId`) via FK hint `bookings!bookings_client_id_fkey`
- **Partnership bookings** (where `partner_client_id = clientId`) via a separate query
- Merges both arrays, tagging partnership bookings with `isPartnership: true`

Returns a unified client object where all bookings (primary + partner) are available.

#### `updateClient(clientId, formData)` — Public

Simple patch to `clients` table. Revalidates client detail and list pages.

#### `getConsultants()` / `addConsultant()` / `getConsultantById()` / `updateConsultant()` — Public

Standard consultant CRUD. `addConsultant` has field mapping logic to handle form fields that don't directly match DB columns (e.g., `residential_address` → concatenated `address`).

#### `addConsultantPayout(formData)` — Public

Adds a `debit` payment record for a consultant:
```
entity_id = consultant_id
entity_type = 'consultant'
transaction_type = 'debit'
```
This records that money was paid OUT to the consultant.

#### `getEmployees()` / `addEmployee()` — Public

Employee list fetches join `profiles` to get name and role (employees are linked to profiles). `addEmployee` only inserts into `employees` table — the `profile` must be created separately (via auth signup).

#### `deleteClient(clientId)` — Master Admin Only

Hard-delete a client with cascading cleanup:
1. Fetches all bookings for the client
2. Deletes payments tied to those bookings
3. Resets linked plots to `available` / `client_id = null`
4. Deletes the bookings
5. Deletes any direct client payments (`entity_type = 'client'`)
6. Deletes the client

**Issue:** Does NOT clean up partnership references. If this client was a `partner_client_id` on another booking, that column becomes a dangling reference (FK is `ON DELETE SET NULL` in DB, so it handles it, but the business implication isn't handled — the partnership booking becomes a solo booking without notification).

#### `updateClientPayment` / `deleteClientPayment` / `updateConsultantPayout` / `deleteConsultantPayout` — Master Admin Only

Simple patch/delete operations on `payments` table.

---

### 5.4 `change-requests.actions.ts`

**Purpose:** The employee approval workflow system. Employees submit change requests; admins approve/reject them.

#### Architecture Overview

```
Employee → submitChangeRequest() → pending_changes row
Admin → approveChange() → applyApprovedChange() → actual DB mutation
Admin → rejectChange() → marks as rejected
```

#### `submitChangeRequest(params)` — Employee

Inserts a row into `pending_changes` with:
- `entity_type`: which table is being modified
- `operation`: `create`, `update`, or `delete`
- `payload`: the full data object (for create/update) or empty (for delete)
- `description`: human-readable summary

A **PostgreSQL trigger** (`on_pending_change_insert`) fires after every insert, calling `pg_notify('pending_change', ...)` for real-time badge updates in the admin UI.

#### `getPendingChanges(statusFilter)` — Admin

Fetches pending changes with submitter and reviewer names joined from `profiles`.

#### `getPendingChangesCount()` — Admin

Returns count of `status = 'pending'` changes. Used for sidebar badge.

#### `approveChange(changeId)` — Master Admin Only

1. Validates user role (`admin` or `master_admin`)
2. Fetches the pending change
3. Calls `applyApprovedChange(change)` to execute the actual mutation
4. Marks the change as `approved`

#### `rejectChange(changeId, reason)` — Master Admin Only

Marks change as `rejected` with the admin's reason. No DB mutation applied.

#### `applyApprovedChange(change)` — Private

The dispatcher that applies the real DB change:

**Simple operations:**
- `create` → `supabase.from(table).insert([payload])`
- `update` → `supabase.from(table).update(payload).eq('id', entity_id)`
- `delete` → `supabase.from(table).delete().eq('id', entity_id)`

**Special handling for bookings:**
- `update` with `status = 'confirmed'` → calls `confirmBooking()` (triggers plot update + cancel others)
- `update` with `status = 'pending'` → calls `revertBooking()` (triggers plot status reset)
- `update` with `plot_id` → calls `transferBooking()` (triggers full transfer logic)
- `delete` → calls `cancelBooking()` (handles plot status recalculation)

**Issue:** After the special booking handlers, the code STILL runs `supabase.from(table).update(payload)` for the confirmed/pending cases. This is **redundant** because `confirmBooking` and `revertBooking` already update the booking status. The double-update is harmless but wasteful.

#### `getMyChangeRequests()` — Employee

Fetches the calling employee's own submission history.

---

### 5.5 `reports.actions.ts`

**Purpose:** Data aggregation for various report views.

#### `getLedger()` — Admin Only

All payments (credits and debits) joined with booking → client and plot → project chains. Returns a flat list for the general ledger report.

#### `getRecoveryReport()` — Admin Only

All active bookings (pending + confirmed) with their payment totals. Calculates `balance_due = deal_value - amount_paid`. Returns only rows where `balance_due > 0`. This is the "outstanding dues" report.

#### `getCommissionReport()` — Admin Only

All bookings with a consultant attached (non-cancelled). Calculates:
```
commission_earned = bookings.commission_amount (aggregated)
tds = commission_earned × 0.02
net_payable = commission_earned - tds
paid_out = sum of debit payments where entity_type = 'consultant'
balance_due = net_payable - paid_out
```

**Issue:** `tds` is recalculated client-side here as `commission × 0.02`, but it's also stored in `bookings.tds_amount`. These could drift if TDS rate changes.

#### `getBookingReport()` — Admin Only

All non-cancelled bookings in a flat list with deal value, payments, and balance.

#### `getReceiptReport()` — Admin Only

All credit payments (incoming money) with client address details. Used for generating the receipt report with client info for official documents.

#### `getExpenseReport()` — Admin Only

All expenses ordered by date. Simple passthrough.

---

### 5.6 `expenses.actions.ts`

**Purpose:** Company expense CRUD.

#### `getExpenses()` / `addExpense()` / `updateExpense()` / `deleteExpense()`

Standard CRUD for the `expenses` table. `addExpense` accepts all expense fields and inserts with current date if none provided. Revalidates both `/expenses` and `/reports/expenses` paths.

---

## 6. Utility Modules

### `utils/supabase/server.ts`

Creates a **server-side Supabase client** using `@supabase/ssr`. Reads from env vars `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. All server actions import and use this.

### `utils/supabase/client.ts`

Browser-side Supabase client (used in client components).

### `utils/generateReceipt.ts`

PDF receipt generator using `jsPDF`. Takes `ReceiptData` (client name, gender, address, amount, payment mode, transaction ID) and generates a branded A4 PDF with:
- Company logo
- Payment acknowledgement header
- Boxed client and payment info table
- Amount in Indian number words (Crore/Lakh/Thousand)
- Terms & conditions
- No signature required (computer-generated)

### `utils/formatNumber.ts`

Formats numbers to Indian number system (lakhs/crores).

### `utils/exportToCSV.ts`

Utility for exporting report data as CSV files.

### `utils/pdf/` (directory)

Contains allotment letter generation. Supports optional `partner_name` for partnership bookings.

### `app/project-utils.ts`

Contains `filterActivePlots()` and the hardcoded active plot number sets for `DH3_ACTIVE_PLOTS` and `AEROTOWN_RESIDENCY_ACTIVE_PLOTS`. This application-level filter is applied in 3 places in `projects.actions.ts`.

---

## 7. Booking Lifecycle — Deep Dive

The booking lifecycle is the most critical business process:

```
Plot Status:   available ──────────────────────────────────────────► sold
                  │                                                    │
                  │ createBooking()                                    │
                  ▼                                                    │
              token_paid ──── confirmBooking() ───────────────────────┘
              (+ booking.status='pending')   (booking.status='confirmed')
```

### Step 1: Create Booking
- `createBooking()` is called with plot_id, client_id, total_amount, optional consultant/commission
- Booking row created with `status = 'pending'`
- Plot updated to `status = 'token_paid'`, `client_id = client_id`
- **Multiple pending bookings can exist** on a plot — the UNIQUE constraint is `(client_id, plot_id)` not just `plot_id`

### Step 2: Confirm Booking (Winner Selection)
- `confirmBooking()` is called with the winning booking
- Winning booking: `status = 'confirmed'`
- All other pending bookings on same plot: `status = 'cancelled'`
- Plot: `status = 'sold'`, `client_id = winning client`

### Step 3: Cancel Booking
- `cancelBooking()` deletes the booking row
- Recalculates plot status from remaining bookings
- If no bookings remain → `available`, clear `client_id`

### Transfer Flow
- `transferBooking()` moves a booking to a new plot
- Payments follow the booking_id (they auto-move since they reference `booking_id`)
- Old plot status recalculated; new plot set to `token_paid`
- `total_amount` reset to new plot's list price

### Merge Flow (Transfer to Partnership Plot)
- `mergeTransferIntoPartnership()` handles transfer to a plot where client is already a partner
- All payment records re-attributed (`booking_id` updated to target booking)
- Source booking deleted
- Source plot status recalculated

---

## 8. Partnership Booking Architecture

### Current Implementation

The partnership model uses a **single `partner_client_id` FK** on the `bookings` table:

```sql
bookings.partner_client_id UUID REFERENCES clients(id) ON DELETE SET NULL
```

This limits partnerships to exactly **2 clients**: one primary (`client_id`) and one partner (`partner_client_id`).

### Who is Primary vs Partner

| Attribute | Primary Client | Partner Client |
|---|---|---|
| `bookings.client_id` | ✅ | ❌ |
| `bookings.partner_client_id` | ❌ | ✅ |
| `plots.client_id` | ✅ | ❌ |
| Can view booking (RLS) | ✅ | ❌ (partner has NO RLS access to booking) |

### Payment Attribution

`payments.entity_id` stores the client ID of whoever made the payment. When adding a payment on a partnership booking, the UI presents a "Payment By" dropdown letting admin choose primary or partner. Both payments sum into the booking total.

### Partnership UI Touch Points

- **Plot detail page:** Shows both client names in booking header, "Add Partner" / "Remove Partner" buttons
- **Client detail page:** Partner bookings shown with purple "Partnership" badge, primary client name displayed
- **Allotment letter:** `Dear Client A & Partner B,` when partner is present

### Limitation: No RLS for Partner Client

The `bookings_client_read` RLS policy checks `bookings.client_id = auth.uid()` (via clients chain). Partner clients cannot see the booking from their portal because `partner_client_id` is not checked in RLS.

---

## 9. Plot Status State Machine

```
         ┌─────────────┐
         │  available  │◄──── cancelBooking() [no remaining bookings]
         └──────┬──────┘
                │ createBooking()
                ▼
         ┌─────────────┐
         │  token_paid │◄──── cancelBooking() [pending bookings remain]
         └──────┬──────┘      revertBooking() [from sold]
                │ confirmBooking()
                ▼
         ┌─────────────┐
         │    sold     │◄──── confirmBooking() [plot gets confirmed client]
         └─────────────┘
```

**`partially_paid` status:** Exists in the enum and is referenced in `calculateProjectStats` and `getProjectClients` as a conditional (`status === 'partially_paid'`). However, **no code ever sets a plot to `partially_paid`**. It appears to be a legacy value that was planned but never implemented. The system uses `token_paid` as the intermediate state for all non-confirmed bookings.

---

## 10. Payment System Architecture

### Universal Ledger Design

The `payments` table acts as a universal ledger via polymorphic association:

```
entity_type = 'client'     → entity_id = clients.id
entity_type = 'consultant' → entity_id = consultants.id
entity_type = 'investor'   → entity_id = investors.id
entity_type = 'other'      → entity_id = (anything)
```

`entity_id` is NOT a formal FK — the app code resolves the relationship based on `entity_type`.

### Payment Flow for Client Booking

```
1. Client makes payment → addPayment()
2. Payment inserted:
   - entity_id = client.id (or partner.id)
   - entity_type = 'client'
   - transaction_type = 'credit'
   - booking_id = booking.id
3. If commission exists:
   - commission_amount calculated from payment × commission_percent
   - tds_amount = commission_amount × 2%
   - booking.commission_amount += new commission
   - booking.tds_amount += new TDS
```

### Payment Flow for Consultant Payout

```
1. Admin pays consultant → addConsultantPayout()
2. Payment inserted:
   - entity_id = consultant.id
   - entity_type = 'consultant'
   - transaction_type = 'debit'
   - booking_id = NULL
```

### Balance Calculation

Balance due = `total_amount - discount_amount - SUM(payments.amount WHERE booking_id = booking.id)`

This is always calculated in application code — there's no DB computed column.

---

## 11. Employee Change Request Workflow

### Architecture

```
Employee action
    │
    ├── Is it a CREATE for a new client/consultant? → Direct insert (employees have insert access)
    │
    └── Is it an UPDATE or DELETE? → submitChangeRequest()
                                          │
                                          └── pending_changes row inserted
                                                │
                                                └── pg_notify('pending_change') fires
                                                      │
                                                      └── Frontend badge updates via Realtime
```

### Supported Entity Types

```typescript
type EntityType = 'client' | 'consultant' | 'booking' | 'payment' | 'expense' | 'plot'
```

### Change Approval with Side Effects

When admin approves a booking change, `applyApprovedChange` has special logic:
- `status = 'confirmed'` → routes to `confirmBooking()` (handles plot + cancel others)
- `status = 'pending'` → routes to `revertBooking()` (handles plot reset)
- `plot_id changed` → routes to `transferBooking()` (handles full transfer)
- `delete` → routes to `cancelBooking()` (handles cleanup)

After routing to special handlers for confirm/pending cases, the code ALSO runs a generic update — **this is redundant for confirmed/reverted bookings** since the specialized functions already update the status.

---

## 12. Client Portal Architecture

### Access Flow

1. Client enters email at `/login`
2. OTP sent to email, stored in `otp_codes` table
3. Client enters OTP → verified → Supabase auth session created
4. Middleware routes client to `/my-portal`
5. Client can see their bookings and payment history (RLS enforced)

### Data Visibility via RLS

```
Client sees:
  bookings WHERE client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
  payments WHERE booking_id IN (SELECT id FROM bookings WHERE client_id IN (...))
```

**Gap:** Partner clients cannot see partnership bookings through RLS. `partner_client_id` is not checked in the policy.

---

## 13. Known Issues & Code Quality Notes

### 🔴 Critical

1. **`bookings(client_id, plot_id)` UNIQUE constraint** — Allows the same plot to have bookings from different clients simultaneously. Only one client per plot is blocked. The system is designed for multiple pending bidders but the UI flow doesn't clearly present this as multi-bidder.

2. **`partner_client_id` not in client RLS** — Partner clients cannot see the booking from their client portal. This is a functional gap.

### 🟡 Quality Issues

3. **`partially_paid` status is dead code** — The enum value exists and is referenced in stats logic, but no function ever sets a plot to `partially_paid`. Should be removed.

4. **`project_layouts` table never used** — `getProjectLayout()` exists but is not called by any UI component in a meaningful way. Table is empty.

5. **Double-update in `applyApprovedChange`** — After routing confirmed/reverted bookings to specialized handlers, the generic update still runs.

6. **`generateEntityCode` collision risk** — Random 4-digit suffix with no DB retry. Can fail with a duplicate key error on high-volume usage.

7. **`transferBooking` overwrites discount** — `total_amount` is always reset to new plot's list price. Any negotiated price is lost.

8. **`revertBooking` unlinks `client_id` from plot** — After revering from `confirmed` to `pending`, `plots.client_id` becomes null but `bookings.client_id` still knows the client. Inconsistency.

9. **`updateProject` throws instead of returning `{success, error}`** — Inconsistent error handling pattern vs. all other actions.

10. **`getProjectClients` dead-code branch** — The `activeBookings.length === 0 && p.clients` fallback block handles legacy data that shouldn't exist in a clean DB.

11. **Active plots filter is hardcoded** — `project-utils.ts` has hardcoded plot number sets. Adding new plots requires a code deployment.

12. **No transaction support** — Multi-step operations (like `createBooking`, `confirmBooking`, `mergeTransferIntoPartnership`) execute multiple separate DB calls. A failure mid-way leaves the DB in an inconsistent state.

13. **Commission aggregation on booking is cumulative append** — `addPayment` adds to `bookings.commission_amount` instead of recalculating from all payments. If a payment is deleted, the aggregate isn't corrected.

### 🟢 Design Decisions Worth Noting

14. **No server-side pagination** — All queries return full result sets. Fine for current scale but will need pagination as data grows.

15. **`entity_id` as non-FK** — The polymorphic payment entity design is flexible but loses referential integrity. Could cascade-break if a client/consultant is hard-deleted.

---

*End of Backend Architecture Documentation V1.0.0 — 2026-05-29*
