# CRM Reports Section - Development Instructions

This document provides detailed instructions and specifications for an AI agent to develop the Reports Section for the DIDP CRM (Next.js + Supabase migration). 

## 1. Architectural Overview & Tech Stack
- **Framework:** Next.js (App Router)
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS, `lucide-react` for icons
- **UI Components:** Reusable components (e.g., `DataTable`, `FilterBar`, `KPICard`) should be implemented for consistency across all reports.
- **Export Functionality:** All reports must include "Export to CSV" and "Export to PDF" capabilities.

## 2. Shared UI Components to Develop
Before building individual reports, ensure the following shared components exist or develop them:
1. **`ReportLayout`**: A standard wrapper providing a consistent header, title, description, and export buttons.
2. **`FilterBar`**: A configurable component supporting Date Range pickers, Dropdowns (Projects, Consultants, Clients, Status), and Search Inputs.
3. **`KPICards`**: Top-level summary cards showing aggregate numbers (e.g., Total Revenue, Outstanding Dues) with icons and trend indicators.
4. **`DataTable`**: A responsive, sortable, and paginated data grid.

---

## 3. Detailed Report Specifications

### 3.1. General Ledger (`/reports/ledger`)
- **Description:** Complete transaction history across all entities (Clients, Consultants, Investors).
- **UI Type:** Chronological data grid with running balance.
- **Features:**
  - **Filters:** Entity Type (Dropdown: Client/Consultant/Investor), Entity ID/Name (Searchable Dropdown), Date Range (From/To).
  - **KPIs:** Total Debit, Total Credit, Current Balance.
  - **Data Columns:** Date, Transaction ID, Description/Particulars, Ref/Cheque No, Debit, Credit, Running Balance.
  - **Backend Logic:** Query unified transactions or aggregate `receipts`, `payments`, and `expenses` tables ordered by date. Calculate running balance iteratively.

### 3.2. Recovery Report (`/reports/recovery`)
- **Description:** Track outstanding payments, dues, and recovery status per plot and client.
- **UI Type:** Data grid with visual progress indicators and status badges.
- **Features:**
  - **Filters:** Project, Client Name, Plot Number, Status (Overdue, On-Track, Fully Paid).
  - **KPIs:** Total Expected Amount, Total Recovered Amount, Total Outstanding.
  - **Data Columns:** Client Name, Project, Plot No, Total Value, Amount Paid, Amount Outstanding, Next Installment Date, Status.
  - **Backend Logic:** Join `clients`, `plots`, `installments`/`payment_schedules`, and `receipts`. Calculate `Amount Outstanding` = `Total Value` - `Amount Paid`. Highlight rows where `Next Installment Date` is in the past.

### 3.3. Book Plot Report (`/reports/booking`)
- **Description:** Summary of booked plots, current availability, and project-wise occupancy.
- **UI Type:** Analytics dashboard with visual charts (Occupancy Pie Chart) and data grid.
- **Features:**
  - **Filters:** Project, Status (Available, Booked, Hold), Date Range (for bookings).
  - **KPIs:** Total Plots, Plots Booked, Plots Available, Total Booking Value.
  - **Data Columns:** Plot No, Size, Type, Current Status, Booked By (Client), Consultant (if any), Booking Date, Value.
  - **Backend Logic:** Query `plots` joined with `projects` and `bookings`. Group by project to generate occupancy stats.

### 3.4. Commission Report (`/reports/commission`)
- **Description:** Breakdown of consultant commissions earned, paid, and pending payouts.
- **UI Type:** Data grid with grouped rows (Group by Consultant).
- **Features:**
  - **Filters:** Consultant Name, Project, Date Range.
  - **KPIs:** Total Commission Earned, Total Commission Paid, Total Pending Payouts.
  - **Data Columns:** Consultant Name, Project, Plot Booked, Sale Value, Commission %, Commission Amount, Amount Paid, Pending Balance, Status.
  - **Backend Logic:** Query `consultants`, `bookings`, and `commission_payments`. Join these to show the lifecycle of a commission from generation to payout.

### 3.5. Receipt Register (`/reports/receipt`)
- **Description:** Log of all receipts generated, searchable by date, client, or payment mode.
- **UI Type:** Chronological data grid.
- **Features:**
  - **Filters:** Date Range, Client Name, Payment Mode (Cash, Cheque, Online Transfer, etc.), Receipt Number.
  - **KPIs:** Total Receipts Count, Total Amount Received (split by payment mode).
  - **Data Columns:** Receipt No, Date, Client Name, Project/Plot, Payment Mode, Ref/Cheque No, Amount, Action (View/Print).
  - **Backend Logic:** Query the `receipts` table. Implement a slide-out panel or modal for viewing the full receipt details when the user clicks 'View'.

### 3.6. Expense Report (`/reports/expense`)
- **Description:** Track and manage company expenses with detailed payment and bank information.
- **UI Type:** Data grid grouped by Expense Category.
- **Features:**
  - **Filters:** Date Range, Expense Category, Payment Mode, Payee.
  - **KPIs:** Total Expenses, Highest Expense Category (e.g., "Marketing: $5,000").
  - **Data Columns:** Date, Voucher/Ref No, Payee Name, Category, Description, Payment Mode, Amount, Status.
  - **Backend Logic:** Query the `expenses` table. Sum expenses grouped by category for the KPIs.

---

## 4. General Development Guidelines for the Agent
1. **Aesthetics & Premium UI:** The reports must not look basic. Use modern typography (Inter/Roboto), subtle micro-animations (hover effects on rows), and clear visual hierarchies. 
2. **Skeleton Loaders:** Implement smooth skeleton loaders for the DataGrid and KPICards while data is fetching from Supabase.
3. **Empty States:** Design beautiful empty states (with illustrations and clear messaging) when a filter yields no results.
4. **Data Formatting:** Ensure all currency amounts are properly formatted (e.g., using `Intl.NumberFormat`) and dates are localized (e.g., `DD/MM/YYYY`).
5. **Security / RLS:** Ensure all data fetches are authenticated and respect Row Level Security (RLS) policies in Supabase. Admin users should see all records; restricted roles should only see permitted data.
