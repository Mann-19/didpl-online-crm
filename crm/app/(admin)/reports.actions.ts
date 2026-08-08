'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────
// GENERAL LEDGER: all payments across all entities
// ─────────────────────────────────────────────
export async function getLedger() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, amount, payment_date, payment_mode, transaction_type, payment_type,
      description, entity_type, entity_id, company:company_id(id, name),
      booking:booking_id (
        client:client_id ( id, name, phone ),
        plot:plot_id ( plot_number, project:project_id ( name ) )
      )
    `)
    .order('payment_date', { ascending: false })

  if (error) { console.error('getLedger error:', error); return [] }

  const payments = data || []

  // Find unlinked payments that belong to clients
  const unlinkedClientEntityIds = [...new Set(payments
    .filter((p: any) => p.entity_type === 'client' && !p.booking && p.entity_id)
    .map((p: any) => p.entity_id)
  )]

  let clientMap: Record<string, string> = {}

  if (unlinkedClientEntityIds.length > 0) {
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('id, name')
      .in('id', unlinkedClientEntityIds)

    if (!clientsError && clientsData) {
      clientsData.forEach((c: any) => {
        clientMap[c.id] = c.name
      })
    }
  }

  return payments.map((p: any) => {
    let client_name = p.booking?.client?.name || null
    if (!client_name && p.entity_type === 'client' && p.entity_id && clientMap[p.entity_id]) {
      client_name = clientMap[p.entity_id]
    }

    return {
      id: p.id,
      amount: Number(p.amount),
      payment_date: p.payment_date,
      payment_mode: p.payment_mode,
      transaction_type: p.transaction_type,
      payment_type: p.payment_type || 'Plot payment',
      company_id: p.company?.id || null,
      company_name: p.company?.name || 'Unassigned',
      description: p.description,
      entity_type: p.entity_type,
      client_name,
      plot_number: p.booking?.plot?.plot_number || null,
      project_name: p.booking?.plot?.project?.name || null,
    }
  })
}

// ─────────────────────────────────────────────
// RECOVERY REPORT: all clients with outstanding balance
// Covers both pending (token_paid plots) and confirmed (sold plots) bookings
// where the client hasn't fully paid yet.
// ─────────────────────────────────────────────
export async function getRecoveryReport() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, total_amount, discount_amount, booking_date, status,
      client:client_id ( id, name, phone ),
      plot:plot_id ( plot_number, project:project_id ( name ) ),
      amount_paid,
      booking_fees (*),
      payments ( amount, payment_type )
    `)
    .in('status', ['pending', 'confirmed'])
    .order('booking_date', { ascending: false })

  if (error) { console.error('getRecoveryReport error:', error); return [] }

  return (data || [])
    .map((b: any) => {
      const total = Number(b.total_amount) || 0
      const discount = Number(b.discount_amount) || 0
      const deal = total - discount
      const paid = Number(b.amount_paid) || 0
      const balance = deal - paid
      return {
        id: b.id,
        name: b.client?.name || 'Unknown',
        phone: b.client?.phone || '',
        plot_number: b.plot?.plot_number || '?',
        project_name: b.plot?.project?.name || '?',
        booking_date: b.booking_date,
        booking_status: b.status,
        total_amount: deal,
        amount_paid: paid,
        discount_amount: discount,
        balance_due: balance,
        booking_fees: Array.isArray(b.booking_fees) ? b.booking_fees[0] : b.booking_fees,
        payments: b.payments || []
      }
    })
    .filter((r: any) => r.balance_due > 0)
}


