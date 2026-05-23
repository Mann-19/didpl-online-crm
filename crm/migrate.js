const { createClient } = require('@supabase/supabase-js');

// 1. ADD YOUR SERVICE ROLE KEYS HERE
const PROD_URL = 'https://fbthhsxsmnmwoizhxlkv.supabase.co';
const PROD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZidGhoc3hzbW5td29pemh4bGt2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQxNDQ2MiwiZXhwIjoyMDkxOTkwNDYyfQ.n-5bANMA6uGxKenOri3amX-HJyJ8DYan30TP-HZaxq8';

const TEST_URL = 'https://qfujzswndxzunetlacfs.supabase.co';
const TEST_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmdWp6c3duZHh6dW5ldGxhY2ZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ4MjE5MCwiZXhwIjoyMDkzMDU4MTkwfQ.kPkhhRjcndNF2g0fVtkrqQ_Eh5WRTngeZMfCqmlfPNY';

const prodClient = createClient(PROD_URL, PROD_KEY);
const testClient = createClient(TEST_URL, TEST_KEY);

// Define tables in strict dependency order
const tables = [
  'projects',
  'clients',
  'consultants',
  'plots',
  'bookings',
  'payments'
];

async function migrate() {
  console.log('--- STARTING MIGRATION ---');

  // STEP 1: WIPE TEST DATABASE (in reverse order to respect foreign keys)
  console.log('\n--- WIPING TEST TABLES ---');
  for (const table of [...tables].reverse()) {
    console.log(`Wiping ${table}...`);
    // Delete all rows where id is not null (this safely deletes all rows)
    const { error } = await testClient.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) {
      console.error(`Error wiping ${table}:`, error.message);
      return;
    }
  }

  // STEP 2: COPY DATA FROM PROD TO TEST (in correct order to respect foreign keys)
  console.log('\n--- COPYING DATA ---');
  for (const table of tables) {
    console.log(`Fetching ${table} from PROD...`);
    
    // Using an arbitrary large limit since pagination might be needed for huge tables, 
    // but 10,000 is usually enough for a standard CRM copy.
    const { data: prodData, error: fetchError } = await prodClient.from(table).select('*').limit(10000);
    
    if (fetchError) {
      console.error(`Error fetching ${table}:`, fetchError.message);
      return;
    }

    if (prodData && prodData.length > 0) {
      console.log(`Inserting ${prodData.length} rows into ${table} on TEST...`);
      const { error: insertError } = await testClient.from(table).insert(prodData);
      
      if (insertError) {
        console.error(`Error inserting into ${table}:`, insertError.message);
        return;
      }
    } else {
      console.log(`No data found in ${table}, skipping insert.`);
    }
  }

  console.log('\n--- MIGRATION COMPLETE! ---');
}

migrate();
