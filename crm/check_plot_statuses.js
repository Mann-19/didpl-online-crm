import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Programming/ELECTRON JS/DIDP - Online/crm/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('plots')
    .select('id, plot_number, status')
    .eq('status', 'allotted')
    .limit(5);
  
  if (error) {
    console.error("Error:", error);
    return;
  }
  
  console.log("Plots with allotted:", data);
}

check();
