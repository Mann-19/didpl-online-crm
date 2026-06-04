# Changelog: Phase 3 (Client Dashboard)

## What We Did
We built the complete Bespoke Client Dashboard. This provides an isolated, read-only web portal for end-customers to securely log in, view their finalized property portfolio, and generate/download their payment receipts as PDFs.

## How We Did It & What Changed
1. **Layout Isolation**
   - Created `app/(client)/layout.tsx` featuring a clean, minimalistic top-navigation bar (removing the complex admin sidebar entirely).
   - Added a secure "Sign Out" button that interfaces directly with Supabase Auth.
2. **Data Fetching API (Server Actions)**
   - Created `app/(client)/my-portal/actions.ts` to securely fetch data.
   - Designed advanced Supabase joins to fetch `bookings` (joined with `plots` and `projects`) and `payments` exclusively where the `client_id` strictly matches the currently authenticated user's profile. 
3. **Client UI Gallery**
   - Built `app/(client)/my-portal/page.tsx` with a two-tab interface (Properties & Receipts).
   - Designed premium "Owned Plot" cards displaying key metrics (Sq.Yd, Sq.M, Project Name, Booking Code).
   - Designed a clear, structured table for all payments made by the client.
4. **Legacy PDF Receipts Porting**
   - Installed `jspdf`.
   - Cleaned up and ported `formatNumber.ts` to strictly handle edge cases in the Indian numbering system.
   - Exactly ported `generateReceipt.ts` from the legacy offline codebase, ensuring all precise layout coordinates, terms and conditions, and watermark injections match the old design pixel-for-pixel.
   - Built the modern `PDFPreviewModal.tsx` allowing clients to view the generated receipt in an iframe overlay before downloading.

## File Modifications Summary
- `[NEW]` `crm/app/(client)/layout.tsx`: The minimal client wrapper.
- `[NEW]` `crm/app/(client)/my-portal/page.tsx` & `actions.ts`: The main dashboard UI and secure data fetchers.
- `[NEW]` `crm/components/PDFPreviewModal.tsx`: The overlay modal for receipt previewing.
- `[NEW]` `crm/utils/formatNumber.ts`: The Indian numbering system formatter.
- `[NEW]` `crm/utils/generateReceipt.ts`: The exact port of the legacy PDF receipt generator.

## Plan for Next Step (Phase 4: Core Admin Dashboard)
We will now move to Phase 4, which involves building the heavy-duty Admin Dashboard and migrating the core internal modules.
1. **Admin Layout:** Replicate the complex legacy sidebar in `app/(admin)/layout.tsx`.
2. **Dashboard Metrics:** Build API endpoints and UI to fetch overall stats (total collections, total bookings, due payments).
3. **People Module:** Migrate the Clients & Employees management tables.
