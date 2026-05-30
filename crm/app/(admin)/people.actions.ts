'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- CLIENTS ---
export async function getClients() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select(`
    *,
    bookings!bookings_client_id_fkey (
      plots (
        projects ( name )
      )
    )
  `).order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching clients", error)
    return []
  }

  return data.map((client: any) => {
    const projectsSet = new Set<string>()
    client.bookings?.forEach((b: any) => {
      const pName = b.plots?.projects?.name
      if (pName) projectsSet.add(pName)
    })

    const projectsArr = Array.from(projectsSet)
    return {
      ...client,
      projects: projectsArr,
      project_name: projectsArr[0] || ''
    }
  })
}

// Generate human-readable entity codes (e.g. CLI-MA-3821)
function generateEntityCode(prefix: string, name: string) {
  const initials = (name || 'XX').substring(0, 2).toUpperCase()
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${initials}-${randomNum}`
}

// Generate a unique code with collision retry (up to 5 attempts)
async function generateUniqueEntityCode(
  supabase: any,
  prefix: string,
  name: string,
  table: string,
  column: string
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateEntityCode(prefix, name)
    const { count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq(column, code)
    if (count === 0) return code
  }
  throw new Error(`Could not generate unique ${prefix} code after 5 attempts`)
}

export async function addClient(formData: any) {
  const supabase = await createClient()
  const client_code = await generateUniqueEntityCode(supabase, 'CLI', formData.name, 'clients', 'client_code')
  const { error } = await supabase.from('clients').insert([{ ...formData, client_code }])
  if (error) return { success: false, error: error.message }
  revalidatePath('/clients/list')
  return { success: true }
}

export async function getClientById(clientId: string) {
  const supabase = await createClient()

  // Primary bookings: this client is the deal owner
  const { data, error } = await supabase
    .from('clients')
    .select(`
      *,
      bookings!bookings_client_id_fkey (
        id, status, total_amount, discount_amount, booking_date, booking_type,
        booking_partners (
          client_id,
          client:client_id ( id, name )
        ),
        plots ( id, plot_number, project_id, projects ( id, name ) ),
        payments ( id, amount, payment_date, payment_mode, transaction_id, description, entity_id )
      )
    `)
    .eq('id', clientId)
    .single()
  if (error) { console.error('Error fetching client:', error); return null }

  // Partnership bookings: this client was added as a partner on another booking
  const { data: partnerRows } = await supabase
    .from('booking_partners')
    .select(`
      booking:booking_id (
        id, status, total_amount, discount_amount, booking_date, booking_type,
        client:client_id ( id, name ),
        booking_partners (
          client_id,
          client:client_id ( id, name )
        ),
        plots ( id, plot_number, project_id, projects ( id, name ) ),
        payments ( id, amount, payment_date, payment_mode, transaction_id, description, entity_id )
      )
    `)
    .eq('client_id', clientId)

  const partnerBookings = (partnerRows || [])
    .map((row: any) => row.booking)
    .filter(Boolean)
    .map((b: any) => ({ ...b, isPartnership: true }))

  const primaryBookings = (data.bookings || []).map((b: any) => ({ ...b, isPartnership: false }))

  return { ...data, bookings: [...primaryBookings, ...partnerBookings] }
}

export async function updateClient(clientId: string, formData: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('clients').update(formData).eq('id', clientId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients/list')
  return { success: true }
}

// --- CONSULTANTS ---
export async function getConsultants() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('consultants').select('*').order('created_at', { ascending: false })
  if (error) {
    console.error("Error fetching consultants", error)
    return []
  }
  return data
}

export async function addConsultant(formData: any) {
  const supabase = await createClient()

  const consultant_code = await generateUniqueEntityCode(supabase, 'CONS', formData.name, 'consultants', 'consultant_code')

  const {
    bank_account,
    account_number,
    residential_address,
    residential_city,
    residential_state,
    residential_pincode,
    ...rest
  } = formData

  const insertData = {
    ...rest,
    consultant_code,
    account_number: account_number || bank_account,
    address: residential_address
      ? `${residential_address}${residential_city ? ', ' + residential_city : ''}${residential_state ? ', ' + residential_state : ''}${residential_pincode ? ' - ' + residential_pincode : ''}`
      : undefined
  }

  delete (insertData as any).gender
  delete (insertData as any).birthdate

  const { error } = await supabase.from('consultants').insert([insertData])
  if (error) throw new Error(error.message)
  revalidatePath('/consultants/list')
}

export async function getConsultantById(consultantId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultants')
    .select(`
      *,
      bookings (
        id, status, total_amount, discount_amount, booking_date,
        client:client_id ( id, name, phone ),
        plot:plot_id ( id, plot_number, project:project_id ( id, name ) ),
        payments ( id, amount, payment_date, payment_mode, description, entity_type, commission_amount, tds_amount )
      )
    `)
    .eq('id', consultantId)
    .single()
  if (error) { console.error('Error fetching consultant:', error); return null }

  const { data: payouts } = await supabase
    .from('payments')
    .select('*')
    .eq('entity_id', consultantId)
    .eq('entity_type', 'consultant')
    .eq('transaction_type', 'debit')
    .order('payment_date', { ascending: false })

  return { ...data, payouts: payouts || [] }
}

export async function updateConsultant(consultantId: string, formData: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('consultants').update(formData).eq('id', consultantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/consultants/${consultantId}`)
  revalidatePath('/consultants/list')
  return { success: true }
}

