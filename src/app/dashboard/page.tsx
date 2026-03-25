import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeKpis, computeFlags, fmtDate } from '@/lib/kpi'
import { KpiCard, Card, CardTitle, PageHeader, Badge } from '@/components/ui'
import { TimeLog, KpiRules, Profile } from '@/lib/types'

export const revalidate = 0

export default async function OverviewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  if (!me) {
    redirect('/login')
  }

  const profile = me as Profile
  const isElevated = ['Manager','Executive','Admin'].includes(profile.role)

  const [logsRes, rulesRes, pendingRes] = await Promise.all([
    isElevated
      ? supabase.from('time_logs').select('*, profiles(name,role,team)').order('date', { ascending:false }).limit(500)
      : supabase.from('time_logs').select('*').eq('user_id', user.id).order('date', { ascending:false }).limit(200),
    supabase.from('kpi_rules').select('*').limit(1).single(),
    supabase.from('decisions').select('*').neq('status','Done').order('due_date'),
  ])

  const logs: TimeLog[] = logsRes.data || []
  const rules: KpiRules = rulesRes.data || { id:'', daily_hours_threshold:8, billable_target:70, category_targets:{}, updated_at:'' }

  const kpis = computeKpis(logs)
  const myLogs = isElevated ? logs.filter(l => l.user_id === user.id) : logs
  const myKpis = computeKpis(myLogs)
  const flags = computeFlags(isElevated ? kpis : myKpis, rules)

  const today = new Date().toISOString().slice(0,10)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay()+6)%7))
  const weekLogs = logs.filter(l => l.date >= weekStart.toISOString().slice(0,10))
  const weekKpis = computeKpis(weekLogs)
  const recentLogs = (isElevated ? logs : myLogs).slice(0,5)
  const overdueActions = (pendingRes.data||[]).filter((d:any) => d.due_date && d.due_date < today)
  const upcomingActions = (pendingRes.data||[]).filter((d:any) => d.due_date && d.due_date >= today).slice(0,3)

  return (
    <div>
      <PageHeader
        title={isElevated ? 'Company Overview' : 'My Overview'}
        subtitle={isElevated ? 'Real-time summary across your organisation.' : 'Your personal work summary at a glance.'} />

      {isElevated ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
          <KpiCard label="All-Time Hours" value={kpis.totalHours} sub={kpis.activeDays+' active days'} color="#6366f1" />
          <KpiCard label="This Week" value={weekKpis.totalHours+'h'} sub={weekKpis.activeDays+' days logged'} color="#0ea5e9" />
          <KpiCard label="Billable %" value={kpis.billablePct+'%'} color="#059669"
            flag={kpis.billablePct < rules.billable_target ? { text:'Below target', level:'amber' } : { text:'On target', level:'green' }} />
          <KpiCard label="My Hours (Week)" value={computeKpis(myLogs.filter(l=>l.date>=weekStart.toISOString().slice(0,10))).totalHours+'h'} color="#d97706" />
          <KpiCard label="Overdue Actions" value={overdueActions.length} color={overdueActions.length>0?'#dc2626':'#059669'}
            flag={overdueActions.length>0?{text:'Needs attention',level:'red'}:{text:'All clear',level:'green'}} />
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
          <KpiCard label="My Total Hours" value={myKpis.totalHours} sub={myKpis.activeDays+' active days'} color="#6366f1" />
          <KpiCard label="This Week" value={computeKpis(myLogs.filter(l=>l.date>=weekStart.toISOString().slice(0,10))).totalHours+'h'} color="#0ea5e9" />
          <KpiCard label="Billable %" value={myKpis.billablePct+'%'} color="#059669"
            flag={myKpis.billablePct < rules.billable_target ? { text:'Below '+rules.billable_target+'%', level:'amber' } : { text:'On target', level:'green' }} />
          <KpiCard label="Avg/Day" value={myKpis.avgPerDay+'h'} color="#7c3aed" />
          <KpiCard label="Top Category" value={myKpis.topCategory?myKpis.topCategory[0]:'None'} color="#d97706" />
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>Recent Activity</CardTitle>
          {recentLogs.length === 0 ? <p style={{ color:'#a0a8c0', fontSize:13 }}>No time logged yet.</p> :
            recentLogs.map((l:any) => (
              <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #f0f2f8' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{l.project}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>
                    {fmtDate(l.date)}{isElevated && l.profiles ? ' ? '+l.profiles.name : ''} ? {l.task?.slice(0,40)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <Badge text={l.category} type="gray" />
                  <span style={{ fontSize:13, fontWeight:700, fontFamily:'DM Mono,monospace', color:'#6366f1' }}>{l.hours}h</span>
                </div>
              </div>
            ))
          }
        </Card>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card>
            <CardTitle>Flags & Alerts</CardTitle>
            {overdueActions.length > 0 && (
              <div style={{ marginBottom:12, padding:'10px 12px', background:'#fee2e2', borderRadius:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#dc2626', marginBottom:4 }}>
                  {overdueActions.length} Overdue Action{overdueActions.length>1?'s':''}
                </div>
                {overdueActions.slice(0,2).map((a:any) => (
                  <div key={a.id} style={{ fontSize:12, color:'#991b1b' }}>{a.title} ? due {fmtDate(a.due_date)}</div>
                ))}
              </div>
            )}
            {flags.length === 0 && overdueActions.length === 0
              ? <p style={{ color:'#a0a8c0', fontSize:13 }}>All metrics within normal range.</p>
              : flags.map((f,i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f0f2f8' }}>
                  <Badge text={f.level} type={f.level==='High'?'red':f.level==='Med'?'amber':'green'} />
                  <span style={{ fontSize:13 }}>{f.msg}</span>
                </div>
              ))
            }
          </Card>

          <Card>
            <CardTitle>Upcoming Actions</CardTitle>
            {upcomingActions.length === 0
              ? <p style={{ color:'#a0a8c0', fontSize:13 }}>No upcoming actions.</p>
              : upcomingActions.map((a:any) => (
                <div key={a.id} style={{ padding:'8px 0', borderBottom:'1px solid #f0f2f8' }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{a.title}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>Due: {fmtDate(a.due_date)}</div>
                </div>
              ))
            }
          </Card>
        </div>
      </div>
    </div>
  )
}
