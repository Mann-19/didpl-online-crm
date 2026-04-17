# Universal Implementation Guide: Electron to Next.js Migration

This document serves as the high-level architectural bridge from the existing offline Electron + SQLite CRM to a cloud-native Next.js + Supabase environment. It captures all business logic, data models, and access controls required for the transition.

---

## 1. Architecture Comparison

### Current Architecture (Legacy)
*   **Platform:** Electron desktop app running on local machine/LAN.
*   **Database:** Local SQLite file (`schema.js`).
*   **Backend:** Express.js running on node inside the electron main process.
*   **Frontend:** React Single Page Application loaded inside electron browser window.
*   **Auth:** Custom header-based auth (`x-user-role`) with hardcoded password hashing logic.
*   **Deployment:** Packaged as `.exe` with local file backups.

### Target Architecture (New)
*   **Platform:** 100% Web-based Cloud Platform.
*   **Database:** Supabase PostgreSQL with Server-Side Auth.
*   **Backend:** Next.js Server Components, Server Actions (for mutations), and Supabase RPCs/Edge Functions (for complex transactions).
*   **Frontend:** Next.js Client Components (React) with Tailwind CSS.
*   **Auth:** Supabase Auth (JWT) integrated with Next.js Middleware for strict RBAC.
*   **Deployment:** Vercel/Netlify for the Next.js app, Supabase managed cloud for the database.

**Key Transitions:**
1.  **State Management:** Replace local Express REST APIs with Next.js Server Actions for data mutation directly calling Supabase.
2.  **Authentication:** Adopt Supabase Auth instead of the local SQLite `users` table. 
3.  **Complex Transactions:** Migrating SQLite `.transaction()` logic (like Booking Confirmations and Payment Transfers) into PostgreSQL Row-Level Security (RLS) bound Server Actions or Supabase RPCs (Stored Procedures) to ensure atomic DB operations.

---

## 2. Database Schema Mapping & Supabase Design

The Migration from SQLite to PostgreSQL allows us to use robust types, foreign key constraints (cascading), and Native JSONB for metadata (replacing string hacks).

### Core Entities Migration

1.  **Users (Auth via Supabase Auth)**
    *   *Old:* `users`
    *   *New:* `auth.users` (Supabase native) paired with a `public.profiles` table.
    *   *Profiles Schema:* `id` (references auth.users.id), `role` (enum: 'master_admin', 'admin', 'employee', 'client'), `full_name`, `phone`.

2.  **People & Entity Tables**
    *   *Old Tables:* `consultants`, `clients`, `investors`, `employees`.
    *   *New Tables:* Directly map columns to PostgreSQL fields. Use `uuid` for all IDs via `uuid_generate_v4()`.

3.  **Real Estate Assets**
    *   *Old Tables:* `projects`, `plots`, `project_layouts`.
    *   *New Tables:* 
        *   `projects`: Same columns.
        *   `plots`: Map `status` to an ENUM (`available`, `sold`, `token_paid`, `partially_paid`). Use cascading FK to `projects.id`. 
        *   `project_layouts`: Use native `JSONB` for `layout_config` instead of TEXT.

4.  **Transactions (The "Race" Engine)**
    *   *Old Tables:* `general_list`, `bookings`, `payments`, `expenses`, `investments`.
    *   *New Details / Changes:*
        *   **Bookings**: Map `status` to ENUM (`negotiation`, `confirmed`, `completed`, `cancelled`).
        *   **Payments**: Transactions now strongly link via UUID. Summing payments securely via a PosgreSQL View or aggregate Server side rather than client-side math.
        *   **Investments**: Replace the regex `[SETTLEMENT_HISTORY]` string hack with a native `JSONB` column `settlement_history` to store partial payment notes!

### Row Level Security (RLS) Policies Strategy

*   **Profiles & Settings**: 
    *   Read: Admins read all; Employees read peers; Clients read only `auth.uid() = id`.
    *   Write: Master Admin only.
*   **Projects & Plots**:
    *   Read: Public or authenticated users (All roles).
    *   Write: Admins only. Employees can update plot 'status' solely via Booking Actions.
*   **Bookings (The Deal)**:
    *   Read: Client sees `client_id = auth.user()`. Admins/Employees see all.
    *   Write: Employees can Create/Update. Only Admins can Confirm/Cancel. Clients: Read-only.
