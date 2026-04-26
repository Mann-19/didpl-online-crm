import Image from 'next/image'
import { LogOut } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let fullName = 'Client'
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
    
    if (profile?.role !== 'client') {
      redirect('/dashboard')
    }
    
    if (profile?.full_name) fullName = profile.full_name
  } else {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Image src="/DIDPL-LOGO.png" alt="DIDP Logo" width={40} height={40} className="object-contain" priority />
              <span className="font-bold text-gray-900 tracking-tight text-lg">DIDPL Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 hidden sm:block">Welcome, {fullName}</span>
              <form action={async () => {
                'use server'
                const supabase = await createClient()
                await supabase.auth.signOut()
                redirect('/login')
              }}>
                <button type="submit" className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50" title="Sign Out">
                  <LogOut className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
