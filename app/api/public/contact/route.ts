import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Create a Supabase client with the service_role key to bypass RLS for this backend operation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_name, user_email, message } = body

    if (!user_name || !user_email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Log to Database using Service Role to bypass RLS
    const { error: dbError } = await supabaseAdmin
      .from('contact_messages')
      .insert({
        user_name,
        user_email,
        message
      })

    if (dbError) throw dbError

    // 2. Send Email via Resend
    // Note: If domain is not verified, use onboarding@resend.dev
    const { error: emailError } = await resend.emails.send({
      from: 'Fuelist <notifications@fuelist.in>',
      to: ['support@fuelist.in'],
      replyTo: user_email,
      subject: `New Contact Inquiry from ${user_name}`,
      html: `
        <h2>New Inquiry Received</h2>
        <p><strong>Name:</strong> ${user_name}</p>
        <p><strong>Email:</strong> ${user_email}</p>
        <p><strong>Message:</strong></p>
        <div style="padding: 12px; border-left: 4px solid #22c55e; background: #f0fdf4;">
          ${message.replace(/\n/g, '<br/>')}
        </div>
      `
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
