'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getExpenses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('expense_date', { ascending: false })

  if (error) {
    console.error('getExpenses error:', error)
    return []
  }
  return data
}

export async function addExpense(formData: {
  expense_date: string;
  to_entity: string;
  expense_type: string;
  payment_mode: string;
  transaction_id: string;
  amount: number;
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  remarks: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').insert([{
    expense_date: formData.expense_date || new Date().toISOString().split('T')[0],
    to_entity: formData.to_entity,
    expense_type: formData.expense_type,
    payment_mode: formData.payment_mode || null,
    transaction_id: formData.transaction_id || null,
    amount: formData.amount,
    bank_name: formData.bank_name || null,
    branch_name: formData.branch_name || null,
    ifsc_code: formData.ifsc_code || null,
    remarks: formData.remarks || null
  }])

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/expenses')
  revalidatePath('/reports/expenses')
  return { success: true }
}

export async function updateExpense(id: string, formData: Partial<{
  expense_date: string;
  to_entity: string;
  expense_type: string;
  payment_mode: string;
  transaction_id: string;
  amount: number;
  bank_name: string;
  branch_name: string;
  ifsc_code: string;
  remarks: string;
}>): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').update(formData).eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/expenses')
  revalidatePath('/reports/expenses')
  return { success: true }
}

export async function deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('expenses').delete().eq('id', id)

  if (error) return { success: false, error: error.message }
  
  revalidatePath('/expenses')
  revalidatePath('/reports/expenses')
  return { success: true }
}
