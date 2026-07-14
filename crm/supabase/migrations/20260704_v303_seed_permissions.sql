-- =============================================================================
-- Migration: v303 — Seed Permissions Catalog
-- Phase 2, Script 4 of 4
--
-- Inserts the master catalog of all permissions into the permissions table.
-- Values match the constants defined in lib/permissions/catalog.ts.
-- Uses ON CONFLICT to make it safe to re-run.
-- =============================================================================

BEGIN;

INSERT INTO public.permissions (key, name, description, module, master_admin, admin, employee, client) VALUES
  ('dashboard.view', 'View Dashboard', 'View high-level dashboard metrics', 'dashboard', true, true, true, false),

  ('projects.view', 'View Projects', 'View list of projects', 'projects', true, true, true, false),
  ('projects.create', 'Create Projects', 'Create a new project', 'projects', true, true, false, false),
  ('projects.edit', 'Edit Projects', 'Edit existing project details', 'projects', true, true, false, false),
  ('projects.delete', 'Delete Projects', 'Delete a project', 'projects', true, false, false, false),

  ('plots.view', 'View Plots', 'View plots within a project', 'plots', true, true, true, false),
  ('plots.create', 'Create Plots', 'Add new plots to a project', 'plots', true, true, false, false),
  ('plots.edit', 'Edit Plots', 'Edit plot details and status', 'plots', true, true, true, false),

  ('bookings.view', 'View Bookings', 'View booking details', 'bookings', true, true, true, true),
  ('bookings.create', 'Create Bookings', 'Create a new booking for a plot', 'bookings', true, true, false, false),
  ('bookings.approve', 'Approve Bookings', 'Approve pending bookings', 'bookings', true, true, false, false),

  ('clients.view', 'View Clients', 'View client list and details', 'clients', true, true, true, false),
  ('clients.create', 'Create Clients', 'Add a new client', 'clients', true, true, true, false),
  ('clients.edit', 'Edit Clients', 'Edit existing client details', 'clients', true, true, true, false),
  ('clients.delete', 'Delete Clients', 'Delete a client', 'clients', true, false, false, false),

  ('consultants.view', 'View Consultants', 'View consultant list and details', 'consultants', true, true, true, false),
  ('consultants.create', 'Create Consultants', 'Add a new consultant', 'consultants', true, true, false, false),
  ('consultants.edit', 'Edit Consultants', 'Edit existing consultant details', 'consultants', true, true, false, false),

  ('employees.view', 'View Employees', 'View employee list and details', 'employees', true, true, true, false),
  ('employees.manage', 'Manage Employees', 'Create, edit, and delete employees', 'employees', true, true, false, false),

  ('investors.view', 'View Investors', 'View investor list and details', 'investors', true, true, false, false),
  ('investors.manage', 'Manage Investors', 'Create, edit, and delete investors', 'investors', true, true, false, false),

  ('finance.view', 'View Finance', 'View payments, ledgers, and financial summaries', 'finance', true, true, false, false),
  ('finance.create', 'Create Finance', 'Record new payments', 'finance', true, true, false, false),
  ('finance.edit', 'Edit Finance', 'Edit existing payments', 'finance', true, true, false, false),
  ('finance.delete', 'Delete Finance', 'Delete payments', 'finance', true, false, false, false),

  ('reports.view', 'View Reports', 'Access system reports', 'reports', true, true, false, false),
  ('reports.export', 'Export Reports', 'Export reports to CSV/PDF', 'reports', true, true, false, false),

  ('expenses.view', 'View Expenses', 'View list of expenses', 'expenses', true, true, false, false),
  ('expenses.create', 'Create Expenses', 'Record new expenses', 'expenses', true, true, false, false),

  ('approvals.view', 'View Approvals', 'View pending change requests', 'approvals', true, true, true, false),
  ('approvals.manage', 'Manage Approvals', 'Approve or reject change requests', 'approvals', true, true, false, false),

  ('documents.view', 'View Documents', 'View uploaded documents', 'documents', true, true, true, true),
  ('documents.upload', 'Upload Documents', 'Upload new documents', 'documents', true, true, true, false),
  ('documents.delete', 'Delete Documents', 'Delete uploaded documents', 'documents', true, true, false, false),

  ('admin.settings', 'Manage Settings', 'Access system settings', 'administration', true, true, false, false),
  ('admin.users', 'Manage Users', 'Manage users and roles', 'administration', true, true, false, false),

  ('portal.view', 'View Client Portal', 'Access the client-facing portal', 'portal', false, false, false, true)

ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  module = EXCLUDED.module,
  master_admin = EXCLUDED.master_admin,
  admin = EXCLUDED.admin,
  employee = EXCLUDED.employee,
  client = EXCLUDED.client;

-- =============================================================================
-- Verification
-- =============================================================================
-- SELECT module, key, master_admin, admin, employee, client
-- FROM public.permissions
-- ORDER BY module, key;
--
-- Expected: 35 rows reflecting the default permissions layout.
-- =============================================================================

COMMIT;
