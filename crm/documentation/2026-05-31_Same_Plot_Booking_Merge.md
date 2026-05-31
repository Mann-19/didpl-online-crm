# Same-Plot Booking Merge

**Date**: 2026-05-31
**Feature Name**: Same-Plot Booking Merge
**Author**: Antigravity

## Overview
This feature introduces the ability to seamlessly merge two or more distinct bookings that share the same plot, directly from the Plot Details view. Instead of requiring a workaround involving manual partner additions and cross-plot transfers, agents can now click a single "Merge" button to consolidate multiple negotiations.

## Approach Taken
1. **Backend Action**: Created `mergeBookingsOnSamePlot` in `app/(admin)/plots.actions.ts`.
   - Fetches the source booking (the one being merged) and the target booking.
   - Extracts the primary client and all existing partners from the source booking.
   - Bulk-upserts these clients as new partners into the target booking.
   - Reassigns all payments attached to the source booking over to the target booking.
   - Deletes the original source booking entirely.

2. **UI Additions**: Updated `PlotDetailsClient.tsx`.
   - **Merge Button**: Appears next to the Transfer button for `pending` bookings, but *only* if there are multiple active bookings on the plot.
   - **Merge Modal**: Renders a dropdown containing all *other* bookings on the current plot. This dropdown safely filters out the source booking so the user cannot accidentally merge a booking into itself.
   - Connected the UI to the backend action, providing immediate success/error feedback via toasts.

## Files Modified
- `app/(admin)/plots.actions.ts`: Added the backend logic for the transaction.
- `app/(admin)/projects/[id]/plot/[plotId]/PlotDetailsClient.tsx`: Added the UI modal, states, and the action button.

## Considerations
- **Data Integrity**: Uses Supabase Postgres unique constraints (`onConflict: 'booking_id, client_id'`) when adding partners to gracefully handle scenarios where the client might already be listed as a partner.
- **Client Safety**: A safeguard ensures the target booking's own primary client is not accidentally listed as a partner on their own booking during the consolidation phase.
