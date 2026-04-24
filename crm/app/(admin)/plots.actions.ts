'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper: is string a UUID?
function isUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function getPlotDetails(plotId: string, projectId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('plots')
    .select(`
      *,
      project:project_id ( id, name ),
      client:client_id ( id, name, phone, email, client_code ),
      bookings (
        *,
        client:client_id ( id, name, phone, email, client_code ),
        consultant:consultant_id ( id, name ),
        payments ( * )
      )
    `)

  // If it looks like a UUID, query by id. Otherwise query by plot_number within the project.
  if (isUUID(plotId)) {
    query = query.eq('id', plotId)
  } else if (projectId) {
    query = query.eq('plot_number', plotId).eq('project_id', projectId)
  } else {
    // Can't look up without projectId for a non-UUID plotId
    console.error('getPlotDetails: non-UUID plotId requires projectId')
    return null
  }

  const { data: plot, error } = await query.single()

  if (error) {
    console.error('Error fetching plot details:', error)
    return null
  }

  return plot
}


export async function addPayment(formData: {
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  description: string;
  transaction_id?: string;
  entity_id: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('payments')
    .insert([{
      booking_id: formData.booking_id,
      amount: formData.amount,
      payment_date: formData.payment_date,
      payment_mode: formData.payment_mode,
      description: formData.description,
      transaction_id: formData.transaction_id || null,
      entity_id: formData.entity_id,
      entity_type: 'client',
      transaction_type: 'credit',
      receipt_type: 'payment'
    }])

  if (error) {
    console.error('Error adding payment:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/projects')
  return { success: true }
}

export async function createBooking(formData: {
  plot_id: string;
  client_id: string;
  total_amount: number;
  discount_amount?: number;
  consultant_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error: bookingError } = await supabase
    .from('bookings')
    .insert([{
      plot_id: formData.plot_id,
      client_id: formData.client_id,
      total_amount: formData.total_amount,
      discount_amount: formData.discount_amount || 0,
      consultant_id: formData.consultant_id || null,
      status: 'pending'  // always start as negotiation/pending
    }])

  if (bookingError) {
    console.error('Error creating booking:', bookingError)
    return { success: false, error: bookingError.message }
  }

  // Move plot to token_paid and link client if it was available
  const { error: plotError } = await supabase
    .from('plots')
    .update({ status: 'token_paid', client_id: formData.client_id })
    .eq('id', formData.plot_id)
    .eq('status', 'available') // only update if still available

  // If plot was already token_paid/partially_paid, that's fine — ignore the no-op
  if (plotError) {
    console.error('Error updating plot status:', plotError)
    return { success: false, error: plotError.message }
  }

  revalidatePath('/projects')
  return { success: true }
}

// Confirm a booking as the winner — demote all other bookings on same plot
export async function confirmBooking(
  bookingId: string,
  plotId: string,
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Set the winning booking to confirmed
  const { error: confirmError } = await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)

  if (confirmError) {
    return { success: false, error: confirmError.message }
  }

  // 2. Cancel all OTHER pending bookings on this plot
  const { error: demoteError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('plot_id', plotId)
    .neq('id', bookingId)
    .eq('status', 'pending')

  if (demoteError) {
    return { success: false, error: demoteError.message }
  }

  // 3. Update plot to sold, link confirmed client
  const { error: plotError } = await supabase
    .from('plots')
    .update({ status: 'sold', client_id: clientId })
    .eq('id', plotId)

  if (plotError) {
    return { success: false, error: plotError.message }
  }

  revalidatePath('/projects')
  return { success: true }
}

// Cancel (remove) a single booking and recalculate plot status
export async function cancelBooking(
  bookingId: string,
  plotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Delete the booking
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
  }

  // 2. Check remaining bookings on this plot
  const { data: remaining } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('plot_id', plotId)

  const hasConfirmed = (remaining || []).some((b: any) => b.status === 'confirmed')
  const hasPending = (remaining || []).some((b: any) => b.status === 'pending')

  let newStatus = 'available'
  let newClientId = null

  if (hasConfirmed) {
    newStatus = 'sold'
    // Keep existing client_id — no change needed
    revalidatePath('/projects')
    return { success: true }
  } else if (hasPending) {
    newStatus = 'token_paid'
  }

  const { error: plotError } = await supabase
    .from('plots')
    .update({ status: newStatus, client_id: newClientId })
    .eq('id', plotId)

  if (plotError) {
    return { success: false, error: plotError.message }
  }

  revalidatePath('/projects')
  return { success: true }
}

// Update discount on an existing booking
export async function updateBookingDiscount(
  bookingId: string,
  discountAmount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ discount_amount: discountAmount })
    .eq('id', bookingId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/projects')
  return { success: true }
}


