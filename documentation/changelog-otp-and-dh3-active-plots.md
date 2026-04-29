# Changelog: Email OTP Auth & DH3 Plot Filtering

## Overview
This update implements a custom OTP-based authentication system using Resend and introduces project-specific plot filtering logic for "Dholera Homes 3", alongside major conflict resolutions and stability fixes.

## 1. Custom Email OTP Authentication System
Switched from standard Supabase password-based login to a more secure and user-friendly 6-digit Email OTP flow to bypass default SMTP rate limits.

### Changes:
- **[NEW]** `crm/utils/supabase/admin.ts`: Created a service-role Supabase client for administrative operations (managing OTPs).
- **[NEW]** `crm/app/api/auth/send-otp/route.ts`: 
    - Generates a 6-digit numeric OTP.
    - Verifies if the email belongs to an authorized user before sending.
    - Integrates with **Resend** for reliable email delivery.
    - Stores OTP in a new `otp_codes` table with a 10-minute expiry.
- **[NEW]** `crm/app/api/auth/verify-otp/route.ts`:
    - Validates the user-provided code against the database.
    - Uses `supabase.auth.admin.generateLink` to create a magic link session.
    - Returns a `token_hash` for client-side session establishment.
- **[MODIFY]** `crm/app/(auth)/login/page.tsx`:
    - Redesigned as a two-step wizard: Email Entry -> OTP Verification.
    - Added numeric-only input masking for OTP.
    - Implemented "Change Email" flow to reset the process.
- **[MODIFY]** `crm/middleware.ts`: Patched to allow public access to the new `/api/auth` routes while maintaining strict protection for admin pages.

## 2. Dholera Homes 3 Active Plots Logic
Implemented a filtering system to handle projects where only a subset of plots are currently "active" or should be displayed in the CRM.

### Changes:
- **[NEW]** `crm/app/project-utils.ts`: 
    - Defined `DH3_ACTIVE_PLOTS` (a set of 62 specific plot numbers).
    - Created `filterActivePlots` helper function.
- **[MODIFY]** `crm/app/(admin)/projects.actions.ts`:
    - Updated `getProjectsWithStats`, `getProjectOverview`, and `getProjectPlots` to apply filtering.
    - This ensures revenue, area, and status stats only reflect the 62 active plots for DH3.
- **[MODIFY]** `crm/app/(admin)/projects/[id]/layout/renderers/DholeraHomes3Layout.ts`: Integrated the filtering logic into the visual grid renderer.

## 3. Conflict Resolution & Stability Fixes
Resolved a critical merge conflict that occurred during a codebase sync, ensuring all features from the auth migration and project layouts are preserved.

### Fixes:
- **Login Page Cleanup**: Fixed syntax errors (extra braces, missing imports) and converted `window.location.href` to `router.push` for smoother transitions.
- **Commercial Layout**: Fixed a crash in `CommercialWarehouseLayout.ts` by correctly importing `placeCell` from utils.
- **Dependency Audit**: Verified `package.json` and `package-lock.json` consistency after the merge.
- **Supabase Compatibility**: Patched admin lookups to use `listUsers()` instead of the deprecated `getUserByEmail` (missing in current Supabase client version).

---
*Status: All systems verified and operational.*
