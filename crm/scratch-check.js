const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: project } = await supabase.from("projects").select("id").eq("project_code", "AELP-FLEX-001").single();
  const { data: plots } = await supabase.from("plots").select("id, plot_number").eq("project_id", project.id);
  console.log("Flex plots:", plots);
  if (!plots || plots.length === 0) return;

  const plotIds = plots.map(p => p.id);
  const { data: bookings } = await supabase.from("bookings").select("id, plot_id, client_id").in("plot_id", plotIds);
  console.log("Flex bookings:", bookings);

  for (const b of (bookings || [])) {
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

    console.log("Booking", b.id, "Error:", error ? error.message : "None", "Found:", !!data);
  }
}
check();
