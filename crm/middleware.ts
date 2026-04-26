import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let static files and public routes through
  if (pathname === '/login') {
    return NextResponse.next()
  }

  // Check for supabase auth cookie (edge-safe, no imports)
  const hasSession = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')
  )

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}