import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json()

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // amount must be in paise (INR × 100)
    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100),
      currency: 'INR',
      receipt:  `rcpt_${Date.now()}`,
    })

    return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency })
  } catch (err) {
    console.error('create-order error:', err)
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 })
  }
}
