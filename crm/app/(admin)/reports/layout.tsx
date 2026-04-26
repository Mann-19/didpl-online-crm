import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
