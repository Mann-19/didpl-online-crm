# DIDP CRM — Database Schema Reference

> **Database**: Supabase (PostgreSQL)  
> **Schema**: `public`  
> **Auth Layer**: Supabase Auth (`auth.users`)  
> **Row Level Security**: Enabled on all tables

---

## Table of Contents

1. [Enums & Custom Types](#enums--custom-types)
2. [Tables](#tables)
   - [profiles](#-profiles)
   - [clients](#-clients)
   - [consultants](#-consultants)
   - [employees](#-employees)
   - [projects](#-projects)
   - [project_layouts](#-project_layouts)
   - [plots](#-plots)
   - [bookings](#-bookings)
   - [payments](#-payments)
   - [investments](#-investments)
   - [investors](#-investors)
   - [expenses](#-expenses)
   - [pending_changes](#-pending_changes)
   - [otp_codes](#-otp_codes)
3. [Relationships & Foreign Keys](#relationships--foreign-keys)
4. [RLS Policies Summary](#rls-policies-summary)
5. [Functions & Triggers](#functions--triggers)
6. [Indexes](#indexes)
7. [Entity Relationship Overview](#entity-relationship-overview)

---

## Enums & Custom Types

These are PostgreSQL ENUM types used across tables to enforce valid values.

| Enum Name | Allowed Values | Used In |
|---|---|---|
| `role_enum` | `admin`, `employee`, `client`, `master_admin` | `profiles.role` |
| `gender_enum` | `Male`, `Female`, `Other` | `clients.gender` |
| `booking_status_enum` | `pending`, `confirmed`, `completed`, `cancelled` | `bookings.status` |
| `plot_status_enum` | `available`, `sold`, `token_paid`, `partially_paid` | `plots.status` |
| `receipt_type_enum` | `payment`, `stamp_duty`, `legal_fees`, `maintenance` | `payments.receipt_type` |
| `entity_type_enum` | `client`, `investor`, `consultant`, `other` | `payments.entity_type` |
| `transaction_type_enum` | `credit`, `debit` | `payments.transaction_type` |
| `investment_status_enum` | `pending`, `settled` | `investments.status` |

---

## Tables

---

### 📋 `profiles`

**Purpose**: Stores user identity and role for every authenticated user. Mirrors `auth.users` — one profile per Supabase auth user. This is the **central identity table** that drives role-based access across the entire system.

**Auto-created by**: The `handle_new_user` trigger fires on every new `auth.users` insert and automatically creates a profile with role `admin`.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | — | Primary key. **Mirrors `auth.users.id`** directly (no separate UUID generated) |
| `role` | `role_enum` | YES | `'client'` | User's system role. Controls all RLS policies |
| `full_name` | `text` | YES | — | Display name of the user |
| `phone` | `text` | YES | — | Contact phone number |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `FK`: `id → auth.users(id) ON DELETE CASCADE` (deleting auth user deletes profile)

**Notes**:
- A `profile.id` is referenced by `employees.profile_id` and `investments.referral_user_id`
- Only one profile per auth user (1:1 relationship)

---

### 👤 `clients`

**Purpose**: Stores real estate clients — people who purchase or book plots. Can optionally be linked to a Supabase auth account (for client portal login).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `auth_user_id` | `uuid` | YES | — | Link to `auth.users(id)`. NULL if client has no portal login. Enables client self-service view |
| `client_code` | `text` | YES | — | Human-readable unique code (e.g., `CLI-001`). **Unique** |
| `name` | `text` | NOT NULL | — | Full legal name |
| `gender` | `gender_enum` | YES | — | `Male` / `Female` / `Other` |
| `phone` | `text` | YES | — | Primary contact number |
| `email` | `text` | YES | — | Email address |
| `birthdate` | `date` | YES | — | Date of birth |
| `occupation` | `text` | YES | — | Current occupation/profession |
| `pan_number` | `text` | YES | — | PAN card number (India tax ID) |
| `aadhar_number` | `text` | YES | — | Aadhaar card number (India national ID) |
| `residential_address` | `text` | YES | — | Home address (full text) |
| `residential_state` | `text` | YES | — | Home state |
| `residential_city` | `text` | YES | — | Home city |
| `residential_pincode` | `text` | YES | — | Home PIN code |
| `office_address` | `text` | YES | — | Office address (full text) |
| `office_state` | `text` | YES | — | Office state |
| `office_city` | `text` | YES | — | Office city |
| `office_pincode` | `text` | YES | — | Office PIN code |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `client_code`
- `UNIQUE`: `auth_user_id` (one client per auth account)
- `FK`: `auth_user_id → auth.users(id) ON DELETE SET NULL`

**Notes**:
- A client can have **multiple bookings** (one booking per plot)
- A client can be assigned to **multiple plots** via `plots.client_id`
- When `auth_user_id` is set, that logged-in user can see their own bookings and payments

---

### 🤝 `consultants`

**Purpose**: External sales agents or channel partners who bring in clients. They receive commission on bookings they facilitate.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `consultant_code` | `text` | YES | — | Human-readable unique code (e.g., `CON-001`). **Unique** |
| `name` | `text` | NOT NULL | — | Full name |
| `phone` | `text` | YES | — | Contact number |
| `email` | `text` | YES | — | Email address |
| `address` | `text` | YES | — | Full address |
| `bank_name` | `text` | YES | — | Bank name for commission payouts |
| `account_number` | `text` | YES | — | Bank account number |
| `ifsc_code` | `text` | YES | — | Bank IFSC code (India) |
| `pan_number` | `text` | YES | — | PAN number (for TDS deduction on commission) |
| `aadhar_number` | `text` | YES | — | Aadhaar number |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `consultant_code`

**Notes**:
- Referenced in `bookings.consultant_id` (optional — a booking may or may not have a consultant)
- Commission is recorded in `bookings.commission_percent` and `bookings.commission_amount`

---

### 👔 `employees`

**Purpose**: Internal employees of the company. Linked to a `profiles` record (they must have a login). Stores job-specific info like designation and salary.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `profile_id` | `uuid` | YES | — | Links to `profiles.id`. **Unique** — one employee record per profile |
| `employee_code` | `text` | YES | — | Human-readable unique code (e.g., `EMP-001`). **Unique** |
| `designation` | `text` | YES | — | Job title / role (e.g., "Sales Manager") |
| `salary` | `real` | YES | — | Monthly salary amount |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `profile_id`
- `UNIQUE`: `employee_code`
- `FK`: `profile_id → profiles(id) ON DELETE CASCADE`

**Notes**:
- The `role` field in `profiles` must be set to `'employee'` for RLS policies to grant access
- Employees can read/create limited data but cannot approve pending changes

---

### 🏗️ `projects`

**Purpose**: Real estate projects/townships being sold. Each project has many plots.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `project_code` | `text` | YES | — | Short identifier (e.g., `ATC-001`). **Unique** |
| `name` | `text` | NOT NULL | — | Full project name (e.g., "AeroTown Residency") |
| `location` | `text` | YES | — | Location/address of the project |
| `description` | `text` | YES | — | Free-text description |
| `total_plots` | `integer` | YES | `0` | Total number of plots in this project |
| `area_size` | `real` | YES | — | Approximate total area (legacy field; use plot aggregates for accuracy) |
| `status` | `text` | YES | `'active'` | Project status: `'active'` \| `'completed'` \| `'inactive'` |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `project_code`

**Notes**:
- Deleting a project **cascades** to `plots` and `project_layouts`
- Currently live projects: `AeroTown Residency`, `Dholera Homes 3`, `AeroTown Logistic Park`

---

### 🗺️ `project_layouts`

**Purpose**: Stores the interactive grid map configuration for each project. Used by the layout renderer in the UI to draw the visual plot grid.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `project_id` | `uuid` | NOT NULL | — | Links to `projects.id`. **Unique** — one layout per project |
| `layout_type` | `text` | YES | `'grid'` | Layout type (currently always `'grid'` or `'custom'`) |
| `layout_config` | `jsonb` | YES | — | JSON object with grid metadata: `{ type, rows, columns, totalPlots }` |
| `updated_at` | `timestamptz` | YES | `NOW()` | Last updated timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `project_id` (one layout config per project)
- `FK`: `project_id → projects(id) ON DELETE CASCADE`

**Notes**:
- `layout_config` example: `{"type": "custom", "rows": 14, "columns": 40, "totalPlots": 127}`
- Does **not** accept multiple records per project — strictly 1:1 with `projects`

---

### 📍 `plots`

**Purpose**: Individual land plots within a project. This is the core saleable unit of the system.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `plot_code` | `text` | YES | — | Unique plot code (e.g., `ATC-PLT-001`). **Unique** |
| `plot_number` | `text` | NOT NULL | — | Plot number shown on the layout map (e.g., `'1'`, `'42'`) |
| `area_sqm` | `real` | YES | — | Area in square metres |
| `area_sqyd` | `real` | YES | — | Area in square yards (**primary unit used in UI**) |
| `length` | `real` | YES | — | Plot length (metres) |
| `width` | `real` | YES | — | Plot width (metres) |
| `price` | `real` | YES | — | List price (total). Used when no booking exists |
| `price_per_unit` | `real` | YES | — | Price per square yard |
| `project_id` | `uuid` | NOT NULL | — | The project this plot belongs to |
| `client_id` | `uuid` | YES | — | The client who owns this plot. NULL if available |
| `status` | `plot_status_enum` | YES | `'available'` | Current status of the plot |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `plot_code`
- `FK`: `project_id → projects(id) ON DELETE CASCADE`
- `FK`: `client_id → clients(id) ON DELETE SET NULL`

**Plot Status Flow**:
```
available → token_paid → partially_paid → sold
```

**Notes**:
- A plot can only be assigned to **one client** at a time (`client_id` is a single value, not an array)
- A plot can only have **one active booking** (enforced by UNIQUE constraint on `bookings(client_id, plot_id)`)

---

### 📝 `bookings`

**Purpose**: Records a sale agreement between a client and a plot. Contains pricing, discount, commission, and status details.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `booking_code` | `text` | YES | — | Unique booking reference (e.g., `BKG-001`). **Unique** |
| `client_id` | `uuid` | NOT NULL | — | The purchasing client |
| `plot_id` | `uuid` | NOT NULL | — | The plot being purchased |
| `total_amount` | `real` | NOT NULL | — | Agreed total deal value (after discount) |
| `discount_amount` | `real` | YES | `0` | Discount applied to the booking |
| `donation_amount` | `real` | YES | `0` | Donation amount if any |
| `consultant_id` | `uuid` | YES | — | Referring consultant (nullable — not all bookings have a consultant) |
| `commission_percent` | `real` | YES | `0` | Commission percentage owed to consultant |
| `commission_amount` | `real` | YES | `0` | Calculated commission amount |
| `tds_amount` | `real` | YES | `0` | TDS (Tax Deducted at Source) on commission |
| `status` | `booking_status_enum` | YES | `'pending'` | Booking status |
| `booking_date` | `timestamptz` | YES | `NOW()` | Date booking was created |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `booking_code`
- `UNIQUE`: `(client_id, plot_id)` — **prevents one client from booking the same plot twice**
- `FK`: `client_id → clients(id)`
- `FK`: `plot_id → plots(id)`
- `FK`: `consultant_id → consultants(id)`

**Notes**:
- One plot = one booking at a time (composite unique constraint enforces this)
- Multiple payments can be made against a single booking via `payments.booking_id`
- When `payments` are deleted, `booking_id` is set to NULL (not deleted)

---

### 💰 `payments`

**Purpose**: Records all financial transactions — incoming payments from clients, consultant commission payouts, investor payouts, etc. Acts as a **universal ledger** for the system.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `receipt_no` | `text` | YES | — | Human-readable receipt number |
| `entity_id` | `uuid` | NOT NULL | — | ID of the paying/receiving entity (client, investor, consultant, etc.) |
| `entity_type` | `entity_type_enum` | NOT NULL | — | Type of entity: `client`, `investor`, `consultant`, `other` |
| `booking_id` | `uuid` | YES | — | The booking this payment is tied to (nullable for non-plot payments) |
| `transaction_type` | `transaction_type_enum` | NOT NULL | — | `credit` (money in) or `debit` (money out) |
| `amount` | `real` | NOT NULL | — | Transaction amount |
| `payment_date` | `date` | YES | `CURRENT_DATE` | Date of the payment |
| `payment_mode` | `text` | YES | — | Mode of payment (e.g., "NEFT", "Cash", "Cheque") |
| `description` | `text` | YES | — | Free-text description/notes |
| `receipt_type` | `receipt_type_enum` | YES | `'payment'` | Type of receipt: `payment`, `stamp_duty`, `legal_fees`, `maintenance` |
| `transaction_id` | `text` | YES | — | Bank transaction reference ID |
| `commission_amount` | `real` | YES | `0` | Commission paid on this payment (if applicable) |
| `tds_amount` | `real` | YES | `0` | TDS deducted on commission for this payment |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `FK`: `booking_id → bookings(id) ON DELETE SET NULL`

**Notes**:
- **Multiple payments can reference the same booking** (instalment-based payment system)
- `entity_id` is **not** a formal FK — it is a loose reference that depends on `entity_type` to determine which table to look in
- Used to calculate `amount_paid` against a booking by summing all credits for a `booking_id`

---

### 💼 `investments`

**Purpose**: Tracks fixed-term investments made by investors into the company (not plot purchases). Has separate maturity tracking and settlement history.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `investment_code` | `text` | YES | — | Unique investment reference. **Unique** |
| `investor_id` | `uuid` | NOT NULL | — | The investor who made this investment |
| `invested_amount` | `real` | NOT NULL | — | Principal amount invested |
| `interest_rate` | `real` | NOT NULL | — | Annual interest rate (percentage) |
| `mature_amount` | `real` | NOT NULL | — | Total amount due at maturity |
| `investment_date` | `date` | YES | `CURRENT_DATE` | Date the investment was made |
| `mature_date` | `date` | NOT NULL | — | Date the investment matures |
| `status` | `investment_status_enum` | YES | `'pending'` | `pending` (active) or `settled` (paid out) |
| `exit_date` | `date` | YES | — | Actual settlement date (if early exit) |
| `referral_user_id` | `uuid` | YES | — | The `profiles.id` of the internal user who referred this investor |
| `settlement_history` | `jsonb` | YES | — | JSON array of partial settlement records |
| `payment_mode` | `text` | YES | — | Mode of initial investment payment |
| `transaction_id` | `text` | YES | — | Bank transaction reference ID |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `investment_code`
- `FK`: `investor_id → investors(id) ON DELETE CASCADE`
- `FK`: `referral_user_id → profiles(id) ON DELETE SET NULL`

**Notes**:
- `settlement_history` is a **JSONB array** — it accepts multiple partial settlement records: `[{ date, amount, mode, txn_id }, ...]`
- An investor can have **multiple investments** (1:many relationship)

---

### 🏦 `investors`

**Purpose**: Stores investor profiles — people who give money to the company as fixed-term investments (not plot buyers).

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `investor_code` | `text` | YES | — | Unique investor reference (e.g., `INV-001`). **Unique** |
| `name` | `text` | NOT NULL | — | Full name |
| `phone` | `text` | YES | — | Contact number |
| `email` | `text` | YES | — | Email address |
| `address` | `text` | YES | — | Full address |
| `referral_id` | `text` | YES | — | Free-text referral identifier (not a FK) |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`
- `UNIQUE`: `investor_code`

**Notes**:
- One investor can have **multiple investment records** in `investments`
- Investors do **not** have a Supabase auth account — they are not CRM users

---

### 🧾 `expenses`

**Purpose**: Records company expenses (outgoing money). Used for financial reporting and P&L tracking.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `expense_date` | `date` | YES | `CURRENT_DATE` | Date the expense occurred |
| `to_entity` | `text` | NOT NULL | — | Name of the payee (vendor, employee, etc.) |
| `expense_type` | `text` | NOT NULL | — | Category/type of expense (free text) |
| `payment_mode` | `text` | YES | — | How it was paid (NEFT, Cash, etc.) |
| `transaction_id` | `text` | YES | — | Bank transaction reference |
| `amount` | `real` | NOT NULL | — | Expense amount |
| `bank_name` | `text` | YES | — | Bank from which payment was made |
| `branch_name` | `text` | YES | — | Bank branch name |
| `ifsc_code` | `text` | YES | — | IFSC code of the bank |
| `remarks` | `text` | YES | — | Additional notes/remarks |
| `created_at` | `timestamptz` | YES | `NOW()` | Record creation timestamp |

**Constraints**:
- `PK`: `id`

**Notes**:
- No FK relationships — `to_entity` is a free-text field
- Each row is a **single expense entry** (not an array/multi-record structure)

---

### 🔄 `pending_changes`

**Purpose**: The **change request queue** for the approval workflow. When employees (non-admins) make data changes, the changes are queued here instead of being applied directly. Admins then approve or reject them.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `uuid_generate_v4()` | Primary key |
| `submitted_by` | `uuid` | NOT NULL | — | `auth.users.id` of the employee who submitted the change |
| `submitted_at` | `timestamptz` | NOT NULL | `NOW()` | Timestamp of submission |
| `entity_type` | `text` | NOT NULL | — | Which entity is being changed: `'client'`, `'consultant'`, `'booking'`, `'payment'`, `'expense'`, `'plot'` |
| `entity_id` | `uuid` | YES | — | The target record's UUID. NULL for `create` operations |
| `operation` | `text` | NOT NULL | — | `'create'`, `'update'`, or `'delete'` |
| `payload` | `jsonb` | NOT NULL | `'{}'` | The full data payload (new values for create/update, empty for delete) |
| `description` | `text` | NOT NULL | — | Human-readable summary for admin review panel |
| `status` | `text` | NOT NULL | `'pending'` | `'pending'`, `'approved'`, or `'rejected'` |
| `reviewed_by` | `uuid` | YES | — | `auth.users.id` of the admin who reviewed it |
| `reviewed_at` | `timestamptz` | YES | — | Timestamp of admin review |
| `rejection_reason` | `text` | YES | — | Admin's reason for rejection (if rejected) |

**Constraints**:
- `PK`: `id`
- `CHECK`: `operation IN ('create', 'update', 'delete')`
- `CHECK`: `status IN ('pending', 'approved', 'rejected')`
- `FK`: `submitted_by → auth.users(id) ON DELETE CASCADE`
- `FK`: `reviewed_by → auth.users(id)`

**Notes**:
- A **trigger** fires after every INSERT: `on_pending_change_insert` → calls `notify_pending_change()` → sends a real-time PostgreSQL NOTIFY event
- The frontend subscribes to the `pending_change` channel and shows badge counts
- A helper function `get_pending_changes_count()` returns the count of status = `'pending'` items for the sidebar badge

---

### 🔐 `otp_codes`

**Purpose**: Stores one-time passwords (OTPs) for email-based login authentication. Used for client portal logins where clients don't have passwords.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | Primary key |
| `email` | `text` | NOT NULL | — | Email address the OTP was sent to |
| `code` | `text` | NOT NULL | — | The OTP code (hashed or plain) |
| `expires_at` | `timestamptz` | NOT NULL | — | Expiry timestamp for the OTP |
| `used` | `boolean` | YES | `false` | Whether this OTP has already been consumed |
| `created_at` | `timestamptz` | YES | `NOW()` | When the OTP was generated |

**Constraints**:
- `PK`: `id`
- `INDEX`: `idx_otp_email` on `email` (fast lookup by email)
- `INDEX`: `idx_otp_expires` on `expires_at` (fast cleanup of expired codes)

**Notes**:
- Multiple OTP codes can exist for the same email (e.g., resend scenarios)
- OTPs are invalidated after use (`used = true`) or after `expires_at` passes

---

## Relationships & Foreign Keys

```
auth.users
  ├── profiles.id          (1:1, ON DELETE CASCADE)
  ├── clients.auth_user_id (1:1 optional, ON DELETE SET NULL)
  ├── pending_changes.submitted_by (1:many, ON DELETE CASCADE)
  └── pending_changes.reviewed_by  (1:many, ON DELETE no action)

profiles
  ├── employees.profile_id        (1:1, ON DELETE CASCADE)
  └── investments.referral_user_id (1:many, ON DELETE SET NULL)

projects
  ├── plots.project_id            (1:many, ON DELETE CASCADE)
  └── project_layouts.project_id  (1:1, ON DELETE CASCADE)

clients
  ├── bookings.client_id          (1:many)
  └── plots.client_id             (1:many, ON DELETE SET NULL)

plots
  └── bookings.plot_id            (1:1 effective, ON DELETE no action)

bookings
  ├── payments.booking_id         (1:many, ON DELETE SET NULL)
  └── consultant_id → consultants.id

investors
  └── investments.investor_id     (1:many, ON DELETE CASCADE)
```

---

## RLS Policies Summary

All tables have Row Level Security (RLS) **enabled**. Access is controlled by two helper functions:
- `is_admin()` — returns `true` if current user's profile role is `admin` or `master_admin`
- `is_employee()` — returns `true` if current user's profile role is `employee`

| Table | master_admin / admin | employee | client | anon |
|---|---|---|---|---|
| `profiles` | Full access | Read own + others' profiles | Read own profile | ❌ |
| `clients` | Full access | Full access | Read own record only | ❌ |
| `consultants` | Full access | Full access | ❌ | ❌ |
| `employees` | Full access | Read own record | ❌ | ❌ |
| `projects` | Full access | Read only | Read only | ❌ |
| `project_layouts` | Full access | Read only | Read only | ❌ |
| `plots` | Full access | Read + Update only | Read only | ❌ |
| `bookings` | Full access | Full access | Read own bookings only | ❌ |
| `payments` | Full access | Full access | Read own payments only | ❌ |
| `investments` | Full access | ❌ | ❌ | ❌ |
| `investors` | Full access | ❌ | ❌ | ❌ |
| `expenses` | Full access | Full access | ❌ | ❌ |
| `pending_changes` | Read all + Update (approve/reject) | Insert own + Read own | ❌ | ❌ |
| `otp_codes` | — | — | — | Managed by auth flow (no direct policy) |

### Detailed RLS Policy Notes

**`profiles`**:
- `profiles_admin_all` — admins get full CRUD
- `profiles_read_all` — admins, employees, or self can read
- `profiles_update_self` — any user can update their own profile

**`plots`**:
- `plots_admin_all` — admins get full CRUD
- `plots_employee_update` — employees can **UPDATE** plots (e.g., status change) but not delete
- `plots_read_all` — any authenticated user can read plots

**`bookings`**:
- `bookings_admin_emp_all` — admins and employees get full CRUD
- `bookings_client_read` — clients can only SELECT bookings where `client_id` matches their own client record

**`payments`**:
- `payments_admin_emp_all` — admins and employees get full CRUD
- `payments_client_read` — clients can only SELECT payments linked to their own bookings (two-level join: `payments → bookings → clients → auth.uid()`)

**`pending_changes`**:
- `employees_insert_own_changes` — employees can INSERT only if `submitted_by = auth.uid()`
- `employees_read_own_changes` — employees see their own; admins and master_admins see all
- `admins_update_changes` — `admin` **and** `master_admin` roles can UPDATE (approve/reject). The base schema had a bug where only `admin` was listed, but this was fixed by the `add_master_admin_role.sql` migration which drops and recreates the policy to include `master_admin`

---

## Functions & Triggers

### `handle_new_user()` — Trigger Function

- **Type**: `BEFORE/AFTER INSERT` trigger on `auth.users`
- **Trigger**: Fires automatically when a new auth user is created
- **Effect**: Inserts a row into `public.profiles` with the new user's `id`, `full_name` (from metadata), and **role = `'admin'`**
- **Security**: `SECURITY DEFINER` (runs as postgres, bypasses RLS)

> ⚠️ **Note**: Every new signup gets `admin` role by default. Role must be manually changed after creation.

---

### `notify_pending_change()` — Trigger Function

- **Type**: `AFTER INSERT` trigger on `pending_changes`
- **Trigger**: `on_pending_change_insert` fires after every new pending change is inserted
- **Effect**: Calls `pg_notify('pending_change', <json payload>)` to push a real-time notification
- **Payload**: `{ id, entity_type, operation, description }`
- **Security**: `SECURITY DEFINER`

The frontend subscribes to the `pending_change` PostgreSQL channel via Supabase Realtime.

---

### `get_pending_changes_count()` — Helper Function

- **Returns**: `INTEGER`
- **Purpose**: Returns the count of `pending_changes` where `status = 'pending'`
- **Used by**: The sidebar badge indicator in the admin UI
- **Security**: `SECURITY DEFINER`, `STABLE`

---

### `is_admin()` — Helper Function

- **Returns**: `BOOLEAN`
- **Logic**: `SELECT EXISTS (... WHERE id = auth.uid() AND role IN ('admin', 'master_admin'))`
- **Used in**: All admin-gated RLS policies

---

### `is_employee()` — Helper Function

- **Returns**: `BOOLEAN`
- **Logic**: `SELECT EXISTS (... WHERE id = auth.uid() AND role = 'employee')`
- **Used in**: Employee-gated RLS policies

---

### `rls_auto_enable()` — Event Trigger Function

- **Type**: DDL event trigger (`CREATE TABLE`)
- **Effect**: Automatically enables RLS on any new table created in the `public` schema
- **Prevents**: Accidentally creating tables without RLS protection

---

## Indexes

| Index Name | Table | Column(s) | Type | Purpose |
|---|---|---|---|---|
| `idx_otp_email` | `otp_codes` | `email` | btree | Fast OTP lookup by email |
| `idx_otp_expires` | `otp_codes` | `expires_at` | btree | Fast expired OTP cleanup |
| `idx_pending_changes_status` | `pending_changes` | `status` | btree | Fast filter by pending/approved/rejected |
| `idx_pending_changes_submitted` | `pending_changes` | `submitted_by` | btree | Fast lookup by submitter |
| `idx_pending_changes_entity` | `pending_changes` | `(entity_type, entity_id)` | btree | Fast lookup by target entity |

---

## Entity Relationship Overview

```
┌─────────────┐         ┌─────────────┐
│  auth.users │────────▶│   profiles  │
└─────────────┘  1:1    └──────┬──────┘
       │                       │ 1:1
       │                       ▼
       │                ┌─────────────┐
       │                │  employees  │
       │                └─────────────┘
       │
       │ optional
       ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│   clients   │───────▶│  bookings   │◀───────│    plots    │
└─────────────┘  1:N   └──────┬──────┘  N:1   └──────┬──────┘
                              │                       │
                              │ 1:N                   │ N:1
                              ▼                       ▼
                       ┌─────────────┐        ┌─────────────┐
                       │  payments   │        │   projects  │
                       └─────────────┘        └──────┬──────┘
                                                     │ 1:1
                                                     ▼
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  investors  │───────▶│ investments │        │  project_   │
└─────────────┘  1:N   └─────────────┘        │   layouts  │
                                               └─────────────┘
┌─────────────┐
│ consultants │──────── referenced in bookings.consultant_id
└─────────────┘

┌─────────────┐
│   expenses  │──────── standalone (no FK relationships)
└─────────────┘

┌─────────────┐         ┌─────────────┐
│auth.users   │────────▶│pending_     │
│ (submitted) │         │changes      │
└─────────────┘         └─────────────┘

┌─────────────┐
│  otp_codes  │──────── standalone (used by auth flow)
└─────────────┘
```

---

## Key Design Patterns

### 1. Single Active Booking per Plot
The `UNIQUE (client_id, plot_id)` constraint on `bookings` means a client cannot book the same plot twice. Combined with the plot `status` field, this creates the booking lifecycle.

### 2. Universal Payments Ledger
The `payments` table uses `entity_type + entity_id` (polymorphic association) to link payments to any entity type. The `booking_id` FK is optional and only set for client plot payments.

### 3. Employee Approval Workflow
Employees do not write directly to most tables. Instead, they INSERT into `pending_changes` with the operation payload. Admins review and approve, then the application code applies the actual change. This ensures audit trails.

### 4. Client Portal Access
Clients with a Supabase auth account (`clients.auth_user_id`) can log in via OTP and see their own bookings and payment history through the RLS policies that chain: `auth.uid() → clients → bookings → payments`.

---

## Route Access Control (Middleware)

The Next.js middleware (`middleware.ts`) enforces route-level access **on top of** database RLS. It checks `profiles.role` on every request and redirects unauthorized access.

| Role | Allowed Routes | Blocked/Redirected |
|---|---|---|
| `master_admin` | All routes (same as `admin`) | `/my-portal`, `/my-deal` → `/dashboard` |
| `admin` | All CRM routes | `/my-portal`, `/my-deal` → `/dashboard` |
| `employee` | `/dashboard`, `/clients`, `/consultants`, `/projects`, `/bookings`, `/payments`, `/approvals` (view only) | `/settings`, `/reports`, `/expenses`, `/approvals` (write), `/my-portal` |
| `client` | `/my-portal`, `/my-deal` only | All other routes → `/my-portal` |
| Unauthenticated | `/login`, `/api/auth/*` | All other routes → `/login` |

**Inactivity Timeout**: Sessions are automatically invalidated after **10 minutes of inactivity**. The middleware tracks activity via a `last_active` cookie and redirects to `/login?expired=true` when the threshold is exceeded.

**Login Routing**: After successful login, users are routed by role:
- `client` → `/my-portal`
- Everyone else → `/dashboard`

---

## Data Environments

Two Supabase instances exist — production and test. The `migrate.js` script copies data from prod to test.

| Environment | Supabase Project URL | Purpose |
|---|---|---|
| **Production** | `fbthhsxsmnmwoizhxlkv.supabase.co` | Live data — real clients, bookings, payments |
| **Test/Dev** | `qfujzswndxzunetlacfs.supabase.co` | Development and testing; wiped and re-seeded from prod via `migrate.js` |

The active environment is controlled by `.env.local` in the `crm/` directory:
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

**Migration Order** (dependency-safe insert order used in `migrate.js`):
```
projects → clients → consultants → plots → bookings → payments
```

---

### 5. Cascade vs Set Null
- **CASCADE**: Used where child records are meaningless without parent (e.g., plots without a project, investments without an investor)
- **SET NULL**: Used where child records remain valid independently (e.g., a booking stays even if the client's auth account is deleted; a plot stays if a client is removed)
