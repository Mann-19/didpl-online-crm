# Temporary Government Fees Logic (v200)

## Overview
This document outlines the temporary logic implemented to group government fees into a single cumulative fee category. The previous multi-fee structure (Stamp Duty, Maintenance, Registration) has been hidden, and only a single "Legal Fees" field is exposed to the user. Behind the scenes, this utilizes a newly added `gov_fees` column in the `booking_fees` table.

## Changes Made
All code changes related to this temporary logic are marked with the comment `// TEMPORARY_GOV_FEES_V200`.

### 1. Database & Actions
*   **Column Added:** A `gov_fees` column was added to the `booking_fees` table.
*   **`plots.actions.ts`:** Modified `updateBookingFees` to accept an optional `govFees` parameter and save it to the database.

### 2. Plot Details (`PlotDetailsClient.tsx`)
*   **State:** The `bookingFees` state maps the DB `gov_fees` property to `govFees`.
*   **Calculate Fees Modal:** 
    *   The "Legal Fees" input uses the `govFees` value and saves to it.
    *   Inputs for Stamp Duty, Maintenance, and Registration have been commented out and hidden.
*   **Financial Details Breakdown:**
    *   The original yellow box for Government & Additional Fees (showing the 4 fee types) has been hidden.
    *   A new purple box specifically for "Legal Fees" has been added, parsing its amount from `govFees` and tracking payments with `payment_type === 'Gov fees'`.
*   **Add Payment Modal:**
    *   The dropdown to manually select a fee type has been replaced with static text that defaults to "Plot payment" or displays "Legal Fees" when the user clicks the specific "Add Fee" button inside the financial details breakdown.
    *   Added a Ref ID (`transaction_id`) field that appears whenever the payment mode is not "Cash".

### 3. Reports
*   **`BookingClient.tsx`, `LedgerClient.tsx`, `ReceiptsClient.tsx`, `RecoveryClient.tsx`:**
    *   Checkboxes for Stamp Duty, Maintenance, and Registration have been commented out in the UI.
    *   Only the "Legal Fees" checkbox remains.
    *   Calculations and exports that previously looked at `legal_fees` now look at `gov_fees`.
    *   The payment tracking logic matches on `payment_type === 'Gov fees'` (and includes fallback to `Legal fees`).

## Reversion Instructions
To revert this logic and restore the individual fee categories:
1. Search the codebase for `TEMPORARY_GOV_FEES_V200`.
2. Uncomment the hidden sections in `PlotDetailsClient.tsx` (the Calculate Fees modal inputs and the yellow financial breakdown box).
3. Remove the new purple "Legal Fees" section in `PlotDetailsClient.tsx`.
4. Restore the `payment_type` select dropdown in the Add Payment Modal.
5. In the report files (`*Client.tsx`), uncomment the checkboxes for Stamp Duty, Maintenance, and Registration.
6. Revert the data mappings back from `gov_fees` to `legal_fees` in the report table/export functions.
7. Drop the `gov_fees` column from the database if no longer needed.
