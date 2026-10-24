'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { filterActivePlots, calculateProjectStats } from '@/lib/analytics/projectStats'


// 1. Get All Projects with Stats
export async function getProjectsWithStats() {
  const supabase = await createClient()

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectsError) {
    console.error('Error fetching projects:', projectsError)
    return []
  }

  // Fetch plots per project to avoid the global 1000 row limit truncating stats for later projects
  const projectsWithStats = await Promise.all(projects.map(async (project: any) => {
    const { data: plots, error: plotsError } = await supabase
      .from('plots')
      .select(`
        *,
        bookings (
          id, total_amount, discount_amount, amount_paid, status, client_id, booking_type,
          booking_partners ( client_id ),
          payments ( amount )
        )
      `)
      .eq('project_id', project.id)
      
    if (plotsError) {
      console.error(`Error fetching plots for project ${project.id}:`, plotsError)
      return calculateProjectStats(project, [])
    }
    
    const projectPlots = filterActivePlots(project.name, plots || [])
    return calculateProjectStats(project, projectPlots)
  }))

  return projectsWithStats
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
        id, total_amount, discount_amount, amount_paid, status, client_id, booking_type,
        booking_partners ( client_id, client:client_id ( id, name ) ),
        payments ( amount )
      )
    `)
    .eq('project_id', projectId)

  if (plotsError) {
    console.error('Error fetching project plots:', plotsError)
    return null
  }

  const activePlots = filterActivePlots(project.name, plots || [])
  const stats = calculateProjectStats(project, activePlots)

  const statusCounts = {
    available: stats.availablePlots,
    token: stats.tokenPlots,
    fullyPaid: stats.fullyPaidPlots,
    sold: stats.soldPlots,
  }

  return { project: stats, statusCounts }
}

// 3. Get Project Plots (includes bookings+payments for layout coloring)
export async function getProjectPlots(projectId: string) {
  const supabase = await createClient()

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
        id, total_amount, discount_amount, amount_paid, status, client_id, booking_type,
        client:client_id ( id, name ),
        booking_partners ( client_id, client:client_id ( id, name ) ),
        payments ( amount )
      )
    `)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching plots:', error)
    return []
  }

  const activePlots = filterActivePlots(projectMeta?.name ?? '', data || [])

  return activePlots.sort((a: any, b: any) => {
    const numA = parseInt(a.plot_number, 10)
    const numB = parseInt(b.plot_number, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return String(a.plot_number).localeCompare(String(b.plot_number))
  })
}

// 4. Update Project
export async function updateProject(projectId: string, formData: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('projects')
    .update(formData)
    .eq('id', projectId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/projects/${projectId}`)
  revalidatePath('/projects')
  return { success: true }
}

// 5. Get Project Clients
export async function getProjectClients(projectId: string, status?: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plots')
    .select(`
      plot_number,
      status,
      clients(*),
      bookings(
        id, status, total_amount, discount_amount, amount_paid,
        client:client_id(*),
        payments(amount)
      )
    `)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching clients:', error)
    return []
  }

  const clientMap = new Map<string, any>()

  data.forEach((p: any) => {
    const activeBookings = status === 'cancelled'
      ? p.bookings?.filter((b: any) => b.status === 'cancelled') || []
      : p.bookings?.filter((b: any) => b.status === 'confirmed' || b.status === 'pending') || []

    activeBookings.forEach((b: any) => {
      const clientData = b.client || p.clients
      if (!clientData) return

      const deal = (Number(b.total_amount) || 0) - (Number(b.discount_amount) || 0)
      const paid = Number(b.amount_paid) || 0

      let isFullyPaid = deal > 0 && paid >= deal
      let isConfirmed = b.status === 'confirmed'
      
      let derivedPlotStatus = 'available'
      if (isFullyPaid && isConfirmed) derivedPlotStatus = 'sold'
      else if (isFullyPaid && !isConfirmed) derivedPlotStatus = 'fully_paid'
      else if (!isFullyPaid) derivedPlotStatus = 'token_paid'

      let match = true
      if (status === 'confirmed') match = (isConfirmed && derivedPlotStatus !== 'sold')
      if (status === 'sold') match = (derivedPlotStatus === 'sold')
      if (status === 'fully_paid') match = (derivedPlotStatus === 'fully_paid')
      if (status === 'token_paid') match = (derivedPlotStatus === 'token_paid')
      if (status === 'cancelled') match = (b.status === 'cancelled')

      if (match) {
        const cId = clientData.id
        if (!clientMap.has(cId)) {
          clientMap.set(cId, { client: clientData, plots: [] })
        }
        clientMap.get(cId).plots.push({
          _plotNumber: p.plot_number,
          _dealTotal: deal,
          _paidTotal: paid,
          status: p.status,
          booking_status: b.status,
        })
      }
    })
  })

  return Array.from(clientMap.values())
}
