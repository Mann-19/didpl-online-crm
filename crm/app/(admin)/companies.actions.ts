'use server'

import { createClient } from '@/utils/supabase/server'

export async function getCompanies() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('companies')
    .select('id, name, slug, display_name, primary_phone, primary_email, logo_url, address')
    .eq('status', 'active')
    .order('name')

  if (error) {
    console.error('Error fetching companies:', error)
    return []
  }

  return data || []
}