// ─────────────────────────────────────────────
// COMMISSION REPORT: per-payment commission rows
// Each row = one client payment that generated commission for the consultant
// ─────────────────────────────────────────────
export async function getCommissionReport() {
  const supabase = await createClient()

  // Fetch all client-side payments that have commission attached
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, amount, payment_date, payment_mode, commission_amount, tds_amount,
      booking:booking_id (
        id, commission_percent, status,
        client:client_id ( id, name ),
        consultant:consultant_id ( id, name, consultant_code ),
        plot:plot_id ( plot_number, project:project_id ( name ) )
      )
    `)
    .eq('entity_type', 'client')
    .eq('transaction_type', 'credit')
    .gt('commission_amount', 0)
    .order('payment_date', { ascending: false })

  if (error) { console.error('getCommissionReport error:', error); return [] }

  // Fetch all payouts to check which ones are already paid
  const { data: payouts } = await supabase
    .from('payments')
    .select('transaction_id')
    .eq('entity_type', 'consultant')
    .eq('transaction_type', 'debit')
    .not('transaction_id', 'is', null)

  const paidOutIds = new Set((payouts || []).map((p: any) => p.transaction_id))

  return (data || []).map((p: any) => {
    const b = p.booking
    const commission = Number(p.commission_amount) || 0
    const tds = Number(p.tds_amount) || 0
    return {
      payment_id: p.id,
      booking_id: b?.id,
      payment_date: p.payment_date,
      payment_mode: p.payment_mode,
      payment_amount: Number(p.amount) || 0,
      commission_rate: Number(b?.commission_percent) || 0,
      commission_amount: commission,
      tds_amount: tds,
      net_payable: commission - tds,
      consultant_id: b?.consultant?.id,
      consultant_name: b?.consultant?.name || '—',
      consultant_code: b?.consultant?.consultant_code || '—',
      client_name: b?.client?.name || '—',
      plot_number: b?.plot?.plot_number || '?',
      project_name: b?.plot?.project?.name || '?',
      booking_status: b?.status || '—',
      is_paid_out: paidOutIds.has(p.id)
    }
  })
}

// ─────────────────────────────────────────────
// BOOKING REPORT: all bookings flat list
// ─────────────────────────────────────────────
export async function getBookingReport() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, booking_code, total_amount, discount_amount, booking_date, status, booking_type,
      client:client_id ( name, phone, client_code ),
      plot:plot_id ( plot_number, area_sqyd, project:project_id ( name ) ),
      consultant:consultant_id ( name ),
      booking_partners ( client:client_id ( name ) ),
      amount_paid,
      booking_fees (*),
      payments ( amount, payment_type )
    `)
    .neq('status', 'cancelled')
    .order('booking_date', { ascending: false })

  if (error) { console.error('getBookingReport error:', error); return [] }

  return (data || []).map((b: any) => {
    const total = Number(b.total_amount) || 0
    const discount = Number(b.discount_amount) || 0
    const paid = Number(b.amount_paid) || 0
    const partnerNames = (b.booking_partners || []).map((bp: any) => bp.client?.name).filter(Boolean)

    return {
      id: b.id,
      booking_code: b.booking_code,
      booking_date: b.booking_date,
      status: b.status,
      booking_type: b.booking_type,
      client_name: b.client?.name || 'Unknown',
      client_phone: b.client?.phone || '',
      partner_names: partnerNames,
      plot_number: b.plot?.plot_number || '?',
      project_name: b.plot?.project?.name || '?',
      area_sqyd: b.plot?.area_sqyd || 0,
      consultant_name: b.consultant?.name || '—',
      total_amount: total,
      discount_amount: discount,
      final_deal: total - discount,
      amount_paid: paid,
      balance_due: (total - discount) - paid,
      booking_fees: Array.isArray(b.booking_fees) ? b.booking_fees[0] : b.booking_fees,
      payments: b.payments || []
    }
  })
}

// ─────────────────────────────────────────────
// RECEIPTS REPORT: All incoming payments/credits
// ─────────────────────────────────────────────
export async function getReceiptReport() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, receipt_no, amount, payment_date, payment_mode, description, transaction_id, payment_type,
      company:company_id(id, name, display_name, primary_phone, primary_email, logo_url, address),
      booking:booking_id (
        client:client_id ( name, client_code, gender, residential_address, residential_city, residential_state, residential_pincode ),
        plot:plot_id ( plot_number, project:project_id ( name ) ),
        booking_partners ( client:client_id ( name ) )
      )
    `)
    .eq('transaction_type', 'credit')
    .order('payment_date', { ascending: false })

  if (error) { console.error('getReceiptReport error:', error); return [] }

  return (data || []).map((p: any) => ({
    id: p.id,
    receipt_no: p.receipt_no || 'N/A',
    amount: Number(p.amount) || 0,
    payment_date: p.payment_date,
    payment_mode: p.payment_mode,
    payment_type: p.payment_type || 'Plot payment',
    description: p.description,
    transaction_id: p.transaction_id || p.description || 'N/A',
    company_id: p.company?.id || null,
    company_name: p.company?.name || 'Unassigned',
    company_display_name: p.company?.display_name || p.company?.name || null,
    company_phone: p.company?.primary_phone || null,
    company_email: p.company?.primary_email || null,
    company_logo: p.company?.logo_url || null,
    company_address: p.company?.address || null,
    client_name: p.booking?.client?.name || '—',
    gender: p.booking?.client?.gender || null,
    residential_address: p.booking?.client?.residential_address || null,
    client_city: p.booking?.client?.residential_city || null,
    client_state: p.booking?.client?.residential_state || null,
    client_pincode: p.booking?.client?.residential_pincode || null,
    client_code: p.booking?.client?.client_code || '',
    plot_number: p.booking?.plot?.plot_number || '?',
    project_name: p.booking?.plot?.project?.name || '?',
    partner_names: (p.booking?.booking_partners || []).map((bp: any) => bp.client?.name).filter(Boolean),
  }))
}

// ─────────────────────────────────────────────
// EXPENSE REPORT: All company expenses
// ─────────────────────────────────────────────
export async function getExpenseReport() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })

  if (error) { console.error('getExpenseReport error:', error); return [] }

  return data || []
}
