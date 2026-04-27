# OTP Email Auth — Next.js (App Router) + Supabase + Resend

## Context
- **Project:** CRM for DIDPL, built by CtrlAltBuild Technologies
- **Stack:** Next.js (App Router), Supabase (`@supabase/ssr`), Resend for email
- **Goal:** Replace current email+password auth with email OTP auth
- **Why custom:** Supabase free plan limits SMTP to 3 emails/hour — unusable for production
- **Temporary solution until:** SMS OTP certification is cleared (Twilio/Vonage)

---

## Environment Variables Needed

Add these to `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx         # From Resend dashboard → API Keys
RESEND_FROM_EMAIL=noreply@ctrlaltbuild.in      # Verified sender domain in Resend
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # From Supabase → Settings → API (keep secret, server only)
```

---

## Supabase Setup

### 1. Create OTP table

Run this in Supabase SQL Editor:

```sql
CREATE TABLE otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-delete expired OTPs (keep table clean)
CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
```

### 2. Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (API routes use service role key)
-- No policies needed for anon/authenticated roles
```

### 3. Disable Supabase built-in email auth (optional but recommended)

Go to **Supabase Dashboard → Authentication → Providers → Email** and:
- Turn OFF "Enable Email Signup" if you want to fully control the flow
- OR leave it on if you still want Supabase to manage user creation (recommended — see flow below)

---

## Auth Flow Overview

```
1. User enters email on login page
2. POST /api/auth/send-otp
   - Generate 6-digit OTP
   - Store in otp_codes table (expires in 10 mins)
   - Send email via Resend
   - Return success
3. User enters OTP on verify page
4. POST /api/auth/verify-otp
   - Check OTP exists, not expired, not used
   - Mark OTP as used
   - Sign in user via Supabase Auth (supabase.auth.signInWithOtp or admin.createSession)
   - Return session
5. User is authenticated — redirect to CRM dashboard
```

---

## Install Dependencies

```bash
npm install resend
```

---

## File Structure to Create

```
app/
  login/
    page.tsx                  # Email input form
  verify/
    page.tsx                  # OTP input form
  api/
    auth/
      send-otp/
        route.ts              # API: generate + send OTP
      verify-otp/
        route.ts              # API: verify OTP + create session
lib/
  supabase/
    client.ts                 # Browser client (already exists likely)
    server.ts                 # Server client (already exists likely)
    admin.ts                  # NEW: Service role admin client
```

---

## Code

### `lib/supabase/admin.ts`

Server-only admin client using service role key. Never import this in client components.

```typescript
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

---

### `app/api/auth/send-otp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Invalidate any existing unused OTPs for this email
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true })
      .eq('email', normalizedEmail)
      .eq('used', false)

    // Generate new OTP
    const code = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store in DB
    const { error: dbError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code,
        expires_at: expiresAt.toISOString(),
        used: false
      })

    if (dbError) {
      console.error('DB error:', dbError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: normalizedEmail,
      subject: 'Your login code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">Your login code</h2>
          <p style="color: #555;">Use the code below to sign in. It expires in 10 minutes.</p>
          <div style="background: #f4f4f4; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #111;">${code}</span>
          </div>
          <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP sent successfully' })

  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

### `app/api/auth/verify-otp/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('email', normalizedEmail)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 401 })
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpRecord.id)

    // Check if user exists in Supabase Auth, create if not
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(normalizedEmail)

    let userId: string

    if (existingUser?.user) {
      userId = existingUser.user.id
    } else {
      // Create user in Supabase Auth
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true
      })

      if (createError || !newUser.user) {
        console.error('Create user error:', createError)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      userId = newUser.user.id
    }

    // Create a session link for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (sessionError || !sessionData) {
      console.error('Session error:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // Extract tokens from the generated link
    const url = new URL(sessionData.properties.action_link)
    const token_hash = url.searchParams.get('token_hash') || ''
    const type = url.searchParams.get('type') || 'magiclink'

    return NextResponse.json({
      success: true,
      token_hash,
      type,
      email: normalizedEmail
    })

  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

### `app/login/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send OTP')
        return
      }

      // Store email in sessionStorage for verify page
      sessionStorage.setItem('otp_email', email)
      router.push('/verify')

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending...' : 'Send Code'}
        </button>
      </form>
    </div>
  )
}
```

---

### `app/verify/page.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('otp_email')
    if (!storedEmail) {
      router.push('/login')
      return
    }
    setEmail(storedEmail)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid code')
        return
      }

      // Verify the token with Supabase client to establish session
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink'
      })

      if (verifyError) {
        setError('Failed to establish session. Please try again.')
        return
      }

      sessionStorage.removeItem('otp_email')
      router.push('/dashboard') // Change to your CRM dashboard route

    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setCode('')
    await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
  }

  return (
    <div>
      <h1>Enter Code</h1>
      <p>We sent a 6-digit code to {email}</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          maxLength={6}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading || code.length !== 6}>
          {loading ? 'Verifying...' : 'Verify Code'}
        </button>
      </form>
      <button onClick={handleResend}>Resend code</button>
      <button onClick={() => router.push('/login')}>Use different email</button>
    </div>
  )
}
```

---

## Middleware (protect routes)

Make sure your existing `middleware.ts` protects the dashboard routes. If you don't have one yet:

```typescript
// middleware.ts (root of project)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/verify')

  if (!user && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)']
}
```

---

## Cleanup Job (Optional but Recommended)

Add a Supabase cron job or a simple API route to clean up expired OTPs periodically:

```sql
-- Run this in Supabase SQL Editor to delete OTPs older than 1 hour
DELETE FROM otp_codes WHERE expires_at < NOW() - INTERVAL '1 hour';
```

Or schedule via Supabase's pg_cron extension (available on Pro) or just run it in a weekly cron API route.

---

## Testing Checklist

- [ ] `.env.local` has all 5 variables set
- [ ] `otp_codes` table created in Supabase
- [ ] Resend domain `ctrlaltbuild.in` verified (✅ already done)
- [ ] Resend API key created and added to env
- [ ] `/login` → enter email → OTP email arrives in inbox
- [ ] `/verify` → enter code → redirects to dashboard
- [ ] Invalid/expired code shows error message
- [ ] Resend button works
- [ ] Unauthenticated users redirected to `/login`
- [ ] Check Resend Dashboard → Logs for delivery status

---

## When SMS is Ready (Future Swap)

When Twilio/Vonage SMS certification clears:
1. Add Twilio credentials to Supabase Auth → SMS Provider
2. Change `send-otp` API route to send SMS instead of email (or use Supabase's built-in SMS OTP)
3. Remove Resend dependency
4. The `otp_codes` table and verify flow stays the same

---

## Notes for Antigravity

- Apply your existing UI component library/design system to the login and verify pages — the forms above are bare HTML, just wire them up to your existing components
- The `router.push('/dashboard')` in verify page should be changed to whatever your actual CRM home route is
- If users already exist in Supabase Auth from the old password system, they will be matched by email automatically — no data loss
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) must NEVER be exposed to the client — only used in `app/api/` routes
