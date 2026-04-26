import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes

export async function middleware(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    // Public routes
    if (path === '/login' || path.startsWith('/_next') || path.includes('.')) {
      if (user && path === '/login') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
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

    // 10-Minute Inactivity Check
    const lastActiveStr = request.cookies.get('last_active')?.value
    const now = Date.now()

    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10)
      if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
        await supabase.auth.signOut()
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url))
        response.cookies.delete('last_active')
        return response
      }
    }

    // Update last_active cookie
    supabaseResponse.cookies.set('last_active', now.toString(), { path: '/' })

    // Role-based route protection
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const role = profile?.role

    if (role === 'client') {
      if (!path.startsWith('/my-portal') && !path.startsWith('/my-deal')) {
        return NextResponse.redirect(new URL('/my-portal', request.url))
      }
    } else if (role === 'admin' || role === 'employee') {
      if (path.startsWith('/my-portal') || path.startsWith('/my-deal')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (
        role === 'employee' &&
        (path.startsWith('/settings') ||
          path.startsWith('/reports') ||
          path.startsWith('/expenses'))
      ) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      if (path === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return supabaseResponse
  } catch (error: any) {
    console.error('Middleware Error:', error)
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}