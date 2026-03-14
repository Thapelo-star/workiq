import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const today = new Date().toISOString().slice(0,10)

    const { data: reminders } = await supabase.from('review_reminders')
      .select('*, decisions(title, status, owner_id, related_kpi)')
      .eq('sent', false)
      .lte('remind_date', today)

    for (const r of reminders || []) {
      if (!r.decisions) continue
      const targetUser = r.decisions.owner_id || user.id
      await supabase.from('notifications').insert({
        user_id: targetUser,
        title: 'Review Due: ' + r.decisions.title,
        body: 'A scheduled review is due today for this decision. Please check progress and update the outcome.',
        type: 'warning',
        link: '/dashboard/decisions'
      })
      await supabase.from('review_reminders').update({ sent: true }).eq('id', r.id)
    }

    return NextResponse.json({ processed: (reminders||[]).length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
