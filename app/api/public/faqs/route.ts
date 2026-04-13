import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: faqs, error } = await supabase
      .from('faqs')
      .select('question, answer')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      faqs: faqs || []
    })
  } catch (error: any) {
    console.error('FAQs API Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch FAQs' 
    }, { status: 500 })
  }
}
