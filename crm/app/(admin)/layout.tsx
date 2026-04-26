import AdminShell from '@/components/admin/AdminShell'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = user ? await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() : { data: null }

  // Temporarily bypass auth for development
  const devProfile = profile || { role: 'admin', full_name: 'Dev Mode' }

  return <AdminShell userProfile={devProfile}>{children}</AdminShell>
}
