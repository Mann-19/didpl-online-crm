'use server'

import { createClient } from '@/utils/supabase/server'

export async function getCompanies() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('Error fetching companies:', error)
    return []
  }

  return data || []
}
