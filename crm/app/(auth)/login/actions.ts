'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Set the last_active timestamp cookie for our 10-minute timeout
  const cookieStore = await cookies()
  cookieStore.set('last_active', Date.now().toString(), { path: '/' })

  revalidatePath('/', 'layout')
  redirect('/dashboard') // Will be intercepted by middleware if client
}
