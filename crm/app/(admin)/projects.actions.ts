'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { filterActivePlots } from '../project-utils'

// Helper to calculate project stats
function calculateProjectStats(project: any, plots: any[]) {
  const totalPlots = plots.length
  
  let confirmedPlots = 0
  let soldPlots = 0
  let tokenPlots = 0
  let unavailablePlots = 0 // Confirmed or Sold
  
  let totalRevenue = 0
  let amountReceived = 0
  let totalAreaSqYd = 0
  let soldAreaSqYd = 0
  const clients = new Set<string>()

  plots.forEach((plot: any) => {
    totalAreaSqYd += Number(plot.area_sqyd) || 0

    // Filter to get all active bookings for this plot
    const activeBookings = plot.bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'pending') || []
    
    // Fallback to the first booking if no active ones exist, just to check if it's the only one (for backward compatibility if needed)
    const primaryBooking = activeBookings.length > 0 ? activeBookings[0] : plot.bookings?.[0]
    
    let isSold = false
    let isConfirmed = false

    if (activeBookings.length > 0) {
      activeBookings.forEach((activeBooking: any) => {
        const dealValue = (Number(activeBooking.total_amount) || 0) - (Number(activeBooking.discount_amount) || 0)
        const paid = (activeBooking.payments || []).reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0)
        
        if (dealValue > 0 && paid >= dealValue) isSold = true
        if (activeBooking.status === 'confirmed') isConfirmed = true
        
        totalRevenue += dealValue
        amountReceived += paid
      })
    } else {
      totalRevenue += Number(plot.price) || 0
    }

    if (isConfirmed) confirmedPlots++
    if (isSold) soldPlots++
    
    if (plot.status === 'token_paid' || plot.status === 'partially_paid') {
      tokenPlots++
    }

    if (isConfirmed || isSold) {
      unavailablePlots++
      soldAreaSqYd += Number(plot.area_sqyd) || 0
      if (plot.client_id) clients.add(plot.client_id)
    } else if (plot.status !== 'available') {
      // If it's not confirmed/sold but marked as something else not available
      soldAreaSqYd += Number(plot.area_sqyd) || 0
      if (plot.client_id) clients.add(plot.client_id)
    }
  })

  const availablePlots = totalPlots - unavailablePlots



  const pendingAmount = totalRevenue - amountReceived
  const areaPercentageSold = totalAreaSqYd > 0 ? (soldAreaSqYd / totalAreaSqYd) * 100 : 0
  const collectionRate = totalRevenue > 0 ? (amountReceived / totalRevenue) * 100 : 0
  const pendingPercentage = totalRevenue > 0 ? (pendingAmount / totalRevenue) * 100 : 0

  return {
    ...project,
    totalPlots,
    confirmedPlots,
    soldPlots,
    tokenPlots,
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
    pricePerUnit: plots.find((p: any) => p.price_per_unit)?.price_per_unit || 0,
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

  // Calculate and return stats (filter active plots per-project before computing)
  return projects.map(project => {
    const projectPlots = filterActivePlots(project.name, plotsByProject[project.id] || [])
    return calculateProjectStats(project, projectPlots)
  })
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

  // Filter to active plots only (no-op for other projects)
  const activePlots = filterActivePlots(project.name, plots || [])

  const stats = calculateProjectStats(project, activePlots)
  
  // Calculate status counts
  const statusCounts = { available: 0, token: 0, partial: 0, sold: 0 }
  activePlots?.forEach((plot: any) => {
    if (plot.status === 'token_paid' || plot.status === 'partially_paid') statusCounts.token++
    else if (plot.status === 'sold') statusCounts.sold++
  })
  statusCounts.available = (activePlots?.length || 0) - statusCounts.sold

  return { project: stats, statusCounts }
}

// 3. Get Project Plots (includes bookings+payments for layout coloring)
export async function getProjectPlots(projectId: string) {
  const supabase = await createClient()

  // Fetch project name so we can apply active-plot filtering if needed
  const { data: projectMeta } = await supabase
    .from('projects')
    .select('name')
    .eq('id', projectId)
    .single()

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

  // Filter to active plots only (no-op for other projects)
  const activePlots = filterActivePlots(projectMeta?.name ?? '', data || [])

  // Sort numerically so plot 2 comes before plot 10
  return activePlots.sort((a: any, b: any) => {
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
export async function getProjectClients(projectId: string, status?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('plots')
    .select(`
      plot_number,
      status,
      clients(*),
      bookings(
        id, status, total_amount, discount_amount,
        client:client_id(*),
        payments(amount)
      )
    `)
    .eq('project_id', projectId)

  // if (status) {
  //   query = query.eq('status', status)
  // }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  const result: any[] = []
  data.forEach((p: any) => {
    // Get all bookings for this plot that might have a client
    const activeBookings = p.bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'pending') || []
    
    // If no active bookings, but the plot has a client linked directly (legacy/sync issue)
    if (activeBookings.length === 0 && p.clients) {
      let isTokenPaid = p.status === 'token_paid' || p.status === 'partially_paid'
      let isSold = p.status === 'sold'
      
      let match = true
      if (status === 'confirmed') match = false // No booking to be confirmed
      if (status === 'sold') match = isSold
      if (status === 'token_paid') match = isTokenPaid

      if (match) {
        result.push({ ...p.clients, _dealTotal: 0, _paidTotal: 0, _plotNumber: p.plot_number })
      }
    }

    // Process each active booking
    activeBookings.forEach((b: any) => {
      const clientData = b.client || p.clients
      if (!clientData) return

      const clientRecord = { ...clientData, _dealTotal: 0, _paidTotal: 0, _plotNumber: p.plot_number }
      
      let isSold = false
      let isConfirmed = b.status === 'confirmed'
      let isTokenPaid = p.status === 'token_paid' || p.status === 'partially_paid'

      const deal = (Number(b.total_amount) || 0) - (Number(b.discount_amount) || 0)
      const paid = (b.payments || []).reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0)
      
      if (deal > 0 && paid >= deal) isSold = true
      
      clientRecord._dealTotal += deal
      clientRecord._paidTotal += paid

      let match = true
      if (status === 'confirmed') match = isConfirmed
      if (status === 'sold') match = isSold
      if (status === 'token_paid') match = isTokenPaid

      if (match) {
        result.push(clientRecord)
      }
    })
  })

  return result
}
