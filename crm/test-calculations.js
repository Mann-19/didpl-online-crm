const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: consultants, error } = await supabase
    .from('consultants')
    .select(`
      id, name,
      bookings!bookings_consultant_id_fkey (
        id, status, total_amount, discount_amount, booking_date, commission_percent,
        payments ( id, amount, transaction_type, entity_type, commission_amount, tds_amount )
      )
    `);

  if (error) {
    console.error("Error:", error);
    return;
  }

  consultants.forEach(c => {
    if (c.bookings && c.bookings.length > 0) {
      console.log(`\nConsultant: ${c.name} (${c.id})`);
      c.bookings.forEach(b => {
        console.log(`  Booking: ${b.id}`);
        console.log(`    Total Amount: ${b.total_amount}`);
        console.log(`    Discount: ${b.discount_amount}`);
        console.log(`    Comm %: ${b.commission_percent}`);
        
        let sumCommInPayments = 0;
        let calculatedComm = 0;
        
        (b.payments || []).forEach(p => {
          if (p.entity_type === 'client' && p.transaction_type === 'credit') {
            sumCommInPayments += Number(p.commission_amount || 0);
            calculatedComm += Number(p.amount || 0) * (Number(b.commission_percent || 0) / 100);
            console.log(`      Payment: ${p.id}, Amount: ${p.amount}, commission_amount in DB: ${p.commission_amount}, calculated commission: ${p.amount * (b.commission_percent / 100)}`);
          }
        });
        
        console.log(`    Sum of commission_amount in payments: ${sumCommInPayments}`);
        console.log(`    Calculated commission from payments * commission_percent: ${calculatedComm}`);
      });
    }
  });
}

main();
