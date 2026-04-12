import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const REVIEW_POINTS = 20

export async function POST(_req: NextRequest) {
  try {
    const supabase = await createClient()

    // ── 1. Require auth ───────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ── 2. Check if user already claimed review reward ────────────────────────
    const { count: existingClaim } = await supabase
      .from('user_rewards_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('type', 'review')

    if ((existingClaim ?? 0) > 0) {
      return NextResponse.json({ error: 'You have already claimed the review reward', already_claimed: true }, { status: 409 })
    }

    // ── 3. Verify user has at least one paid order ────────────────────────────
    const { count: orderCount } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('payment_status', 'paid')

    if ((orderCount ?? 0) === 0) {
      return NextResponse.json({ error: 'You must have a completed order to claim this reward' }, { status: 400 })
    }

    // ── 4. Credit points atomically ───────────────────────────────────────────
    // Increment reward_points on users row
    const { error: updateErr } = await supabase.rpc('increment_reward_points', {
      p_user_id: user.id,
      p_points:  REVIEW_POINTS,
    })

    if (updateErr) {
      // Fallback: manual update if RPC not available
      const { data: currentUser } = await supabase
        .from('users')
        .select('reward_points')
        .eq('id', user.id)
        .single()

      const newPoints = ((currentUser?.reward_points as number) ?? 0) + REVIEW_POINTS

      const { error: manualErr } = await supabase
        .from('users')
        .update({ reward_points: newPoints })
        .eq('id', user.id)

      if (manualErr) {
        console.error('reward_points update error:', manualErr)
        return NextResponse.json({ error: 'Failed to credit points' }, { status: 500 })
      }
    }

    // ── 5. Log the reward ─────────────────────────────────────────────────────
    await supabase.from('user_rewards_log').insert({
      user_id:       user.id,
      type:          'review',
      points_change: REVIEW_POINTS,
      description:   'Google review reward',
    })

    return NextResponse.json({ success: true, points_awarded: REVIEW_POINTS })
  } catch (err) {
    console.error('claim-review error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
