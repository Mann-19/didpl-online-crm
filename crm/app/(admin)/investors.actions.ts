'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper for entity codes
function generateEntityCode(prefix: string, name: string) {
  const initials = (name || 'XX').substring(0, 2).toUpperCase()
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${initials}-${randomNum}`
}

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

export async function getInvestors() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('investors')
    .select(`
      *,
      investments (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching investors:", error)
    return []
  }

  return data.map((inv: any) => {
    let totalInvested = 0
    let pendingReturns = 0
    let activeInvestmentsCount = 0

    inv.investments?.forEach((investment: any) => {
      totalInvested += Number(investment.invested_amount) || 0
      
      if (investment.status === 'pending') {
        pendingReturns += Number(investment.mature_amount) || 0
        activeInvestmentsCount++
      }
    })

    return {
      ...inv,
      total_invested: totalInvested,
      pending_returns: pendingReturns,
      active_investments_count: activeInvestmentsCount
    }
  })
}

export async function addInvestor(formData: any) {
  const supabase = await createClient()

  const cleanedData = { ...formData }
  for (const key in cleanedData) {
    if (cleanedData[key] === '') cleanedData[key] = null
  }

  const investor_code = await generateUniqueEntityCode(supabase, 'INV', formData.name, 'investors', 'investor_code')
  
  const { error } = await supabase.from('investors').insert([{ ...cleanedData, investor_code }])
  if (error) return { success: false, error: error.message }
  
  revalidatePath('/investors/list')
  return { success: true }
}

export async function getInvestorById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('investors')
    .select(`
      *,
      investments (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching investor:', error)
    return null
  }
  return data
}

export async function updateInvestor(id: string, formData: any) {
  const supabase = await createClient()

  const cleanedData = { ...formData }
  for (const key in cleanedData) {
    if (cleanedData[key] === '') cleanedData[key] = null
  }

  const { error } = await supabase.from('investors').update(cleanedData).eq('id', id)
  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/investors/${id}`)
  revalidatePath('/investors/list')
  return { success: true }
}

export async function addInvestment(investorId: string, formData: any) {
  const supabase = await createClient()
  
  const investment_code = await generateUniqueEntityCode(supabase, 'INVST', 'INV', 'investments', 'investment_code')

  const { error } = await supabase.from('investments').insert([{
    ...formData,
    investor_id: investorId,
    investment_code,
    status: 'pending'
  }])

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/investors/${investorId}`)
  revalidatePath('/investors/list')
  return { success: true }
}

export async function settleInvestment(investmentId: string, investorId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('investments')
    .update({ 
      status: 'settled',
      exit_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', investmentId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/investors/${investorId}`)
  revalidatePath('/investors/list')
  return { success: true }
}

export async function getReferrers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('consultants')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error("Error fetching referrers:", error)
    return []
  }
  return data
}
