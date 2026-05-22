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

  // Fetch booking to check commission
  const { data: booking } = await supabase.from('bookings').select('commission_percent, consultant_id, commission_amount, tds_amount').eq('id', formData.booking_id).single()

  let commission_amount = 0;
  let tds_amount = 0;
  if (booking && booking.consultant_id && booking.commission_percent) {
    commission_amount = formData.amount * (booking.commission_percent / 100);
    tds_amount = commission_amount * 0.02; // Fixed 2% TDS
  }

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
      receipt_type: 'payment',
      commission_amount,
      tds_amount
    }])

  if (error) {
    console.error('Error adding payment:', error)
    return { success: false, error: error.message }
  }

  // Update booking aggregates
  if (commission_amount > 0) {
    await supabase.from('bookings').update({
      commission_amount: ((booking as any)?.commission_amount || 0) + commission_amount,
      tds_amount: ((booking as any)?.tds_amount || 0) + tds_amount
    }).eq('id', formData.booking_id);
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
  commission_percent?: number;
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
      commission_percent: formData.commission_percent || 0,
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

// Transfer a booking to a different plot
export async function transferBooking(
  bookingId: string,
  newPlotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Get the current booking details to find old plot ID and status
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('plot_id, status, client_id')
    .eq('id', bookingId)
    .single()

  if (fetchError || !booking) {
    return { success: false, error: fetchError?.message || 'Booking not found' }
  }

  const oldPlotId = booking.plot_id
  const clientId = booking.client_id
  const bookingStatus = booking.status

  // 2. Update booking to point to new plot
  const { error: updateBookingError } = await supabase
    .from('bookings')
    .update({ plot_id: newPlotId })
    .eq('id', bookingId)

  if (updateBookingError) {
    return { success: false, error: updateBookingError.message }
  }

  // 3. Update new plot's status based on booking status
  // If it's confirmed, the plot becomes sold (wait, based on user feedback, sold is 100% payment, but the prompt says "Confirm status is just a way to fix that client to that plot". We will just set it to token_paid or partially_paid or keep whatever status `confirmBooking` does. Since the booking is being transferred, and the instruction says "Confirm status is just a way to fix that client to that plot", we should update the client_id and status if needed. Actually, `createBooking` sets status to 'token_paid' and links client_id. If transferred, we can set it to 'token_paid' if pending, and 'sold' if confirmed (since we are matching existing logic).)
  // Wait, the user said "only pending" bookings can be transferred!
  // So bookingStatus is guaranteed to be 'pending'.
  const newStatus = 'token_paid' // for pending bookings

  const { error: updateNewPlotError } = await supabase
    .from('plots')
    .update({ status: newStatus, client_id: clientId })
    .eq('id', newPlotId)

  if (updateNewPlotError) {
    return { success: false, error: updateNewPlotError.message }
  }

  // 4. Recalculate old plot's status
  const { data: remaining } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('plot_id', oldPlotId)

  const hasConfirmed = (remaining || []).some((b: any) => b.status === 'confirmed')
  const hasPending = (remaining || []).some((b: any) => b.status === 'pending')

  let oldPlotNewStatus = 'available'
  let oldPlotNewClientId = null

  if (hasConfirmed) {
    // Keep existing status/client as is, but we might not know who the confirmed client is here. 
    // Usually if there's a confirmed booking, it's sold.
    oldPlotNewStatus = 'sold'
    // We don't change client_id because it should be linked to the confirmed booking's client
  } else if (hasPending) {
    oldPlotNewStatus = 'token_paid'
    // There are other pending bookings, so leave client_id as whatever it was, 
    // or maybe the first pending booking's client? The system doesn't strictly track which pending client is linked to the plot.
  }

  // Only update client_id if it's becoming available
  const updateData: any = { status: oldPlotNewStatus }
  if (oldPlotNewStatus === 'available') {
    updateData.client_id = null
  }

  const { error: updateOldPlotError } = await supabase
    .from('plots')
    .update(updateData)
    .eq('id', oldPlotId)

  if (updateOldPlotError) {
    return { success: false, error: updateOldPlotError.message }
  }

  revalidatePath('/projects')
  return { success: true }
}

export async function getAvailablePlots(projectId: string) {
  const supabase = await createClient()

  const { data: plots, error } = await supabase
    .from('plots')
    .select('id, plot_number, area_sqyd, price')
    .eq('project_id', projectId)
    .eq('status', 'available')
    .order('plot_number', { ascending: true })

  if (error) {
    console.error('Error fetching available plots:', error)
    return []
  }

  return plots || []
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

// Revert a confirmed booking back to pending
export async function revertBooking(
  bookingId: string,
  plotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Set the booking back to pending
  const { error: revertError } = await supabase
    .from('bookings')
    .update({ status: 'pending' })
    .eq('id', bookingId)

  if (revertError) {
    return { success: false, error: revertError.message }
  }

  // 2. Update plot to token_paid, remove linked client
  const { error: plotError } = await supabase
    .from('plots')
    .update({ status: 'token_paid', client_id: null })
    .eq('id', plotId)

  if (plotError) {
    return { success: false, error: plotError.message }
  }

  revalidatePath('/projects')
  return { success: true }
}

// -- MASTER ADMIN ONLY --------------------------------------------------------

// Edit core plot fields (plot_number, area_sqyd, price, status)
export async function updatePlot(
  plotId: string,
  fields: Partial<{
    plot_number: string
    area_sqyd: number
    price: number
    status: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('plots').update(fields).eq('id', plotId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

// Edit a booking financial / status fields
export async function updateBooking(
  bookingId: string,
  fields: Partial<{
    total_amount: number
    discount_amount: number
    commission_percent: number
    status: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('bookings').update(fields).eq('id', bookingId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

// Edit an individual payment record
export async function updatePayment(
  paymentId: string,
  fields: Partial<{
    amount: number
    payment_date: string
    payment_mode: string
    description: string
    transaction_id: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').update(fields).eq('id', paymentId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

// Delete an individual payment record
export async function deletePayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}
