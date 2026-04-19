import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    // 1. Fetch total delivered orders
    const { count: totalOrders, error: orderError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', 'paid')

    if (orderError) throw orderError

    // 2. Fetch total users
    const { count: totalUsers, error: userError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })

    if (userError) throw userError

    // 3. Dynamic active cities count based on delivery addresses
    const { data: orders, error: cityError } = await supabase
      .from('orders')
      .select('address')
      .eq('payment_status', 'paid')

    if (cityError) throw cityError

    // Extract unique, trimmed, lowercase city names from order addresses
    const uniqueCities = new Set(
      (orders ?? [])
        .map(o => (o.address as any)?.city)
        .filter(c => typeof c === 'string' && c.trim().length > 0)
        .map(c => c.trim().toLowerCase())
    )

    // Ensure we show at least 1 if there are orders, or fallback to a sensible minimum for display
    const activeCities = Math.max(uniqueCities.size, 1)

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: totalOrders || 0,
        totalUsers: totalUsers || 0,
        activeCities
      }
    })
  } catch (error: any) {
    console.error('Stats API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch live stats' 
    }, { status: 500 })
  }
}
