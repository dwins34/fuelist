import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const SLOT_START_HOUR: Record<string, number> = {
  morning:   8,
  afternoon: 12,
  evening:   18,
}

const CUTOFF_HOURS = 4

function isDeliveryDay(date: Date, frequency: string): boolean {
  const day = date.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  if (frequency === 'daily') return true
  if (frequency === 'weekdays') return day >= 1 && day <= 5
  if (frequency === 'weekends') return day === 0 || day === 6
  return false
}

function countFutureDeliveries(startDate: Date, endDate: Date, frequency: string): number {
  let count = 0
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  
  const final = new Date(endDate)
  final.setHours(0, 0, 0, 0)

  while (current < final) {                    // exclusive upper bound — matches POST API
    if (isDeliveryDay(current, frequency)) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  return count
}

// ── PATCH — cancel a subscription with refund logic ───────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await req.json() as { status: 'active' | 'cancelled' }

  // Only 'cancelled' is allowed now (pause removed)
  if (status !== 'cancelled') {
    return NextResponse.json({ error: 'Invalid status update. Only cancellation is allowed.' }, { status: 400 })
  }

  // 1. Fetch full subscription details
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  if (sub.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (sub.status === 'cancelled') {
    return NextResponse.json({ error: 'Subscription is already cancelled' }, { status: 400 })
  }

  // 2. Calculate Refund
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(sub.end_date)
  endDate.setHours(0, 0, 0, 0)

  // a. Check if today is refundable
  let todayIsRefundable = false
  if (isDeliveryDay(today, sub.frequency) && today <= endDate) {
    const slotStartHour = SLOT_START_HOUR[sub.delivery_slot] || 8
    const cutoffTime = new Date(today)
    cutoffTime.setHours(slotStartHour - CUTOFF_HOURS, 0, 0, 0)
    
    if (now < cutoffTime) {
      todayIsRefundable = true
    }
  }

  // b. Count future deliveries (from tomorrow)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  let futureDeliveriesCount = 0
  if (tomorrow <= endDate) {
    futureDeliveriesCount = countFutureDeliveries(tomorrow, endDate, sub.frequency)
  }

  const totalRefundableDeliveries = (todayIsRefundable ? 1 : 0) + futureDeliveriesCount

  // c. Calculate Refund Amount
  // We calculate the actual total deliveries scheduled at sign-up
  const startDate = new Date(sub.start_date)
  startDate.setHours(0, 0, 0, 0)
  const actualTotalDeliveries = countFutureDeliveries(startDate, endDate, sub.frequency)
  
  // Use sub.total_price as the base for the refund
  const basePrice = Number(sub.total_price)
  const effectivePricePerDelivery = actualTotalDeliveries > 0 ? basePrice / actualTotalDeliveries : 0
  
  let refundAmount = totalRefundableDeliveries * effectivePricePerDelivery

  // SAFETY CAP: Refund cannot exceed total price paid
  refundAmount = Math.min(refundAmount, basePrice)
  // Razorpay usually requires a slight margin or exactly the amount. 
  // Let's ensure we don't have floating point overshoot by using toFixed(2)
  refundAmount = parseFloat(refundAmount.toFixed(2))

  // 3. Update Database
  const { data: updated, error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'cancelled',
      refund_amount: Math.max(0, refundAmount)
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ 
    subscription: updated,
    refund_details: {
      refundable_deliveries: totalRefundableDeliveries,
      today_included: todayIsRefundable,
      future_days: futureDeliveriesCount,
      refund_amount: refundAmount
    }
  })
}
