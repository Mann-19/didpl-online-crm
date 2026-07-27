// ─────────────────────────────────────────────────────────────────────────────
// Permission Catalog
//
// Single source of truth for all permission keys used across the application.
// Use these constants everywhere — never hardcode permission key strings.
//
// Format: MODULE.ACTION (e.g. 'finance.view')
// These keys map directly to rows in the `permissions` database table.
// ─────────────────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  DASHBOARD: {
    VIEW: 'dashboard.view',
  },

  PROJECTS: {
    VIEW:   'projects.view',
    CREATE: 'projects.create',
    EDIT:   'projects.edit',
    DELETE: 'projects.delete',
  },

  PLOTS: {
    VIEW:   'plots.view',
    CREATE: 'plots.create',
    EDIT:   'plots.edit',
  },

  BOOKINGS: {
    VIEW:    'bookings.view',
    CREATE:  'bookings.create',
    APPROVE: 'bookings.approve',
  },

  CLIENTS: {
    VIEW:   'clients.view',
    CREATE: 'clients.create',
    EDIT:   'clients.edit',
    DELETE: 'clients.delete',
  },

  CONSULTANTS: {
    VIEW:   'consultants.view',
    CREATE: 'consultants.create',
    EDIT:   'consultants.edit',
  },

  EMPLOYEES: {
    VIEW:   'employees.view',
    MANAGE: 'employees.manage',
  },

  INVESTORS: {
    VIEW:   'investors.view',
    MANAGE: 'investors.manage',
  },

  FINANCE: {
    VIEW:   'finance.view',
    CREATE: 'finance.create',
    EDIT:   'finance.edit',
    DELETE: 'finance.delete',
  },

  REPORTS: {
    VIEW:   'reports.view',
    EXPORT: 'reports.export',
  },

  EXPENSES: {
    VIEW:   'expenses.view',
    CREATE: 'expenses.create',
  },

  APPROVALS: {
    VIEW:   'approvals.view',
    MANAGE: 'approvals.manage',
  },

  DOCUMENTS: {
    VIEW:   'documents.view',
    UPLOAD: 'documents.upload',
    DELETE: 'documents.delete',
  },

  ADMINISTRATION: {
    SETTINGS: 'admin.settings',
    USERS:    'admin.users',
  },

  PORTAL: {
    VIEW: 'portal.view',
  },
} as const

// ─── Flat list of all permission keys (useful for iteration / seeding) ────────

export type PermissionKey =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS][keyof (typeof PERMISSIONS)[keyof typeof PERMISSIONS]]

export const ALL_PERMISSION_KEYS: PermissionKey[] = Object.values(PERMISSIONS).flatMap(
  (module) => Object.values(module) as PermissionKey[]
)

// ─── Default grants per role ──────────────────────────────────────────────────
// Source of truth for seeding the `permissions` table.
// true = granted by default for that role

export type RoleEnum = 'master_admin' | 'admin' | 'employee' | 'client'

export const PERMISSION_DEFAULTS: Record<
  PermissionKey,
  Record<RoleEnum, boolean>
> = {
  'dashboard.view':    { master_admin: true,  admin: true,  employee: true,  client: false },

  'projects.view':     { master_admin: true,  admin: true,  employee: true,  client: false },
  'projects.create':   { master_admin: true,  admin: true,  employee: false, client: false },
  'projects.edit':     { master_admin: true,  admin: true,  employee: false, client: false },
  'projects.delete':   { master_admin: true,  admin: false, employee: false, client: false },

  'plots.view':        { master_admin: true,  admin: true,  employee: true,  client: false },
  'plots.create':      { master_admin: true,  admin: true,  employee: false, client: false },
  'plots.edit':        { master_admin: true,  admin: true,  employee: true,  client: false },

  'bookings.view':     { master_admin: true,  admin: true,  employee: true,  client: true  },
  'bookings.create':   { master_admin: true,  admin: true,  employee: false, client: false },
  'bookings.approve':  { master_admin: true,  admin: true,  employee: false, client: false },

  'clients.view':      { master_admin: true,  admin: true,  employee: true,  client: false },
  'clients.create':    { master_admin: true,  admin: true,  employee: true,  client: false },
  'clients.edit':      { master_admin: true,  admin: true,  employee: true,  client: false },
  'clients.delete':    { master_admin: true,  admin: false, employee: false, client: false },

  'consultants.view':  { master_admin: true,  admin: true,  employee: true,  client: false },
  'consultants.create':{ master_admin: true,  admin: true,  employee: false, client: false },
  'consultants.edit':  { master_admin: true,  admin: true,  employee: false, client: false },

  'employees.view':    { master_admin: true,  admin: true,  employee: true,  client: false },
  'employees.manage':  { master_admin: true,  admin: true,  employee: false, client: false },

  'investors.view':    { master_admin: true,  admin: true,  employee: false, client: false },
  'investors.manage':  { master_admin: true,  admin: true,  employee: false, client: false },

  'finance.view':      { master_admin: true,  admin: true,  employee: false, client: false },
  'finance.create':    { master_admin: true,  admin: true,  employee: false, client: false },
  'finance.edit':      { master_admin: true,  admin: true,  employee: false, client: false },
  'finance.delete':    { master_admin: true,  admin: false, employee: false, client: false },

  'reports.view':      { master_admin: true,  admin: true,  employee: false, client: false },
  'reports.export':    { master_admin: true,  admin: true,  employee: false, client: false },

  'expenses.view':     { master_admin: true,  admin: true,  employee: false, client: false },
  'expenses.create':   { master_admin: true,  admin: true,  employee: false, client: false },

  'approvals.view':    { master_admin: true,  admin: true,  employee: true,  client: false },
  'approvals.manage':  { master_admin: true,  admin: true,  employee: false, client: false },

  'documents.view':    { master_admin: true,  admin: true,  employee: true,  client: true  },
  'documents.upload':  { master_admin: true,  admin: true,  employee: true,  client: false },
  'documents.delete':  { master_admin: true,  admin: true,  employee: false, client: false },

  'admin.settings':    { master_admin: true,  admin: true,  employee: false, client: false },
  'admin.users':       { master_admin: true,  admin: true,  employee: false, client: false },

  'portal.view':       { master_admin: false, admin: false, employee: false, client: true  },
}
