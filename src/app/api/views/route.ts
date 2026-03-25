import { NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// GET /api/views — return total and today's view count
export async function GET() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ total: 0, today: 0 })
  }

  const { data: totalData } = await supabase
    .from('page_views')
    .select('count')
    .single()

  const today = new Date().toISOString().split('T')[0]
  const { data: todayData } = await supabase
    .from('daily_views')
    .select('count')
    .eq('date', today)
    .single()

  return NextResponse.json({
    total: totalData?.count ?? 0,
    today: todayData?.count ?? 0,
  })
}

// POST /api/views — increment view count
export async function POST() {
  if (!isSupabaseConfigured() || !supabase) {
    return NextResponse.json({ success: false })
  }

  const today = new Date().toISOString().split('T')[0]

  await supabase.rpc('increment_total_views')
  await supabase.rpc('increment_daily_views', { view_date: today })

  return NextResponse.json({ success: true })
}
