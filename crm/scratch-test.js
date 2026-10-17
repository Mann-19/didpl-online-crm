const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testBooking() {
  const { data: bookings, error: bErr } = await supabase.from("bookings").select("id, plot_id, client_id").order("booking_date", { ascending: false }).limit(5);
  console.log("Recent bookings:", bookings, "Err:", bErr);
  
  if (bookings && bookings.length > 0) {
    for (const b of bookings) {
      console.log("\nTesting getBookingById on:", b.id, "plot_id:", b.plot_id);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          plot:plot_id ( id, plot_number, area_sqyd, price, status, project:project_id ( id, name, location ) ),
          client:client_id ( id, name, phone, email, client_code, gender, residential_address, residential_city, residential_state, residential_pincode ),
          booking_partners (
            client_id,
            added_at,
            client:client_id ( id, name, phone, email, client_code )
          ),
          consultant:consultant_id ( id, name ),
          payments ( * ),
          booking_fees ( * )
        `)
        .eq("id", b.id)
        .single();
      console.log("Result error:", error ? error.message : "None");
      console.log("Result booking found:", !!data);
      if (error) {
        console.error("Full error:", error);
      }
    }
  }
}
testBooking();
