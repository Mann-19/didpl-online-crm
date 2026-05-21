require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  console.log("Connecting to:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const { data, error } = await supabase.from('profiles').select('id, full_name, role');
  if (error) console.error("Error fetching profiles:", error);
  else console.log("Profiles found:", JSON.stringify(data, null, 2));
}
run();
