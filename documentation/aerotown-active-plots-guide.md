# AeroTown Residency - Active Plots Filtering Guide

## Overview

Just like the **Dholera Homes 3** project, the **AeroTown Residency** project has a specific set of plots that are actively managed and owned by the client. The rest of the plots within the layout do not concern the client but still exist physically on the project map.

To handle this, we implemented a restriction logic that ensures only the actively managed plots are interactable in the CRM layout and included in data summaries, while the inactive plots are visually greyed out and non-interactable.

## The Active Plot List

Based on the client's provided Excel file, there are **42 active plots** in the AeroTown Residency project.

**Plot Numbers:**
`8, 11, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 119, 120, 121, 122, 123, 124, 125, 126, 127`

> [!NOTE]
> The square yard decimals from the original list were ignored, as the system relies on integer plot numbers, and area values have been updated to ceil values elsewhere in the system.

## Implementation Details

### 1. Data Filtering (`crm/app/project-utils.ts`)

We added a new `Set` containing the active plot numbers for AeroTown Residency:
```typescript
export const AEROTOWN_RESIDENCY_ACTIVE_PLOTS = new Set([
  8, 11, 79, ... 127
]);
```

The `filterActivePlots` function was updated to intercept requests where the project name includes `"aerotown residency"`. It then filters the raw plot list from the database, dropping any plot not found in the `AEROTOWN_RESIDENCY_ACTIVE_PLOTS` set. This ensures lists, stats, and reports only account for these 42 plots.

### 2. Layout Grid Disabling (`crm/app/(admin)/projects/[id]/layout/LayoutGridClient.tsx`)

To visually represent the inactive plots while retaining the full grid structure, we modified the `placePlot` DOM helper function. 

- When iterating through the layout map coordinates, the renderer checks if the current plot belongs to "AeroTown Residency".
- If it does, and the plot number is **not** in `AEROTOWN_RESIDENCY_ACTIVE_PLOTS`, the plot is assigned a CSS class of `status-disabled`.
- This `status-disabled` class grays out the plot, sets opacity, and uses `pointer-events: none` to disable hover tooltips or click interactions.
- The layout legend was also updated to display the "Restricted" status for AeroTown Residency, letting users understand what the grey plots mean.

## Adding or Removing Active Plots

If the client acquires or releases plots in the future, developers only need to update the `AEROTOWN_RESIDENCY_ACTIVE_PLOTS` set inside `project-utils.ts`. Both the backend filtering and the frontend visual grid will automatically update based on that list.
