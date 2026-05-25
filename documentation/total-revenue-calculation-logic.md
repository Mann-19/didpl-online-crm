# Total Revenue Calculation Logic

## Overview
This document explains the logic used in the CRM's financial overview module (specifically within `projects.actions.ts -> calculateProjectStats`) to compute the **Total Revenue** (Total Value / Project Potential) for any given project.

## Core Concepts

The revenue computation relies on distinguishing between the theoretical listed price of a plot and the actual negotiated deal price of a booking. 

- **Listed Price:** Computed as `Area Size (sq.yd) x Project's Price Per Unit`. This serves as the default monetary potential of any plot.
- **Deal Value:** Computed as `Booking Total Amount - Discount Amount`. This is the finalized, negotiated price that a client actually agrees to pay.

## Calculation Rules

The `Total Revenue` for a project is derived by iterating over all active plots and calculating the revenue contribution for each plot based on the status of its bookings. The logic applies the following strict rules:

### 1. Available Plots (No Bookings)
If a plot has no bookings, its revenue contribution is strictly its **Listed Price**.

### 2. Pending Bookings
If a plot has a booking, but the booking is still marked as `pending`, the altered Deal Value is **ignored**. Until the client's booking is fully reviewed and marked as `confirmed`, the system continues to use the default **Listed Price** for that plot. This prevents unconfirmed discounts from prematurely skewing the project's financial potential.

### 3. Confirmed Bookings
Once a booking is successfully marked as `confirmed`, the system replaces the default Listed Price with the actual altered **Deal Value** of that specific booking. This allows the Total Revenue to reflect real-world discounts and final deal terms.

## Summary Formula

```text
Total Revenue = 
  SUM(Listed Price of all Available plots) + 
  SUM(Listed Price of all plots with only Pending bookings) + 
  SUM(Deal Value of all plots with Confirmed bookings)
```

> [!NOTE]
> The `Amount Received` metric continuously tracks actual payment receipts regardless of booking status. However, the `Pending Amount` balance is calculated as `Total Revenue - Amount Received`, ensuring the remaining balance naturally adjusts only when a booking is officially confirmed.
