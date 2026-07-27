'use server'

import { createClient } from '@/utils/supabase/server'
import { filterActivePlots, calculateProjectStats } from '@/lib/analytics/projectStats'

// ---------------------------------------------------------------------------
// Main dashboard data fetch
// ---------------------------------------------------------------------------
export async function getDashboardStats(year: string) {
  const supabase = await createClient()

  const [
    { count: totalClients },
    { count: totalProjects },
    { count: totalConsultants },
    { data: payments },
    { data: projects },
    { data: pendingBookings },
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase.from('consultants').select('*', { count: 'exact', head: true }),
    supabase
      .from('payments')
      .select('amount')
      .eq('transaction_type', 'credit')
      .gte(
        'payment_date',
        year === 'All' ? '2000-01-01' : `${year}-01-01`
      )
      .lte(
        'payment_date',
        year === 'All' ? '2100-12-31' : `${year}-12-31`
      ),
    // All projects with their plots+bookings for analytics
    supabase.from('projects').select('id, name, location, status').order('created_at', { ascending: false }),
    // Pending bookings for the bottom table
    supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        total_amount,
        discount_amount,
        client:client_id ( id, name, phone ),
        plot:plot_id ( id, plot_number, project:project_id ( id, name ) )
      `)
      .eq('status', 'pending')
      .order('booking_date', { ascending: false })
      .limit(10),
  ])

  // Fetch plots per project for analytics
  const projectsWithStats = await Promise.all(
    (projects || []).map(async (project: any) => {
      const { data: plots } = await supabase
        .from('plots')
        .select(`
          id, plot_number, area_sqyd, price, status,
          bookings (
            id, total_amount, discount_amount, amount_paid, status,
            client_id, booking_type,
            booking_partners ( client_id )
          )
        `)
        .eq('project_id', project.id)

      const activePlots = filterActivePlots(project.name, plots || [])
      return calculateProjectStats(project, activePlots)
    })
  )

  const totalRevenue =
    payments?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0

  // Total pending balance across all projects
  const totalPendingBalance = projectsWithStats.reduce(
    (sum, p) => sum + Math.max(0, p.totalRevenue - p.amountReceived),
    0
  )

  return {
    totalClients: totalClients || 0,
    totalProjects: totalProjects || 0,
    totalConsultants: totalConsultants || 0,
    totalRevenue,
    totalPendingBalance,
    projectsData: projectsWithStats,
    pendingBookings: (pendingBookings || []).map((b: any) => ({
      id: b.id,
      booking_date: b.booking_date,
      deal_amount:
        (Number(b.total_amount) || 0) - (Number(b.discount_amount) || 0),
      client_name: b.client?.name || 'Unknown',
      client_phone: b.client?.phone || '',
      plot_number: b.plot?.plot_number || '?',
      plot_id: b.plot?.id || null,
      project_name: b.plot?.project?.name || '?',
      project_id: b.plot?.project?.id || null,
    })),
  }
}
