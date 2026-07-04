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

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  // Fetch pending count for the sidebar badge (only meaningful for admin/master_admin)
  const pendingCount = ['admin', 'master_admin'].includes(profile.role)
    ? await getPendingChangesCount()
    : 0

  return (
    <AdminShell userProfile={profile} pendingCount={pendingCount}>
      {children}
    </AdminShell>
  )
}