import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export async function proxy(request: NextRequest) {
  try {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public routes
  if (path === '/login' || path.startsWith('/_next') || path.includes('.')) {
    // If logged in and hitting login page, redirect to dashboard or portal
    if (user && path === '/login') {
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile?.role === 'client') {
        return NextResponse.redirect(new URL('/my-portal', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return supabaseResponse
  }

  // Not logged in
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // === 10-Minute Inactivity Check ===
  const lastActiveStr = request.cookies.get('last_active')?.value
  const now = Date.now()

  if (lastActiveStr) {
    const lastActive = parseInt(lastActiveStr, 10)
    if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
      // Session expired! Sign out and redirect to login
      await supabase.auth.signOut()
      const response = NextResponse.redirect(new URL('/login?expired=true', request.url))
      response.cookies.delete('last_active')
      return response
    }
  }

  // Update last_active cookie for this request
  supabaseResponse.cookies.set('last_active', now.toString(), { path: '/' })

  // Route protection by role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = profile?.role

  if (role === 'client') {
    // Clients can only access /my-portal and /my-deal
    if (!path.startsWith('/my-portal') && !path.startsWith('/my-deal')) {
      return NextResponse.redirect(new URL('/my-portal', request.url))
    }
  } else if (role === 'admin' || role === 'employee') {
    // Employees and Admins cannot access client areas
    if (path.startsWith('/my-portal') || path.startsWith('/my-deal')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Only admins can access /settings and /reports and /expenses
    if (role === 'employee' && (path.startsWith('/settings') || path.startsWith('/reports') || path.startsWith('/expenses'))) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    
    // Redirect / to /dashboard
    if (path === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
  } catch (error: any) {
    console.error('Middleware Error:', error)
    return new NextResponse(
      'Middleware Invocation Failed. Error: ' + (error?.message || 'Unknown error') + 
      ' | Make sure your Environment Variables are properly set in the Vercel dashboard.', 
      { status: 500 }
    )
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
