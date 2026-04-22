'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- CLIENTS ---
export async function getClients() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('clients').select(`
    *,
    bookings (
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

function generateEntityCode(prefix: string, name: string) {
  const initials = (name || 'XX').substring(0, 2).toUpperCase()
  const randomNum = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${initials}-${randomNum}`
}

export async function addClient(formData: any) {
  const supabase = await createClient()
  
  const client_code = generateEntityCode('CLI', formData.name)
  
  const { error } = await supabase.from('clients').insert([{ ...formData, client_code }])
  if (error) throw new Error(error.message)
  revalidatePath('/clients/list')
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
  
  const consultant_code = generateEntityCode('CONS', formData.name)
  
  // Destructure and map fields to match schema
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
  
  // Remove fields that don't exist in schema
  delete (insertData as any).gender
  delete (insertData as any).birthdate

  const { error } = await supabase.from('consultants').insert([insertData])
  if (error) throw new Error(error.message)
  revalidatePath('/consultants/list')
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
