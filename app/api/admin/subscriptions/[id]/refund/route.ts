import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import Razorpay from 'razorpay'

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch subscription details
    const { data: sub, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('payment_id, refund_amount, payment_status, total_price')
      .eq('id', id)
      .single()

    if (subError || !sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    if (!sub.payment_id) return NextResponse.json({ error: 'No payment ID found for this subscription' }, { status: 400 })
    if (sub.payment_status === 'refunded') return NextResponse.json({ error: 'Already refunded' }, { status: 400 })
    
    let refundAmount = Number(sub.refund_amount)
    if (refundAmount <= 0) return NextResponse.json({ error: 'No refund amount pending' }, { status: 400 })

    // Secondary Safety: Verify with Razorpay what was actually captured
    try {
      const payment = await razorpay.payments.fetch(sub.payment_id)
      const capturedAmount = Number(payment.amount) / 100 // convert paise to INR
      
      if (refundAmount > capturedAmount) {
        console.warn(`Refund amount (${refundAmount}) exceeds captured amount (${capturedAmount}). Capping.`)
        refundAmount = capturedAmount
      }
    } catch (fetchErr) {
      console.error('Failed to fetch payment from Razorpay:', fetchErr)
      // We continue but with caution; the refund might still fail at the RZP step
    }

    // Initiate Razorpay Refund
    try {
      await razorpay.payments.refund(sub.payment_id, {
        amount: Math.round(refundAmount * 100), // paise
        notes: {
          subscription_id: id,
          reason: 'Subscription cancellation refund'
        }
      })
    } catch (rzpErr: any) {
      console.error('Razorpay Refund API error:', rzpErr)
      const msg = rzpErr.description || rzpErr.error?.description || 'Razorpay refund failed'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    // Update DB
    const { error: updateErr } = await supabaseAdmin
      .from('subscriptions')
      .update({ payment_status: 'refunded' })
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Refund API Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
