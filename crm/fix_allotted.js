import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'd:/Programming/ELECTRON JS/DIDP - Online/crm/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStatuses() {
  const { data: plots, error: fetchErr } = await supabase
    .from('plots')
    .select('id')
    .eq('status', 'allotted');
    
  if (fetchErr) {
    console.error("Fetch Error:", fetchErr);
    return;
  }
  
  console.log(`Found ${plots.length} plots with 'allotted' status. Updating...`);
  
  for (const plot of plots) {
    // Calling the Postgres RPC function 'recalculate_plot_status'
    // Note: since it's a function that doesn't return anything, we might need a wrapper, 
    // or we can just fetch bookings and do the logic in JS to be safe.
    
    // JS Logic mirroring the trigger:
    const { data: bookings } = await supabase.from('bookings').select('*').eq('plot_id', plot.id).in('status', ['pending', 'confirmed']);
    
    let newStatus = 'available';
    let primaryClientId = null;
    
    if (bookings && bookings.length > 0) {
      const hasConfirmed = bookings.some(b => b.status === 'confirmed');
      const hasPending = bookings.some(b => b.status === 'pending');
      
      const hasFullyPaid = bookings.some(b => {
        const dealValue = (b.total_amount || 0) - (b.discount_amount || 0);
        return b.status === 'pending' && dealValue > 0 && (b.amount_paid || 0) >= dealValue;
      });
      
      if (hasConfirmed) newStatus = 'sold';
      else if (hasFullyPaid) newStatus = 'fully_paid';
      else if (hasPending) newStatus = 'token_paid';
      
      // Determine primary client
      const sortedBookings = [...bookings].sort((a, b) => {
        if (a.status === 'confirmed' && b.status !== 'confirmed') return -1;
        if (a.status !== 'confirmed' && b.status === 'confirmed') return 1;
        
        const aFullyPaid = ((a.amount_paid || 0) >= ((a.total_amount || 0) - (a.discount_amount || 0)));
        const bFullyPaid = ((b.amount_paid || 0) >= ((b.total_amount || 0) - (b.discount_amount || 0)));
        if (aFullyPaid && !bFullyPaid) return -1;
        if (!aFullyPaid && bFullyPaid) return 1;
        
        return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
      });
      primaryClientId = sortedBookings[0].client_id;
    }
    
    console.log(`Updating plot ${plot.id} to status: ${newStatus}`);
    await supabase.from('plots').update({ status: newStatus, client_id: primaryClientId }).eq('id', plot.id);
  }
  
  console.log("Done.");
}

fixStatuses();
