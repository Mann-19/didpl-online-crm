# Development Instructions Roadmap: Electron to Cloud Migration

This document is a strict, sequential step-by-step guide mapping out the deployment of the new Next.js + Supabase architecture for the CRM. Each phase is highly isolated to allow an AI Agent to execute it cleanly.

---

## Phase 1: Foundation (Project Setup)

**Goal:** Initialize the Next.js ecosystem, styling, and remote database connection.

1.  **Next.js Init:** Create a fresh Next.js App Router project (`npx create-next-app@latest`).
2.  **Tailwind Configuration:** Install Tailwind CSS, configure `./tailwind.config.js` to match the exact aesthetic variables (colors, fonts, spacing) from the old CRM's `globals.css` and `index.css`.
3.  **Supabase Client Setup:** 
    *   Install `@supabase/supabase-js` and `@supabase/ssr`.
    *   Setup `utils/supabase/server.ts` and `utils/supabase/client.ts` for safe server/client cookie handling.
4.  **Environment Variables:** Define `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## Phase 2: Database & Auth Setup

**Goal:** Migrate the SQLite Schema to Supabase PostgreSQL, establish the common login portal, and protect routes via RBAC middleware.

1.  **Schema Migration Script:** Execute Supabase SQL migrations to create all tables (Users/Profiles, Clients, Projects, Plots, Bookings, Payments, etc). Apply `JSONB` for Layouts and Investment Histories. Define ENUMs for statuses.
2.  **RLS Policies (Crucial):** Define Row Level Security policies per table. Example: `CREATE POLICY clients_read_policy ON clients FOR SELECT USING (true);` for Admins and Employees, but block for Clients.
3.  **Authentication UI:** Build the `/login` portal. Use Supabase email/password auth. Hook into `profiles` table to fetch user roles post-login.
4.  **Next.js Middleware:** Implement `middleware.ts` to check `auth.getSession()`.
    *   Route protections: Reject non-Admins from `/settings` and `/reports`. Redirect Clients to `/my-portal`.

---

## Phase 3: Client Dashboard (Bespoke View)

**Goal:** Create the read-only, specialized view for the end-customer.

1.  **Layout isolation:** Create `app/(client)/layout.tsx` lacking the complex sidebar of the admin view. Include a clean, minimal Header.
2.  **My Properties API:** Implement a Server Action pulling `bookings` where `client_id == session.user.id` and `status == 'confirmed'`, joined with `plots` and `projects`.
3.  **UI Component:** Build `app/(client)/my-portal/page.tsx` showing a visual gallery of owned properties.
4.  **Receipts Viewer:** Fetch `payments` linked to the client's bookings. Allow them to display/print the existing PDF design.

---

## Phase 4: Core Module - Projects & Plots

**Goal:** Migrate the physical assets tracking system.

1.  **Server Actions (Projects):** Create `getProjects`, `addProject`, `updateProject`.
2.  **Server Actions (Plots):** Create `getPlotsByProject`, `addPlot`, `updatePlot`.
3.  **UI Components:** 
    *   Build `/projects` dashboard (List View).
    *   Build Project Plot Map renderer: Translate the complex `SVG` matrix grid logic mapping `status` to colors (Green, Yellow, Orange, Red) based on the logic in `determinePlotStatus()`.
    *   Migrate `Layout Editor` tool utilizing the new `JSONB` `layout_config` column.

---

## Phase 5: Core Module - People Directory

**Goal:** Employee, Client, Consultant, and Investor contact management.

1.  **APIs & Server Actions:** Implement CRUD operations for Clients, Consultants, and Employees (excluding Supabase Auth creation, which is handles via Admin Supabase SDK).
2.  **UI Pages:**
    *   Build `/clients` table with search/filter.
    *   Build `/consultants` directory tracking their custom fields (Bank Details, PAN, Aadhar).
    *   Build `/employees` tracking designation and salary.

---

## Phase 6: Core Module - The "Race" Engine (Bookings)

**Goal:** Implement the complex negotiation state-machine logic.

1.  **Complex Action - `createBooking`:** Validate inputs. Pre-calculate commission percentage, deducting 2% TDS. Remember to force `0%` commission if the consultant's underlying employee role is `director`.
2.  **Complex Supabase RPC/Transaction - `confirmBooking`:** 
    *   Convert `lib/bookings.js -> confirmBooking()` into a Supabase Server action wrapping multiple queries or a native PG Stored Procedure.
    *   **Logic:** Demote peers to `negotiation`, elevate winner to `confirmed`, update the connected `plot` status and connect `client_id`, then delete from `general_list`.
3.  **UI Components:** `/bookings` dashboard representing ongoing deals and the active plot queue.

---

## Phase 7: Core Module - Financials (Payments, Expenses, Investments)

**Goal:** Cash-flow logic ensuring 100% data integrity.

1.  **Payments & Receipts Logging:** Implement `addPayment` with validation blocking `legal_fees`/`stamp_duty` receipt types unless the booking is 100% paid.
2.  **Atomic Fund Transfer:** Migrate `transferFunds()` from SQLite to a PG Transaction string in a Server Action. Handle the edge case where an empty source booking must gracefully self-delete alongside its payments and reset the plot status.
3.  **Expenses Manager:** Basic CRUD over the `expenses` table for office/petty cash tracking.
4.  **Investments & Settlement logic:** Modify the `settleInvestment()` action to strictly push objects into the new native Postgres JSONB `settlement_history` column rather than the legacy regex text string replacement logic.

---

## Phase 8: Core Module - Reporting & System Operations

**Goal:** Aggregate reporting for Admins.

1.  **Ledger API:** Rebuild SQL aggregate queries used in `reports.js` (`getCommissionReport`, `getRecoveryReport`, `getGeneralLedger`) into optimal server actions.
2.  **UI Reports View:** Provide robust data tables in `app/(admin)/reports`. Keep it heavily cached/memoized client-side if data load is large.
3.  **Action Parity & Cleanup:** Verify that printed pages `WelcomeLetterPreview` and `PDFPreviewModal` render identically to the legacy application. Add final system polishes.
