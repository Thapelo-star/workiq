import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const body = await req.json()
    const { scope, scopeLabel, period, kpis } = body

    const existing = await supabase.from('kpi_snapshots')
      .select('id').eq('user_id', user.id).eq('period', period).eq('scope', scope).single()

    if (existing.data) {
      await supabase.from('kpi_snapshots').update({
        total_hours: kpis.totalHours,
        billable_hours: kpis.billableHours,
        billable_pct: kpis.billablePct,
        avg_per_day: kpis.avgPerDay,
        top_category: kpis.topCategory ? kpis.topCategory[0] : '',
        top_project: kpis.topProject ? kpis.topProject[0] : '',
        snapshot_date: new Date().toISOString().slice(0,10),
      }).eq('id', existing.data.id)
    } else {
      await supabase.from('kpi_snapshots').insert({
        user_id: user.id, scope, scope_label: scopeLabel, period,
        total_hours: kpis.totalHours,
        billable_hours: kpis.billableHours,
        billable_pct: kpis.billablePct,
        avg_per_day: kpis.avgPerDay,
        top_category: kpis.topCategory ? kpis.topCategory[0] : '',
        top_project: kpis.topProject ? kpis.topProject[0] : '',
        snapshot_date: new Date().toISOString().slice(0,10),
      })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
