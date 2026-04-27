import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/utils/supabase/admin'

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

    // SECURITY: Only allow emails that exist in Supabase Auth (pre-approved users only)
    const { data: { users }, error: authLookupError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authLookupError) {
      console.error('Auth lookup error:', authLookupError)
      return NextResponse.json({ error: 'Internal server error', detail: authLookupError.message }, { status: 500 })
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === normalizedEmail)
    
    if (!existingUser) {
      return NextResponse.json({ error: 'This email is not authorized to access the system.' }, { status: 403 })
    }

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
      subject: 'Your DIDPL CRM login code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #111; margin: 0;">DIDPL CRM</h2>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Login Verification</p>
          </div>
          <p style="color: #374151; font-size: 15px;">Your one-time login code is:</p>
          <div style="background: #f9fafb; border: 2px dashed #d1fae5; border-radius: 10px; padding: 24px; text-align: center; margin: 20px 0;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #059669;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 13px;">This code expires in <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #9ca3af; font-size: 11px; text-align: center;">DIDPL CRM — Dholera Infra Development Pvt. Ltd.</p>
        </div>
      `
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json({ error: 'Failed to send email', detail: emailError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error?.message || error) }, { status: 500 })
  }
}