export async function addConsultantPayout(formData: {
  consultant_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  notes: string;
  client_payment_id?: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').insert([{
    entity_id: formData.consultant_id,
    entity_type: 'consultant',
    transaction_type: 'debit',
    amount: formData.amount,
    payment_date: formData.payment_date,
    payment_mode: formData.payment_mode,
    description: formData.notes || 'Commission Payout',
    transaction_id: formData.client_payment_id || null,
  }])
  if (error) return { success: false, error: error.message }
  revalidatePath(`/consultants/${formData.consultant_id}`)
  return { success: true }
}

// --- EMPLOYEES ---
export async function getEmployees() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('employees').select(`
    *,
    profiles ( role, full_name, phone )
  `).order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching employees", error)
    return []
  }

  return data.map((emp: any) => ({
    ...emp,
    role: emp.profiles?.role || 'employee',
    name: emp.profiles?.full_name || 'Unknown',
    phone: emp.profiles?.phone || ''
  }))
}

export async function addEmployee(formData: any): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const employee_code = await generateUniqueEntityCode(supabase, 'EMP', formData.name || 'EMP', 'employees', 'employee_code')
  const { error } = await supabase.from('employees').insert([{
    employee_code,
    designation: formData.designation || null,
    salary: formData.salary ? parseFloat(formData.salary) : null,
    joining_date: formData.joining_date || null,
    address: formData.address || null,
    emergency_contact: formData.emergency_contact || null,
    bank_name: formData.bank_name || null,
    account_number: formData.account_number || null,
    ifsc_code: formData.ifsc_code || null,
    pan_number: formData.pan_number || null,
  }])
  if (error) return { success: false, error: error.message }
  revalidatePath('/employees/list')
  return { success: true }
}

// -- MASTER ADMIN ONLY --------------------------------------------------------

// Hard delete a client and all related data
export async function deleteClient(
  clientId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Fetch all primary bookings for this client
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, plot_id')
    .eq('client_id', clientId)

  if (bookings && bookings.length > 0) {
    const bookingIds = bookings.map((b: any) => b.id)

    // Delete payments tied to those bookings
    await supabase.from('payments').delete().in('booking_id', bookingIds)

    // Reset plots that were associated with this client
    for (const booking of bookings) {
      await supabase
        .from('plots')
        .update({ status: 'available', client_id: null })
        .eq('id', booking.plot_id)
        .eq('client_id', clientId)
    }

    // Delete bookings (booking_partners rows CASCADE automatically via FK)
    await supabase.from('bookings').delete().eq('client_id', clientId)
  }

  // Delete any direct client-level payments (entity_type = 'client')
  await supabase.from('payments').delete().eq('entity_id', clientId).eq('entity_type', 'client')

  // Delete the client record
  const { error } = await supabase.from('clients').delete().eq('id', clientId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/clients/list')
  return { success: true }
}

export async function updateClientPayment(
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
  revalidatePath('/clients')
  return { success: true }
}

export async function deleteClientPayment(
  paymentId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/clients')
  return { success: true }
}

export async function updateConsultantPayout(
  payoutId: string,
  fields: Partial<{
    amount: number
    payment_date: string
    payment_mode: string
    description: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').update(fields).eq('id', payoutId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/consultants')
  return { success: true }
}

export async function deleteConsultantPayout(
  payoutId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').delete().eq('id', payoutId)
  if (error) return { success: false, error: error.message }
  revalidatePath('/consultants')
  return { success: true }
}