*   **Payments**:
    *   Read: Admins/Employees. Clients see where `booking.client_id = auth.user()`.
    *   Write: Admins/Employees only.

---

## 3. Role & Permission Matrix

| Module / Feature | Master Admin | Admin | Employee | Client (Bespoke View) |
| :--- | :--- | :--- | :--- | :--- |
| **Login & Auth** | Full Control | Full Control | User Access | Read-Only Profile |
| **Client Management** | Read/Write/Delete | Read/Write/Delete | Read/Write | Hidden |
| **Projects & Layouts** | Read/Write/Delete | Read/Write/Delete | Read | Read-Only (Gallery view) |
| **Plot Setup** | Read/Write/Delete | Read/Write/Delete | Read | Read-Only |
| **Bookings** | Read/Write/Confirm | Read/Write/Confirm | Read/Write (Drafts) | Read-Only (My Deals) |
| **Fund Transfers** | Yes | Yes | No | No |
| **Payments/Receipts** | Read/Write | Read/Write | Read/Write | Read-Only (My Receipts) |
| **Investors & Investments** | Read/Write | Read/Write | Read | Hidden |
| **Reports & Ledger** | Full Access | Full Access | Hidden | Hidden |
| **Expenses** | Read/Write | Read/Write | Hidden | Hidden |

---

## 4. Routing Strategy (Next.js App Router)

The structure relies on layout-based authorization grouped by user segments:

\`\`\`
/src/app
  /(auth)
    /login                # Common login portal
  /(dashboard)
    /layout.tsx           # Global sidebar/header, validates session
    /page.tsx             # Role-based redirection logic
    /(admin)              # Master Admin / Admin only routes
      /settings           # System backup, manage users
      /reports            # Financial ledgers and commissions
      /expenses           # Expense tracking
    /(shared)             # Admin & Employees routes
      /clients            # Client directory
      /projects           # Project setup and layouts
      /plots              # Plot inventory
      /bookings           # Deal management and race engine
      /payments           # Receipt generation
      /consultants        # Consultant tracking
      /investors          # Investor deals
    /(client)             # Client Role exclusively
      /my-portal          # Bespoke dashboard: Plots owned, receipts
      /my-deal            # Active booking negotiations
  /api                    # Edge cases / webhooks (if necessary)
\`\`\`

---

## 5. UI Component Strategy

To maintain **pixel-perfect parity** with the electron app while leveraging Server/Client components:

1.  **Component Separation**:
    *   **Server Components**: Data Fetching wrappers, Layouts, standard Table frames.
    *   **Client Components**: Interactive forms, Modals, The SVG Map Renderer (`project_layouts`), Toasts, Charts. Use the `"use client"` directive at the lowest possible leaf node.
2.  **Tailwind Migration**:
    *   The App will use global CSS variables equivalent to the current Electron theme.
    *   Existing raw `.css` files will be mapped closely to standard Tailwind utility classes to preserve layout exactness. (e.g. `flex flex-col gap-4 bg-white shadow-md p-6 rounded-lg`).
3.  **PDF/Print Features**:
    *   Keep existing `window.print()` functionality or adapt the `react-to-print` wrapper for Welcome Letters and Receipts in the browser.
4.  **Complex UI Replacements**:
    *   **Data Tables**: Migrate custom mapping logic to robust solutions like `@tanstack/react-table` for sorting/filtering.
    *   **Forms**: Use `react-hook-form` + `zod` schema validation to replace raw Express validation and secure Server Actions.

---

## 6. Critical Back-End Logic to Preserve

*   **The "Race" Engine (Bookings Confirmation):** When a booking is marked `confirmed`, all other active bookings for that `plot_id` must immediately demote to `negotiation`, the plot status updates via `determinePlotStatus` calculating `total_paid / total_amount`, and the `general_list` queue for that plot is cleared.
*   **Fund Transfer Cascade (Payments):** A transfer from Source Booking to Target Booking requires atomic cross-table operations. If Source Booking balance falls to 0, The operation must simultaneously delete Source Payments, Delete Source Booking, and Reset Source Plot status to `available`.
*   **Investment History Regex Hack:** In SQLite, partial settlements updated a string column `[SETTLEMENT_HISTORY]...[/SETTLEMENT_HISTORY]`. In Next.js + Supabase, this will be strictly typed as a `JSONB` operations array.
*   **Commission Zeroing:** Employees with role `director` automatically get `0%` commission overrides regardless of input params.

