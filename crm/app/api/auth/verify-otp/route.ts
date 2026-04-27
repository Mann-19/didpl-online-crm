import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/utils/supabase/admin'

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

    // Ensure user exists in Supabase Auth
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
        return NextResponse.json({ error: 'Auth error' }, { status: 500 })
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!existingUser) {
        return NextResponse.json({ error: 'User not authorized' }, { status: 403 })
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
    const token_hash = url.searchParams.get('token_hash') || url.searchParams.get('token') || ''
    const type = (url.searchParams.get('type') as any) || 'magiclink'

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
