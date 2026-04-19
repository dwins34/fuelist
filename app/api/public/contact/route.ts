import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Create a Supabase client with the service_role key to bypass RLS for this backend operation
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_name, user_email, message } = body

    if (!user_name || !user_email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!EMAIL_RE.test(user_email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (typeof user_name !== 'string' || user_name.length > 200) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    if (typeof message !== 'string' || message.length > 5000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }

    // 1. Log to Database using Service Role to bypass RLS
    const { error: dbError } = await supabaseAdmin
      .from('contact_messages')
      .insert({ user_name, user_email, message })

    if (dbError) throw dbError

    // 2. Send Email via Resend — escape all user input before injecting into HTML
    const safeName    = escapeHtml(user_name)
    const safeEmail   = escapeHtml(user_email)
    const safeMessage = escapeHtml(message).replace(/\n/g, '<br/>')

    const { error: emailError } = await resend.emails.send({
      from: 'Fuelist <notifications@fuelist.in>',
      to: ['support@fuelist.in'],
      replyTo: safeEmail,
      subject: `New Contact Inquiry from ${safeName}`,
      html: `
        <h2>New Inquiry Received</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>Message:</strong></p>
        <div style="padding: 12px; border-left: 4px solid #22c55e; background: #f0fdf4;">
          ${safeMessage}
        </div>
      `,
    })

    if (emailError) {
      console.error('Resend Email Error:', emailError)
      // We don't throw here so the user gets a success response since the DB log worked
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Contact API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to log your message but our email system is still backup.'
    }, { status: 500 })
  }
}
