const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, entity_type,
      client:entity_id(name)
    `)
    .eq('entity_type', 'client')
    .limit(1);

  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Success:", JSON.stringify(data, null, 2));
  }
}

main();
