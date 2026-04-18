# Changelog: Phase 1 & Phase 2 (Foundation, Database, & Auth)

## What We Did
We successfully established the foundational architecture for the new cloud-based DIDP CRM. This involved scaffolding a fresh Next.js App Router project, linking it to Supabase for PostgreSQL database management and Authentication, and perfectly replicating the legacy login UI.

## How We Did It & What Changed
1. **Next.js & Tailwind Initialization**
   - Initialized the new Next.js project in the `crm` directory.
   - Migrated the global styling rules from the legacy Electron `didp-crm`, specifically injecting `.tabular-nums` for consistent financial number rendering and ensuring the `Inter` font is universally applied to maintain the exact look and feel of the offline CRM.
2. **Supabase Integration**
   - Installed `@supabase/supabase-js` and `@supabase/ssr` to handle secure server-side cookies.
   - Created `utils/supabase/client.ts` and `server.ts` to manage auth tokens safely across both Server and Client Components.
3. **Database Schema Migration**
   - Converted the old SQLite schema into a robust PostgreSQL schema.
   - Mapped old textual statuses into strict PostgreSQL `ENUM`s (e.g., preserving `sold` for plot states, standardizing roles to `admin`, `employee`, and `client`).
   - Cleaned up redundant tables (e.g., removed `general_list` queue) and securely merged `employees` base auth details into a universal `public.profiles` table linked directly to Supabase `auth.users`.
   - Setup Row Level Security (RLS) policies enforcing the Role Matrix.
4. **Authentication & Route Protection**
   - **Login UI:** Replicated the legacy login screen perfectly in `app/(auth)/login/page.tsx` using `lucide-react` icons and the `DIDPL-LOGO.png` watermark. We modernized the underlying logic using Next.js 15 Server Actions (`useActionState`).
   - **Middleware:** Implemented `middleware.ts` to intercept route requests. It ensures clients can only access `/my-portal`, admins/employees access `/dashboard`, and unauthenticated users are kicked back to `/login`.
   - **Inactivity Timeout:** Added a strict 10-minute session expiration mechanism powered by a rolling `last_active` cookie interceptor in the middleware.

## File Modifications Summary
- `[NEW]` `crm/app/(auth)/login/page.tsx` & `actions.ts`: The pixel-perfect login portal and its secure server action.
- `[NEW]` `crm/middleware.ts`: The central nervous system for Role-Based Access Control and session expiration.
- `[NEW]` `crm/utils/supabase/client.ts` & `server.ts`: Supabase SSR adapters.
- `[MODIFIED]` `crm/app/globals.css` & `layout.tsx`: Tailwind v4 aesthetics and `Inter` font injection.
- `[NEW]` `schema.sql` (in artifacts): The master PostgreSQL initialization script.

## Plan for Next Step (Phase 3: Client Dashboard)
We will now move to Phase 3, which focuses on creating the bespoke, read-only view for the end-customers (Clients).
1. **Layout Isolation:** Create `app/(client)/layout.tsx` which will have a clean, minimal header (omitting the complex admin sidebar).
2. **Data Fetching API:** Create Server Actions to securely pull `bookings` where `client_id` matches the logged-in user and join the data with `plots` and `projects`.
3. **UI Gallery:** Build `app/(client)/my-portal/page.tsx` to visually display the client's owned properties.
4. **Receipts Viewer:** Connect the `payments` table to allow clients to view and print their existing PDF receipt designs natively in the browser.
