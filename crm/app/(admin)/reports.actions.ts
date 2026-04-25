'use server'

import { createClient } from '@/utils/supabase/server'

// ─────────────────────────────────────────────
// GENERAL LEDGER: all payments across all entities
// ─────────────────────────────────────────────
export async function getLedger() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .select(`
      id, amount, payment_date, payment_mode, transaction_type,
      description, entity_type, receipt_type,
      booking:booking_id (
        client:client_id ( id, name, phone ),
        plot:plot_id ( plot_number, project:project_id ( name ) )
      )
    `)
    .order('payment_date', { ascending: false })

  if (error) { console.error('getLedger error:', error); return [] }

  return (data || []).map((p: any) => ({
    id: p.id,
    amount: Number(p.amount),
    payment_date: p.payment_date,
    payment_mode: p.payment_mode,
    transaction_type: p.transaction_type,
    description: p.description,
    entity_type: p.entity_type,
    receipt_type: p.receipt_type,
    client_name: p.booking?.client?.name || null,
    plot_number: p.booking?.plot?.plot_number || null,
    project_name: p.booking?.plot?.project?.name || null,
  }))
}

// ─────────────────────────────────────────────
// RECOVERY REPORT: pending balances per booking
// ─────────────────────────────────────────────
export async function getRecoveryReport() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, total_amount, discount_amount, booking_date, status,
      client:client_id ( id, name, phone ),
      plot:plot_id ( plot_number, project:project_id ( name ) ),
      payments ( amount )
    `)
    .in('status', ['pending', 'token_paid', 'confirmed'])
    .order('booking_date', { ascending: false })

  if (error) { console.error('getRecoveryReport error:', error); return [] }

  return (data || [])
    .map((b: any) => {
      const total = Number(b.total_amount) || 0
      const discount = Number(b.discount_amount) || 0
      const deal = total - discount
      const paid = (b.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0)
      const balance = deal - paid
      return {
        id: b.id,
        name: b.client?.name || 'Unknown',
        phone: b.client?.phone || '',
        plot_number: b.plot?.plot_number || '?',
        project_name: b.plot?.project?.name || '?',
        booking_date: b.booking_date,
        total_amount: deal,
        amount_paid: paid,
        discount_amount: discount,
        balance_due: balance,
        status: b.status,
      }
    })
    .filter((r: any) => r.balance_due > 0)
}

// ─────────────────────────────────────────────
// COMMISSION REPORT: consultant commission per booking
// ─────────────────────────────────────────────
export async function getCommissionReport() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, commission_amount, commission_percent, booking_date, status, total_amount,
      client:client_id ( name ),
      consultant:consultant_id ( id, name, consultant_code ),
      plot:plot_id ( plot_number, project:project_id ( name ) ),
      payments ( id, amount, payment_date, payment_mode, entity_type )
    `)
    .not('consultant_id', 'is', null)
    .order('booking_date', { ascending: false })

  if (error) { console.error('getCommissionReport error:', error); return [] }

  return (data || []).map((b: any) => {
    const commissionEarned = Number(b.commission_amount) || 0
    const tds = commissionEarned * 0.02
    const net = commissionEarned - tds
    const consultantPayouts = (b.payments || [])
      .filter((p: any) => p.entity_type === 'consultant')
      .reduce((s: number, p: any) => s + Number(p.amount), 0)

    return {
      booking_id: b.id,
      booking_date: b.booking_date,
      status: b.status,
      client_name: b.client?.name || '—',
      plot_number: b.plot?.plot_number || '?',
      project_name: b.plot?.project?.name || '?',
      consultant_name: b.consultant?.name || '—',
      consultant_code: b.consultant?.consultant_code || '—',
      consultant_id: b.consultant?.id,
      deal_value: Number(b.total_amount) || 0,
      commission_rate: Number(b.commission_percent) || 0,
      commission_earned: commissionEarned,
      tds,
      net_payable: net,
      paid_out: consultantPayouts,
      balance_due: net - consultantPayouts,
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
      id, booking_code, total_amount, discount_amount, booking_date, status,
      client:client_id ( name, phone, client_code ),
      plot:plot_id ( plot_number, area_sqyd, project:project_id ( name ) ),
      consultant:consultant_id ( name ),
      payments ( amount )
    `)
    .order('booking_date', { ascending: false })

  if (error) { console.error('getBookingReport error:', error); return [] }

  return (data || []).map((b: any) => {
    const total = Number(b.total_amount) || 0
    const discount = Number(b.discount_amount) || 0
    const paid = (b.payments || []).reduce((s: number, p: any) => s + Number(p.amount), 0)

    return {
      id: b.id,
      booking_code: b.booking_code,
      booking_date: b.booking_date,
      status: b.status,
      client_name: b.client?.name || 'Unknown',
      client_phone: b.client?.phone || '',
      plot_number: b.plot?.plot_number || '?',
      project_name: b.plot?.project?.name || '?',
      area_sqyd: b.plot?.area_sqyd || 0,
      consultant_name: b.consultant?.name || '—',
      total_amount: total,
      discount_amount: discount,
      final_deal: total - discount,
      amount_paid: paid,
      balance_due: (total - discount) - paid
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
      id, receipt_no, amount, payment_date, payment_mode, description, transaction_id,
      booking:booking_id (
        client:client_id ( name, client_code ),
        plot:plot_id ( plot_number, project:project_id ( name ) )
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
    description: p.description,
    transaction_id: p.transaction_id,
    client_name: p.booking?.client?.name || '—',
    client_code: p.booking?.client?.client_code || '',
    plot_number: p.booking?.plot?.plot_number || '?',
    project_name: p.booking?.plot?.project?.name || '?',
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
