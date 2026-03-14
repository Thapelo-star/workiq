import { createClient } from '@/lib/supabase/server'
import { computeKpis, computeFlags, fmtDate } from '@/lib/kpi'
import { KpiCard, Card, CardTitle, PageHeader, Badge, StatusBadge } from '@/components/ui'
import { TimeLog, KpiRules, Decision, Profile } from '@/lib/types'

export default async function OverviewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single() as { data: Profile }

  const isElevated = ['Manager','Executive','Admin'].includes(profile.role)

  let logsQuery = supabase.from('time_logs').select('*, profiles(name,role,team)').order('date', { ascending:false }).limit(200)
  if (profile.role === 'Employee') logsQuery = logsQuery.eq('user_id', user!.id)

  const { data: logsRaw } = await logsQuery
  const logs: TimeLog[] = logsRaw || []

  const { data: rulesRaw } = await supabase.from('kpi_rules').select('*').limit(1).single()
  const rules: KpiRules = rulesRaw || { daily_hours_threshold:8, billable_target:70, category_targets:{} }

  const { data: decisionsRaw } = await supabase.from('decisions').select('*, profiles(name)').order('created_at', { ascending:false }).limit(10)
  const decisions: Decision[] = decisionsRaw || []

  const kpis = computeKpis(logs)
  const flags = computeFlags(kpis, rules)
  const openActions = decisions.filter(d => d.status !== 'Done').slice(0, 5)
  const recentLogs = logs.slice(0, 6)

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={`Viewing as ${profile.name} (${profile.role})`}
      />

      {/* KPI ROW */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
        <KpiCard label="Total Hours" value={kpis.totalHours} sub={`${kpis.activeDays} active days`} />
        <KpiCard
          label="Avg Hrs / Day"
          value={kpis.avgPerDay}
          flag={kpis.avgPerDay > rules.daily_hours_threshold
            ? { text:'Above threshold', level:'red' }
            : { text:'Within range', level:'green' }}
        />
        <KpiCard
          label="Billable %"
          value={`${kpis.billablePct}%`}
          sub={`${kpis.billableHours}h billable`}
          flag={kpis.billablePct < rules.billable_target
            ? { text:'Below target', level:'amber' }
            : { text:'On target', level:'green' }}
        />
        <KpiCard label="Top Category" value={kpis.topCategory?.[0] || '—'} sub={kpis.topCategory ? `${kpis.topCategory[1].toFixed(1)}h` : ''} />
        <KpiCard label="Top Project" value={kpis.topProject?.[0] || '—'} sub={kpis.topProject ? `${kpis.topProject[1].toFixed(1)}h` : ''} />
      </div>

      {/* TWO COL */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>Recent Time Logs</CardTitle>
          {recentLogs.length === 0 ? (
            <p style={{ color:'#9e9b94', fontSize:13 }}>No logs yet. Head to Time Capture to add your first entry.</p>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Date','Project','Category','Hrs'].map(h=>(
                  <th key={h} style={{ textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', padding:'6px 8px', borderBottom:'1px solid #e2e0d8' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {recentLogs.map(l => (
                  <tr key={l.id}>
                    <td style={{ padding:'8px', fontSize:13, borderBottom:'1px solid #e2e0d8' }}>{fmtDate(l.date)}</td>
                    <td style={{ padding:'8px', fontSize:13, borderBottom:'1px solid #e2e0d8' }}>{l.project}</td>
                    <td style={{ padding:'8px', fontSize:13, borderBottom:'1px solid #e2e0d8' }}><Badge text={l.category} /></td>
                    <td style={{ padding:'8px', fontSize:13, borderBottom:'1px solid #e2e0d8', fontWeight:500 }}>{l.hours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardTitle>Open Actions</CardTitle>
          {openActions.length === 0 ? (
            <p style={{ color:'#9e9b94', fontSize:13 }}>No open actions. Create one from an insight.</p>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Title','Type','Status'].map(h=>(
                  <th key={h} style={{ textAlign:'left', fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', padding:'6px 8px', borderBottom:'1px solid #e2e0d8' }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {openActions.map(d => (
                  <tr key={d.id}>
                    <td style={{ padding:'8px', fontSize:13, borderBottom:'1px solid #e2e0d8', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.title}</td>
                    <td style={{ padding:'8px', fontSize:13, borderBottom:'1px solid #e2e0d8' }}>{d.type}</td>
                    <td style={{ padding:'8px', borderBottom:'1px solid #e2e0d8' }}><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* FLAGS */}
      <Card>
        <CardTitle>Active Flags</CardTitle>
        {flags.length === 0 ? (
          <p style={{ color:'#9e9b94', fontSize:13 }}>No active flags. All metrics within configured thresholds.</p>
        ) : (
          flags.map((f, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom: i < flags.length-1 ? '1px solid #e2e0d8' : 'none' }}>
              <Badge text={f.level} type={f.level==='High'?'red':f.level==='Med'?'amber':'green'} />
              <span style={{ fontSize:13 }}>{f.msg}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}