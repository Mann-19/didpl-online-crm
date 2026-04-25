'use server'

import { createClient } from '@/utils/supabase/server'

export async function getClientDashboardData() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // We find the client profile linked to this auth user
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (clientErr || !client) {
    // Return empty arrays if no client profile is linked yet
    return { client: null, properties: [], payments: [] }
  }

  // Fetch Owned Properties (Bookings joined with Plots and Projects)
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, 
      booking_code, 
      booking_date, 
      status,
      plot_id,
      plots (
        plot_number, area_sqm, area_sqyd,
        projects ( name, location )
      )
    `)
    .eq('client_id', client.id)
    .in('status', ['confirmed', 'completed']) // Active deals

  // Fetch Payments linked to this client's bookings
  const bookingIds = bookings?.map(b => b.id) || []
  let paymentsData: any[] = []
  
  if (bookingIds.length > 0) {
    const { data: p } = await supabase
      .from('payments')
      .select(`
        id, receipt_no, amount, payment_date, payment_mode, transaction_id, description, receipt_type,
        bookings ( 
          client_id,
          clients ( name, residential_address, residential_city, residential_state, residential_pincode, gender ),
          plots ( plot_number, projects(name) ) 
        )
      `)
      .in('booking_id', bookingIds)
    
    paymentsData = p || []
  }

  return {
    client,
    properties: bookings || [],
    payments: paymentsData
  }
}
