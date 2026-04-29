import AdminShell from '@/components/admin/AdminShell'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getPendingChangesCount } from '@/app/(admin)/change-requests.actions'

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

  // Fetch pending count for the sidebar badge (only meaningful for admin/master_admin)
  const pendingCount = ['admin', 'master_admin'].includes(devProfile.role)
    ? await getPendingChangesCount()
    : 0

  return (
    <AdminShell userProfile={devProfile} pendingCount={pendingCount}>
      {children}
    </AdminShell>
  )
}