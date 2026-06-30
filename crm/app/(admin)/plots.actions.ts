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
        booking_partners (
          client_id,
          added_at,
          client:client_id ( id, name, phone, email, client_code )
        ),
        consultant:consultant_id ( id, name ),
        payments ( * ),
        booking_fees ( * )
      )
    `)

  // If it looks like a UUID, query by id. Otherwise query by plot_number within the project.
  if (isUUID(plotId)) {
    query = query.eq('id', plotId)
  } else if (projectId) {
    query = query.eq('plot_number', plotId).eq('project_id', projectId)
  } else {
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

export async function getBookingById(bookingId: string) {
  const supabase = await createClient()

  const { data: booking, error } = await supabase
    .from('bookings')
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
    .eq('id', bookingId)
    .single()

  if (error) {
    console.error('Error fetching booking details:', error)
    return null
  }

  return booking
}


export async function addPayment(formData: {
  booking_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  description: string;
  transaction_id?: string;
  entity_id: string;
  payment_type?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Fetch booking to get commission_percent (commission/TDS now calculated per-payment)
  const { data: booking } = await supabase
    .from('bookings')
    .select('commission_percent, consultant_id')
    .eq('id', formData.booking_id)
    .single()

  // Calculate commission and TDS for this individual payment
  let commission_amount = 0
  let tds_amount = 0
  
  // Fees do not generate commission
  const isPlotPayment = !formData.payment_type || formData.payment_type === 'Plot payment'
  
  if (isPlotPayment && booking?.consultant_id && booking?.commission_percent) {
    commission_amount = formData.amount * (booking.commission_percent / 100)
    tds_amount = commission_amount * 0.02 // Fixed 2% TDS
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
      payment_type: formData.payment_type || 'Plot payment',
      commission_amount,
      tds_amount,
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
  commission_percent?: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Guard: reject if plot already has a confirmed booking
  const { data: existingConfirmed } = await supabase
    .from('bookings')
    .select('id')
    .eq('plot_id', formData.plot_id)
    .eq('status', 'confirmed')
    .limit(1)

  if (existingConfirmed && existingConfirmed.length > 0) {
    return { success: false, error: 'This plot already has a confirmed booking and cannot accept new bookings.' }
  }

  const { error: bookingError } = await supabase
    .from('bookings')
    .insert([{
      plot_id: formData.plot_id,
      client_id: formData.client_id,
      total_amount: formData.total_amount,
      discount_amount: formData.discount_amount || 0,
      consultant_id: formData.consultant_id || null,
      commission_percent: formData.commission_percent || 0,
      status: 'pending',
      booking_type: 'single',
    }])

  if (bookingError) {
    console.error('Error creating booking:', bookingError)
    return { success: false, error: bookingError.message }
  }



  revalidatePath('/projects')
  return { success: true }
}

// Confirm a booking as the winner — cancel all other pending bookings on same plot
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



  revalidatePath('/projects')
  return { success: true }
}

// Cancel (remove) a single booking and recalculate plot status
export async function cancelBooking(
  bookingId: string,
  plotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Delete the booking (booking_partners rows cascade-delete automatically)
  const { error: deleteError } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)

  if (deleteError) {
    return { success: false, error: deleteError.message }
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

  // 1. Get current booking details
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

  // 2. Get new plot's list price
  const { data: newPlot, error: newPlotError } = await supabase
    .from('plots')
    .select('price')
    .eq('id', newPlotId)
    .single()

  if (newPlotError || !newPlot) {
    return { success: false, error: newPlotError?.message || 'New plot not found' }
  }

  // 3. Check if the client already has a booking for the new plot (e.g., cancelled or pending)
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', clientId)
    .eq('plot_id', newPlotId)
    .single()

  if (existingBooking) {
    // Transfer payments to the existing booking
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ booking_id: existingBooking.id })
      .eq('booking_id', bookingId)
      
    if (paymentError) return { success: false, error: paymentError.message }

    // Transfer booking_partners to the existing booking
    await supabase
      .from('booking_partners')
      .update({ booking_id: existingBooking.id })
      .eq('booking_id', bookingId)

    // Delete the old booking
    const { error: deleteError } = await supabase
      .from('bookings')
      .delete()
      .eq('id', bookingId)

    if (deleteError) return { success: false, error: deleteError.message }
  } else {
    // 4. Update booking to point to new plot, reset total_amount to new plot's list price
    const { error: updateBookingError } = await supabase
      .from('bookings')
      .update({ plot_id: newPlotId, total_amount: newPlot.price })
      .eq('id', bookingId)

    if (updateBookingError) {
      return { success: false, error: updateBookingError.message }
    }
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

// Get plots transferable for a specific client:
// - Available plots in the project
// - Plots where client already has a booking (own or as partner) — for merge
export async function getTransferablePlotsForClient(projectId: string, clientId: string) {
  const supabase = await createClient()

  // 1. All available plots
  const { data: available } = await supabase
    .from('plots')
    .select('id, plot_number, area_sqyd, price, status')
    .eq('project_id', projectId)
    .eq('status', 'available')
    .order('plot_number', { ascending: true })

  // 2. Plots where this client is the primary client on active bookings
  const { data: primaryBookings } = await supabase
    .from('bookings')
    .select('plot:plot_id ( id, plot_number, area_sqyd, price, status )')
    .eq('client_id', clientId)
    .in('status', ['pending', 'confirmed'])

  // 3. Plots where this client is a partner (via booking_partners)
  const { data: partnerRows } = await supabase
    .from('booking_partners')
    .select('booking:booking_id ( plot:plot_id ( id, plot_number, area_sqyd, price, status ) )')
    .eq('client_id', clientId)

  // Merge and deduplicate by plot id, tagging partnership plots
  const seenPrimary = new Set<string>()
  const seenPartner = new Set<string>()
  const result: any[] = []

  ;(available || []).forEach((p: any) => {
    if (!seenPrimary.has(p.id)) { seenPrimary.add(p.id); result.push({ ...p, uniqueKey: p.id + '_primary', isPartnership: false }) }
  })
  ;(primaryBookings || []).forEach((b: any) => {
    const p = b.plot
    if (p && !seenPrimary.has(p.id)) { seenPrimary.add(p.id); result.push({ ...p, uniqueKey: p.id + '_primary', isPartnership: false }) }
  })
  ;(partnerRows || []).forEach((row: any) => {
    const p = row.booking?.plot
    if (p && !seenPartner.has(p.id)) { seenPartner.add(p.id); result.push({ ...p, uniqueKey: p.id + '_partner', isPartnership: true }) }
  })

  return result.sort((a: any, b: any) => {
    const na = parseInt(a.plot_number, 10)
    const nb = parseInt(b.plot_number, 10)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return String(a.plot_number).localeCompare(String(b.plot_number))
  })
}

// Add a partner client to an existing booking
export async function addPartnerToBooking(
  bookingId: string,
  partnerClientId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Insert into junction table — trigger auto-updates booking_type to 'partnership'
  const { error } = await supabase
    .from('booking_partners')
    .insert([{ booking_id: bookingId, client_id: partnerClientId }])

  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

// Remove a specific partner from a booking
export async function removePartnerFromBooking(
  bookingId: string,
  partnerClientId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Fetch original booking details
  const { data: originalBooking, error: fetchErr } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (fetchErr || !originalBooking) {
    return { success: false, error: fetchErr?.message || 'Original booking not found' }
  }

  // 2. Check if the partner already has an individual booking for this plot
  let targetBookingId: string;
  const { data: existingBooking } = await supabase
    .from('bookings')
    .select('id')
    .eq('client_id', partnerClientId)
    .eq('plot_id', originalBooking.plot_id)
    .single()

  if (existingBooking) {
    targetBookingId = existingBooking.id;
  } else {
    // 3. Create a new individual booking for the partner (status: cancelled)
    const { data: newBooking, error: insertErr } = await supabase
      .from('bookings')
      .insert([{
        plot_id: originalBooking.plot_id,
        client_id: partnerClientId,
        total_amount: originalBooking.total_amount,
        discount_amount: originalBooking.discount_amount || 0,
        consultant_id: originalBooking.consultant_id || null,
        commission_percent: originalBooking.commission_percent || 0,
        status: 'pending',
        booking_type: 'single'
      }])
      .select('id')
      .single()

    if (insertErr) return { success: false, error: insertErr.message }
    targetBookingId = newBooking.id;
  }

  // 4. Transfer all payments made by this partner from the partnership booking to their new individual booking
  const { error: paymentErr } = await supabase
    .from('payments')
    .update({ booking_id: targetBookingId })
    .eq('booking_id', bookingId)
    .eq('entity_id', partnerClientId)

  if (paymentErr) return { success: false, error: paymentErr.message }

  // 5. Delete specific partner row
  const { error } = await supabase
    .from('booking_partners')
    .delete()
    .eq('booking_id', bookingId)
    .eq('client_id', partnerClientId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}

// Merge a client's booking from one plot into an existing partnership booking on another plot.
// All payments from the source booking are re-attributed to the target booking.
// The source booking is then deleted and the source plot status is recalculated.
export async function mergeTransferIntoPartnership(
  sourceBookingId: string,
  targetBookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Fetch source booking details
  const { data: sourceBooking, error: srcErr } = await supabase
    .from('bookings')
    .select('plot_id, client_id, payments ( id )')
    .eq('id', sourceBookingId)
    .single()

  if (srcErr || !sourceBooking) return { success: false, error: srcErr?.message || 'Source booking not found' }

  const sourcePlotId = sourceBooking.plot_id
  const sourcePaymentIds = (sourceBooking.payments || []).map((p: any) => p.id)

  // 2. Move all payments to the target booking
  if (sourcePaymentIds.length > 0) {
    const { error: payErr } = await supabase
      .from('payments')
      .update({ booking_id: targetBookingId })
      .in('id', sourcePaymentIds)
    if (payErr) return { success: false, error: payErr.message }
  }

  // 3. Delete source booking (booking_partners rows cascade-delete automatically)
  const { error: delErr } = await supabase
    .from('bookings')
    .delete()
    .eq('id', sourceBookingId)
  if (delErr) return { success: false, error: delErr.message }



  revalidatePath('/projects')
  return { success: true }
}

export async function mergeBookingsOnSamePlot(
  sourceBookingId: string,
  targetBookingId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Fetch source booking details, including primary client and partners
  const { data: sourceBooking, error: srcErr } = await supabase
    .from('bookings')
    .select('plot_id, client_id, booking_partners ( client_id ), payments ( id )')
    .eq('id', sourceBookingId)
    .single()

  if (srcErr || !sourceBooking) return { success: false, error: srcErr?.message || 'Source booking not found' }

  // 2. Fetch target booking details
  const { data: targetBooking, error: tgtErr } = await supabase
    .from('bookings')
    .select('plot_id, client_id')
    .eq('id', targetBookingId)
    .single()

  if (tgtErr || !targetBooking) return { success: false, error: tgtErr?.message || 'Target booking not found' }

  if (sourceBooking.plot_id !== targetBooking.plot_id) {
    return { success: false, error: 'Bookings do not belong to the same plot' }
  }

  // 3. Collect clients to merge as partners (primary client + existing partners)
  const clientsToAdd = new Set<string>()
  clientsToAdd.add(sourceBooking.client_id)
  ;(sourceBooking.booking_partners || []).forEach((bp: any) => {
    clientsToAdd.add(bp.client_id)
  })

  // Prevent adding the target booking's primary client as a partner to itself
  clientsToAdd.delete(targetBooking.client_id)

  const partnerInserts = Array.from(clientsToAdd).map((clientId) => ({
    booking_id: targetBookingId,
    client_id: clientId,
  }))

  if (partnerInserts.length > 0) {
    const { error: partErr } = await supabase
      .from('booking_partners')
      .upsert(partnerInserts, { onConflict: 'booking_id, client_id' })
    if (partErr) return { success: false, error: partErr.message }
  }

  // 4. Move all payments to the target booking
  const sourcePaymentIds = (sourceBooking.payments || []).map((p: any) => p.id)
  if (sourcePaymentIds.length > 0) {
    const { error: payErr } = await supabase
      .from('payments')
      .update({ booking_id: targetBookingId })
      .in('id', sourcePaymentIds)
    if (payErr) return { success: false, error: payErr.message }
  }

  // 5. Delete source booking
  const { error: delErr } = await supabase
    .from('bookings')
    .delete()
    .eq('id', sourceBookingId)
  if (delErr) return { success: false, error: delErr.message }

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

// Revert a confirmed booking back to pending
export async function revertBooking(
  bookingId: string,
  plotId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // 1. Fetch the booking's client to maintain the plot link correctly
  const { data: booking } = await supabase
    .from('bookings')
    .select('client_id')
    .eq('id', bookingId)
    .single()

  // 2. Set the booking back to pending
  const { error: revertError } = await supabase
    .from('bookings')
    .update({ status: 'pending' })
    .eq('id', bookingId)

  if (revertError) {
    return { success: false, error: revertError.message }
  }



  revalidatePath('/projects')
  return { success: true }
}

// -- MASTER ADMIN ONLY --------------------------------------------------------

// Edit core plot fields
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

// Edit a booking's financial / status fields
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
    payment_type: string
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

export async function deleteChangeRequest(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('pending_changes').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

// TEMPORARY_GOV_FEES_V200: Added govFees
export async function updateBookingFees(bookingId: string, fees: { stampDuty: string | number, legal: string | number, maintenance: string | number, registration: string | number, govFees?: string | number }) {
  const supabase = await createClient()
  const { error } = await supabase.from('booking_fees').upsert({
    booking_id: bookingId,
    stamp_duty: fees.stampDuty,
    legal_fees: fees.legal,
    maintenance_fees: fees.maintenance,
    registration_fees: fees.registration,
    gov_fees: fees.govFees, // TEMPORARY_GOV_FEES_V200
    updated_at: new Date().toISOString()
  }, { onConflict: 'booking_id' })
  
  if (error) return { success: false, error: error.message }
  revalidatePath('/projects')
  return { success: true }
}
