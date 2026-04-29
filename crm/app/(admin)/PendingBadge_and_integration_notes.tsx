// ─────────────────────────────────────────────────────────────────────────────
// FILE 1: components/admin/PendingBadge.tsx
// Drop this badge into your AdminShell sidebar next to "Approvals" nav item.
// It polls every 30s and updates the count live.
// ─────────────────────────────────────────────────────────────────────────────
'use client'

import { useEffect, useState } from 'react'

interface PendingBadgeProps {
  initialCount: number
}

export function PendingBadge({ initialCount }: PendingBadgeProps) {
  const [count, setCount] = useState(initialCount)

  useEffect(() => {
    // Poll every 30 seconds for new pending changes
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/approvals/pending-count')
        if (res.ok) {
          const { count: newCount } = await res.json()
          setCount(newCount)
        }
      } catch {
        // Ignore network errors silently
      }
    }, 30_000)

    return () => clearInterval(interval)
  }, [])

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white text-xs font-bold">
      {count > 99 ? '99+' : count}
    </span>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// FILE 2: app/api/approvals/pending-count/route.ts
// Lightweight API route for the polling badge above.
// Create at: app/api/approvals/pending-count/route.ts
// ─────────────────────────────────────────────────────────────────────────────

/*
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { count } = await supabase
    .from('pending_changes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  return NextResponse.json({ count: count || 0 })
}
*/


// ─────────────────────────────────────────────────────────────────────────────
// FILE 3: Middleware update (middleware.ts)
// Add this block to your existing middleware INSIDE the admin/employee section.
// Ensures only master_admin and admin can reach /approvals.
// ─────────────────────────────────────────────────────────────────────────────

/*
  // In your existing middleware role checks, REPLACE the employee section with:

  } else if (role === 'admin' || role === 'employee') {
    if (path.startsWith('/my-portal') || path.startsWith('/my-deal')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Only admins can access these routes
    if (role === 'employee' && (
      path.startsWith('/settings') ||
      path.startsWith('/reports') ||
      path.startsWith('/expenses') ||
      path.startsWith('/approvals')   // ← ADD THIS LINE
    )) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (path === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
*/


// ─────────────────────────────────────────────────────────────────────────────
// FILE 4: How to add "Approvals" to your AdminShell sidebar
// Find your sidebar nav items array in components/admin/AdminShell.tsx
// and add this entry (visible only to admin/master_admin roles):
// ─────────────────────────────────────────────────────────────────────────────

/*
  // In AdminShell.tsx, inside your navItems or wherever nav links are defined:
  
  // Import the badge:
  // import { PendingBadge } from '@/components/admin/PendingBadge'
  // import { getPendingChangesCount } from '@/app/(admin)/change-requests.actions'

  // In the server component part, fetch the count:
  // const pendingCount = (role === 'admin' || role === 'master_admin')
  //   ? await getPendingChangesCount()
  //   : 0

  // Then in your nav JSX:
  {(role === 'admin' || role === 'master_admin') && (
    <Link href="/approvals" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100">
      <span>🔔</span>
      <span>Approvals</span>
      <PendingBadge initialCount={pendingCount} />
    </Link>
  )}
*/
