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

    // 3. Derived/Mock stats for city growth (could be database-driven later)
    const activeCities = 5

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
