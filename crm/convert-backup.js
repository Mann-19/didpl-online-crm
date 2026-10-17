const fs = require('fs');
const path = require('path');

const inputFile = path.resolve(__dirname, 'backups/supabase-data.sql');
const outputFile = path.resolve(__dirname, 'backups/supabase-data-inserts.sql');

const lines = fs.readFileSync(inputFile, 'utf8').split('\n');

let output = [];
output.push('-- Auto-generated INSERT script for Supabase Web SQL Editor');
output.push('-- Duplicates Live DB data into Test DB cleanly\n');
output.push('SET session_replication_role = replica;\n');

output.push('-- 1. Ensure updated schema constraints match production');
output.push(`ALTER TABLE public.client_documents
  DROP CONSTRAINT IF EXISTS client_documents_document_type_check;

ALTER TABLE public.client_documents
  ADD CONSTRAINT client_documents_document_type_check
  CHECK (document_type IN (
    'kyc',
    'aadhaar_pan',
    'property',
    'sale_agreement',
    'rent_agreement',
    'image',
    'miscellaneous'
  ));
`);

output.push('-- 2. Wipe existing test data cleanly so there are no primary key conflicts');
output.push(`TRUNCATE TABLE 
    public.payments,
    public.booking_fees,
    public.booking_partners,
    public.bookings,
    public.plots,
    public.project_layouts,
    public.projects,
    public.client_documents,
    public.document_audit_log,
    public.clients,
    public.consultants,
    public.company_members,
    public.companies,
    public.investments,
    public.investors,
    public.otp_codes,
    public.permissions,
    public.profiles,
    public.workspace_members,
    public.workspaces
CASCADE;\n`);

output.push('-- 3. Truncate auth users & sessions');
output.push('TRUNCATE TABLE auth.users CASCADE;\n');

let currentTable = null;
let currentColumns = null;
let currentRows = [];

function unescapeCopyField(val) {
  if (val === '\\N') return null;
  // Decode standard PostgreSQL COPY text format escape sequences
  return val
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\v/g, '\v')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function escapeSqlValue(raw) {
  const val = unescapeCopyField(raw);
  if (val === null) return 'NULL';
  return "'" + val.replace(/'/g, "''") + "'";
}

function flushTable() {
  if (!currentTable || currentRows.length === 0) {
    currentTable = null;
    currentColumns = null;
    currentRows = [];
    return;
  }

  // Skip internal storage tables that might conflict or are unnecessary in test DB
  if (currentTable.includes('storage')) {
    currentTable = null;
    currentColumns = null;
    currentRows = [];
    return;
  }

  output.push(`-- Data for ${currentTable}`);

  const chunkSize = 250;
  for (let i = 0; i < currentRows.length; i += chunkSize) {
    const chunk = currentRows.slice(i, i + chunkSize);
    const valueLines = chunk.map(row => {
      const cols = row.split('\t');
      return '(' + cols.map(escapeSqlValue).join(', ') + ')';
    });
    output.push(`INSERT INTO ${currentTable} (${currentColumns}) VALUES\n` + valueLines.join(',\n') + ';');
  }
  output.push('\n');

  currentTable = null;
  currentColumns = null;
  currentRows = [];
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].replace(/\r$/, '');

  const copyMatch = line.match(/^COPY\s+("[^"]+"\."[^"]+")\s+\(([^)]+)\)\s+FROM stdin;/);
  if (copyMatch) {
    flushTable();
    currentTable = copyMatch[1];
    currentColumns = copyMatch[2];
    continue;
  }

  if (currentTable) {
    if (line === '\\.') {
      flushTable();
    } else if (line.trim() !== '') {
      currentRows.push(line);
    }
  }
}

flushTable();

output.push('SET session_replication_role = DEFAULT;');
fs.writeFileSync(outputFile, output.join('\n'), 'utf8');

console.log('Finished! Output file written to:', outputFile);
console.log('Size in bytes:', fs.statSync(outputFile).size);
