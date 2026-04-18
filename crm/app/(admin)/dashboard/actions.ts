'use server'

import { createClient } from '@/utils/supabase/server'

export async function getDashboardStats(year: string) {
  const supabase = await createClient()

  const [
    { count: totalClients },
    { count: totalProjects },
    { count: totalConsultants },
    { data: payments },
    { data: recentBookings }
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('consultants').select('*', { count: 'exact', head: true }),
    supabase.from('payments').select('amount').eq('transaction_type', 'credit')
      .gte('payment_date', year === 'All' ? '2000-01-01' : `${year}-01-01`)
      .lte('payment_date', year === 'All' ? '2100-12-31' : `${year}-12-31`),
    supabase.from('bookings').select(`
      id, booking_code, booking_date, status,
      clients ( name ),
      plots ( plot_number, projects ( name ) )
    `)
    .order('booking_date', { ascending: false })
    .limit(5)
  ])

  const totalRevenue = payments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

  return {
    totalClients: totalClients || 0,
    totalProjects: totalProjects || 0,
    totalConsultants: totalConsultants || 0,
    totalRevenue,
    recentBookings: recentBookings || []
  }
}
