'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper to calculate project stats
function calculateProjectStats(project: any, plots: any[]) {
  const totalPlots = plots.length
  const soldPlots = plots.filter((p: any) => p.status !== 'available').length
  const availablePlots = totalPlots - soldPlots

  let totalRevenue = 0
  let amountReceived = 0
  let totalAreaSqYd = 0
  let soldAreaSqYd = 0
  const clients = new Set<string>()

  plots.forEach((plot: any) => {
    totalAreaSqYd += Number(plot.area_sqyd) || 0
    if (plot.status !== 'available') {
      soldAreaSqYd += Number(plot.area_sqyd) || 0
      if (plot.client_id) clients.add(plot.client_id)
    }

    // A plot could have multiple bookings if one was cancelled, we take the first or active one.
    // Assuming the API returns the active booking or we just take the first one.
    const activeBooking = plot.bookings?.[0]

    if (activeBooking && plot.status !== 'available') {
      const dealValue = (Number(activeBooking.total_amount) || 0) - (Number(activeBooking.discount_amount) || 0)
      totalRevenue += dealValue
      
      const payments = activeBooking.payments || []
      const paid = payments.reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0)
      amountReceived += paid
    } else {
      totalRevenue += Number(plot.price) || 0
    }
  })

  const pendingAmount = totalRevenue - amountReceived
  const areaPercentageSold = totalAreaSqYd > 0 ? (soldAreaSqYd / totalAreaSqYd) * 100 : 0
  const collectionRate = totalRevenue > 0 ? (amountReceived / totalRevenue) * 100 : 0
  const pendingPercentage = totalRevenue > 0 ? (pendingAmount / totalRevenue) * 100 : 0

  return {
    ...project,
    totalPlots,
    soldPlots,
    availablePlots,
    totalRevenue,
    amountReceived,
    pendingAmount,
    totalAreaSqYd,
    soldAreaSqYd,
    remainingAreaSqYd: totalAreaSqYd - soldAreaSqYd,
    areaPercentageSold,
    collectionRate,
    pendingPercentage,
    clientCount: clients.size,
  }
}

// 1. Get All Projects with Stats
export async function getProjectsWithStats() {
  const supabase = await createClient()

  // Fetch projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
    return []
  }

  // Fetch all plots with their bookings and payments to calculate stats
  const { data: plots, error: plotsError } = await supabase
    .from('plots')
    .select(`
      *,
      bookings (
        id, total_amount, discount_amount, status,
        payments ( amount )
      )
    `)

  if (plotsError) {
    console.error('Error fetching plots for stats:', plotsError)
    return []
  }

  // Group plots by project_id
  const plotsByProject: Record<string, any[]> = {}
  plots.forEach(plot => {
    if (!plotsByProject[plot.project_id]) plotsByProject[plot.project_id] = []
    plotsByProject[plot.project_id].push(plot)
  })

  // Calculate and return stats
  return projects.map(project => 
    calculateProjectStats(project, plotsByProject[project.id] || [])
  )
}

// 2. Get Single Project Details
export async function getProjectOverview(projectId: string) {
  const supabase = await createClient()

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    console.error('Error fetching project:', projectError)
    return null
  }

  const { data: plots, error: plotsError } = await supabase
    .from('plots')
    .select(`
      *,
      bookings (
        id, total_amount, discount_amount, status,
        payments ( amount )
      )
    `)
    .eq('project_id', projectId)

  if (plotsError) {
    console.error('Error fetching project plots:', plotsError)
    return null
  }

  const stats = calculateProjectStats(project, plots || [])
  
  // Calculate status counts
  const statusCounts = { available: 0, token: 0, partial: 0, sold: 0 }
  plots?.forEach((plot: any) => {
    if (plot.status === 'available') statusCounts.available++
    else if (plot.status === 'token_paid') statusCounts.token++
    else if (plot.status === 'partially_paid') statusCounts.partial++
    else if (plot.status === 'sold') statusCounts.sold++
  })

  return { project: stats, statusCounts }
}

// 3. Get Project Plots (includes bookings+payments for layout coloring)
export async function getProjectPlots(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plots')
    .select(`
      *,
      clients:client_id ( name, phone ),
      bookings (
        id, total_amount, discount_amount, status,
        payments ( amount )
      )
    `)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching plots:', error)
    return []
  }

  // Sort numerically so plot 2 comes before plot 10
  return (data || []).sort((a: any, b: any) => {
    const numA = parseInt(a.plot_number, 10)
    const numB = parseInt(b.plot_number, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return String(a.plot_number).localeCompare(String(b.plot_number))
  })
}

// 4. Get Project Layout Config
export async function getProjectLayout(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_layouts')
    .select('*')
    .eq('project_id', projectId)
    .single()

  if (error && error.code !== 'PGRST116') { // Ignore not found
    console.error('Error fetching layout:', error)
    return null
  }
  return data
}

// 5. Update Project (Basic implementation for now)
export async function updateProject(projectId: string, formData: any) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(formData)
    .eq('id', projectId)

  if (error) throw new Error(error.message)
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
}

// 6. Get Project Clients
export async function getProjectClients(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plots')
    .select('clients(*)')
    .eq('project_id', projectId)
    .not('client_id', 'is', null)

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  // Deduplicate clients
  const uniqueClients = new Map()
  data.forEach((p: any) => {
    if (p.clients && !uniqueClients.has(p.clients.id)) {
      uniqueClients.set(p.clients.id, p.clients)
    }
  })

  return Array.from(uniqueClients.values())
}
