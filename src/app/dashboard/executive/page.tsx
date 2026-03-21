import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { computeKpis, computeFlags } from '@/lib/kpi'
import { KpiCard, Card, CardTitle, PageHeader, Badge } from '@/components/ui'
import { TimeLog, KpiRules, Profile } from '@/lib/types'

export const revalidate = 60

export default async function ExecutivePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = await supabase.from('profiles').select('*').eq('id', user!.id).single() as { data: Profile }
  if (!['Manager','Executive','Admin'].includes(me?.role)) redirect('/dashboard')

  const [logsRes, rulesRes, profilesRes, leaveRes, projectsRes] = await Promise.all([
    supabase.from('time_logs').select('*, profiles(name,role,team)').limit(1000),
    supabase.from('kpi_rules').select('*').limit(1).single(),
    supabase.from('profiles').select('*'),
    supabase.from('leave_requests').select('*, profiles(name)').eq('status','Pending'),
    supabase.from('projects').select('*,clients(name)'),
  ])

  const logs: TimeLog[] = logsRes.data || []
  const rules: KpiRules = rulesRes.data || { id:'', daily_hours_threshold:8, billable_target:70, category_targets:{}, updated_at:'' }
  const profiles: Profile[] = profilesRes.data || []
  const pendingLeave = leaveRes.data || []
  const projects = projectsRes.data || []

  const kpis = computeKpis(logs)
  const flags = computeFlags(kpis, rules)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay()+6)%7))
  const weekLogs = logs.filter(l => l.date >= weekStart.toISOString().slice(0,10))
  const weekKpis = computeKpis(weekLogs)

  const teamRows = profiles.map(p => ({
    profile: p,
    kpis: computeKpis(logs.filter(l => l.user_id === p.id)),
  })).sort((a,b) => b.kpis.totalHours - a.kpis.totalHours)

  const roleBreakdown = ['Employee','Project Lead','Manager','Executive','Admin'].map(r => ({
    role:r, count: profiles.filter(p=>p.role===r).length
  })).filter(r=>r.count>0)

  return (
    <div>
      <PageHeader title="Executive Dashboard" subtitle="Company-wide performance summary." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
        <KpiCard label="Total Staff" value={profiles.length} />
        <KpiCard label="All-Time Hours" value={kpis.totalHours} sub={kpis.activeDays+' active days'} />
        <KpiCard label="This Week Hours" value={weekKpis.totalHours+'h'} sub={weekKpis.activeDays+' days'} />
        <KpiCard label="Billable %" value={kpis.billablePct+'%'}
          flag={kpis.billablePct<rules.billable_target?{text:'Below target',level:'amber'}:{text:'On target',level:'green'}} />
        <KpiCard label="Active Projects" value={projects.filter((p:any)=>p.status==='Active').length} />
        <KpiCard label="Pending Leave" value={pendingLeave.length}
          flag={pendingLeave.length>0?{text:'Needs review',level:'amber'}:{text:'All clear',level:'green'}} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>Team Performance</CardTitle>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Name','Role','Hours','Billable%','Avg/Day'].map(h=>(
              <th key={h} style={{ textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#9ca3af', padding:'8px 12px', borderBottom:'1px solid #f3f4f6' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {teamRows.map(({profile:p,kpis:k})=>(
                <tr key={p.id}>
                  <td style={{ padding:'9px 12px', fontSize:13, fontWeight:500, borderBottom:'1px solid #f9fafb' }}>{p.name}</td>
                  <td style={{ padding:'9px 12px', fontSize:12, borderBottom:'1px solid #f9fafb' }}><Badge text={p.role} type="gray" /></td>
                  <td style={{ padding:'9px 12px', fontSize:13, fontFamily:'DM Mono,monospace', borderBottom:'1px solid #f9fafb', fontWeight:600 }}>{k.totalHours}h</td>
                  <td style={{ padding:'9px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', color:k.billablePct>=rules.billable_target?'#059669':'#d97706', fontWeight:600 }}>{k.billablePct}%</td>
                  <td style={{ padding:'9px 12px', fontSize:13, borderBottom:'1px solid #f9fafb', color:'#6b7280' }}>{k.avgPerDay}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <Card>
            <CardTitle>Active Projects</CardTitle>
            {projects.filter((p:any)=>p.status==='Active').slice(0,6).map((p:any)=>(
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f9fafb' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{p.name}</div>
                  <div style={{ fontSize:11, color:'#9ca3af' }}>{p.clients?.name||'No client'}</div>
                </div>
                {p.budget>0 && <span style={{ fontSize:12, fontFamily:'DM Mono,monospace', color:'#6b7280' }}>R {Number(p.budget).toLocaleString()}</span>}
              </div>
            ))}
            {projects.filter((p:any)=>p.status==='Active').length===0 && <p style={{ color:'#9ca3af', fontSize:13 }}>No active projects.</p>}
          </Card>

          <Card>
            <CardTitle>Flags & Alerts</CardTitle>
            {flags.length===0 ? <p style={{ color:'#9ca3af', fontSize:13 }}>All metrics within thresholds.</p>
              : flags.map((f,i)=>(
              <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'8px 0', borderBottom:i<flags.length-1?'1px solid #f9fafb':'none' }}>
                <Badge text={f.level} type={f.level==='High'?'red':f.level==='Med'?'amber':'green'} />
                <span style={{ fontSize:13, color:'#374151' }}>{f.msg}</span>
              </div>
            ))}
          </Card>

          <Card>
            <CardTitle>Pending Leave</CardTitle>
            {pendingLeave.length===0 ? <p style={{ color:'#9ca3af', fontSize:13 }}>No pending requests.</p>
              : pendingLeave.map((l:any)=>(
              <div key={l.id} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f9fafb', fontSize:13 }}>
                <span style={{ fontWeight:500 }}>{(l.profiles as any)?.name}</span>
                <span style={{ color:'#6b7280' }}>{l.leave_type} ? {l.days}d</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Card>
        <CardTitle>Workforce Composition</CardTitle>
        <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
          {roleBreakdown.map(({role,count})=>(
            <div key={role} style={{ textAlign:'center', padding:'16px 24px', background:'#f9fafb', borderRadius:10, minWidth:100 }}>
              <div style={{ fontSize:28, fontWeight:700, fontFamily:'DM Mono,monospace', color:'#6366f1' }}>{count}</div>
              <div style={{ fontSize:12, color:'#6b7280', marginTop:4, fontWeight:500 }}>{role}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
