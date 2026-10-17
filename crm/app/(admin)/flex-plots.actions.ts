'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateFlexPlotInput {
  projectId: string
  plotNumber: string
  areaSqYd: number
  price: number
  pricePerUnit?: number | null
  clientId: string
  totalAmount: number
  discountAmount?: number
  consultantId?: string | null
  commissionPercent?: number
  bookingDate?: string
}

export interface FlexActionResult<T = any> {
  success: boolean
  error?: string
  data?: T
}

/**
 * 1. Computes the next suggested sequential plot number for a project.
 * If plots 1, 2, 3 exist, returns "4".
 * If no plots exist, returns "1".
 */
export async function getNextSequentialPlotNumber(projectId: string): Promise<string> {
  const supabase = await createClient()

  const { data: plots, error } = await supabase
    .from('plots')
    .select('plot_number')
    .eq('project_id', projectId)

  if (error || !plots || plots.length === 0) {
    return '1'
  }

  let maxNumeric = 0
  for (const p of plots) {
    const parsed = parseInt(String(p.plot_number).trim(), 10)
    if (!isNaN(parsed) && parsed > maxNumeric) {
      maxNumeric = parsed
    }
  }

  return String(maxNumeric + 1)
}

/**
 * 2. Fetches all plots for a flex project along with their active bookings and payment progress.
 */
export async function getFlexPlots(projectId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('plots')
    .select(`
      *,
      client:client_id ( id, name, phone ),
      bookings (
        id, total_amount, discount_amount, amount_paid, status, client_id, booking_type, booking_date,
        client:client_id ( id, name, phone, client_code ),
        booking_partners ( client_id, client:client_id ( id, name, phone ) ),
        payments ( amount )
      )
    `)
    .eq('project_id', projectId)

  if (error) {
    console.error('Error fetching flex plots:', error)
    return []
  }

  // Sort plots: numeric first, then string
  return (data || []).sort((a: any, b: any) => {
    const numA = parseInt(a.plot_number, 10)
    const numB = parseInt(b.plot_number, 10)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return String(a.plot_number).localeCompare(String(b.plot_number))
  })
}

/**
 * 3. Atomic creation of a new custom flex plot and its initial booking.
 */
export async function createFlexPlotAndBooking(
  input: CreateFlexPlotInput
): Promise<FlexActionResult<{ plotId: string; plotNumber: string; bookingId: string }>> {
  const supabase = await createClient()

  // 1. Validation
  const plotNumber = input.plotNumber?.trim()
  if (!plotNumber) {
    return { success: false, error: 'Plot number is required.' }
  }
  if (!input.areaSqYd || input.areaSqYd <= 0) {
    return { success: false, error: 'Plot area must be greater than 0.' }
  }
  if (!input.price || input.price <= 0) {
    return { success: false, error: 'Plot price must be greater than 0.' }
  }
  if (!input.clientId) {
    return { success: false, error: 'A primary client must be selected for booking.' }
  }
  if (!input.totalAmount || input.totalAmount <= 0) {
    return { success: false, error: 'Agreed deal value must be greater than 0.' }
  }

  // 2. Verify project exists
  const { data: project, error: projError } = await supabase
    .from('projects')
    .select('id, name, project_code, total_plots, plot_structure')
    .eq('id', input.projectId)
    .single()

  if (projError || !project) {
    return { success: false, error: 'Project not found.' }
  }

  // 3. Ensure plot number is unique within this project
  const { data: existingPlot } = await supabase
    .from('plots')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('plot_number', plotNumber)
    .maybeSingle()

  if (existingPlot) {
    return { success: false, error: `Plot "${plotNumber}" already exists in this project.` }
  }

  // 4. Generate unique plot_code
  const prefix = project.project_code || 'PLT'
  const sanitizedNum = plotNumber.replace(/[^a-zA-Z0-9]/g, '')
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  const plotCode = `${prefix}-P${sanitizedNum}-${randomSuffix}`

  // 5. Calculate price_per_unit if not explicitly supplied
  const pricePerUnit =
    input.pricePerUnit && input.pricePerUnit > 0
      ? input.pricePerUnit
      : Math.round(input.price / input.areaSqYd)

  // 6. Insert new custom plot into `plots`
  // Status is 'token_paid' because an active pending client booking is attached immediately.
  const { data: newPlot, error: plotInsertError } = await supabase
    .from('plots')
    .insert([
      {
        project_id: input.projectId,
        plot_number: plotNumber,
        plot_code: plotCode,
        area_sqyd: input.areaSqYd,
        price: input.price,
        price_per_unit: pricePerUnit,
        status: 'token_paid',
      },
    ])
    .select('id, plot_number')
    .single()

  if (plotInsertError || !newPlot) {
    console.error('Error inserting flex plot:', plotInsertError)
    return { success: false, error: plotInsertError?.message || 'Failed to create plot.' }
  }

  // 7. Insert the booking into `bookings`
  const { data: newBooking, error: bookingInsertError } = await supabase
    .from('bookings')
    .insert([
      {
        plot_id: newPlot.id,
        client_id: input.clientId,
        total_amount: input.totalAmount,
        discount_amount: input.discountAmount || 0,
        consultant_id: input.consultantId || null,
        commission_percent: input.commissionPercent || 0,
        status: 'pending',
        booking_type: 'single',
        booking_date: input.bookingDate || new Date().toISOString(),
      },
    ])
    .select('id')
    .single()

  if (bookingInsertError || !newBooking) {
    console.error('Error creating initial booking for flex plot:', bookingInsertError)
    // Rollback plot creation if booking insert fails
    await supabase.from('plots').delete().eq('id', newPlot.id)
    return { success: false, error: bookingInsertError?.message || 'Failed to create booking for plot.' }
  }

  // 8. Update project total_plots count
  const updatedPlotsCount = (project.total_plots || 0) + 1
  await supabase
    .from('projects')
    .update({ total_plots: updatedPlotsCount })
    .eq('id', input.projectId)

  // 9. Revalidate all relevant Next.js routes
  revalidatePath('/projects')
  revalidatePath(`/projects/${input.projectId}`)
  revalidatePath(`/projects/${input.projectId}/layout`)
  revalidatePath(`/projects/${input.projectId}/list`)
  revalidatePath(`/projects/${input.projectId}/clients`)

  return {
    success: true,
    data: {
      plotId: newPlot.id,
      plotNumber: newPlot.plot_number,
      bookingId: newBooking.id,
    },
  }
}
