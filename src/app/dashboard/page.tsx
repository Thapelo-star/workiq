import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { computeKpis, fmtDate } from '@/lib/kpi'
import { KpiCard, Card, CardTitle, PageHeader, Badge, Table, Td, Btn } from '@/components/ui'
import { TimeLog, Profile } from '@/lib/types'

export default async function OverviewPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single() as { data: Profile }

  let logsQuery = supabase
    .from('time_logs')
    .select('*, profiles(name,role,team)')
    .order('date', { ascending:false })
    .limit(200)

  if (profile.role === 'Employee') {
    logsQuery = logsQuery.eq('user_id', user!.id)
  }

  const { data: logsRaw } = await logsQuery
  const logs: TimeLog[] = logsRaw || []
  const kpis = computeKpis(logs)

  const { data: learningsRaw } = await supabase
    .from('learnings')
    .select('id,title,category,outcome_status,created_at')
    .order('created_at', { ascending:false })
    .limit(5)

  const recentLogs = logs.slice(0, 6)
  const recentLearnings = learningsRaw || []
  const uniqueProjects = new Set(logs.map(l => l.project).filter(Boolean)).size
  const uniqueCategories = new Set(logs.map(l => l.category).filter(Boolean)).size

  return (
    <div>
      <PageHeader
        title="Overview"
        subtitle={`Current scope for ${profile.team}: Time Capture, Trends, and Learning Register.`}
        action={<Link href="/dashboard/time"><Btn primary>Log Time</Btn></Link>}
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:16, marginBottom:24 }}>
        <KpiCard label="Total Hours" value={kpis.totalHours} sub={`${kpis.activeDays} active days`} color="#6366f1" />
        <KpiCard label="Avg Hours / Day" value={kpis.avgPerDay} sub="Based on current data" color="#0ea5e9" />
        <KpiCard label="Top Project" value={kpis.topProject?.[0] || '-'} sub={kpis.topProject ? `${kpis.topProject[1].toFixed(1)}h logged` : 'No project data yet'} color="#10b981" />
        <KpiCard label="Top Category" value={kpis.topCategory?.[0] || '-'} sub={`${uniqueCategories} categories in use`} color="#f59e0b" />
        <KpiCard label="Projects Tracked" value={uniqueProjects} sub="Across current view" color="#8b5cf6" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>Recent Time Logs</CardTitle>
          <Table heads={['Date','Person','Project','Category','Hours']} empty={recentLogs.length===0}>
            {recentLogs.map(log => (
              <tr key={log.id}>
                <Td>{fmtDate(log.date)}</Td>
                <Td>{(log.profiles as any)?.name || '-'}</Td>
                <Td>{log.project}</Td>
                <Td><Badge text={log.category} /></Td>
                <Td style={{ fontWeight:600 }}>{log.hours}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardTitle>Current Focus</CardTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ padding:'12px 14px', background:'#eef2ff', borderRadius:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#4f46e5', marginBottom:4 }}>1. Time Capture</div>
              <div style={{ fontSize:13, color:'#4b5563', lineHeight:1.5 }}>Log work consistently by project and category so the department builds a clean activity base.</div>
            </div>
            <div style={{ padding:'12px 14px', background:'#ecfeff', borderRadius:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#0891b2', marginBottom:4 }}>2. Trends (multi-level)</div>
              <div style={{ fontSize:13, color:'#4b5563', lineHeight:1.5 }}>Use personal, team, and company views to test whether the trend logic surfaces useful patterns.</div>
            </div>
            <div style={{ padding:'12px 14px', background:'#f5f3ff', borderRadius:10 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed', marginBottom:4 }}>3. Learning Register</div>
              <div style={{ fontSize:13, color:'#4b5563', lineHeight:1.5 }}>Capture lessons as the team progresses so rollout decisions are based on real use, not guesswork.</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card>
          <CardTitle>Recent Learnings</CardTitle>
          {recentLearnings.length === 0 ? (
            <div style={{ color:'#6b7280', fontSize:13, lineHeight:1.6 }}>
              No learnings captured yet. Once the team starts using the system consistently, use the Learning Register to record what works and what needs adjustment.
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {recentLearnings.map((item: any) => (
                <div key={item.id} style={{ padding:'12px 14px', border:'1px solid #e8eaf2', borderRadius:10, background:'#fff' }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>{item.title}</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <Badge text={item.category || 'General'} />
                    {item.outcome_status && <Badge text={item.outcome_status} type={item.outcome_status === 'Improved' ? 'green' : item.outcome_status === 'Worsened' ? 'red' : 'amber'} />}
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{fmtDate((item.created_at || '').slice(0,10))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>What to Monitor</CardTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:12, color:'#4b5563', fontSize:13, lineHeight:1.6 }}>
            <div>- Test whether staff can log time quickly and consistently without confusion.</div>
            <div>- Check whether multi-level trend views help your department spot useful patterns.</div>
            <div>- Observe whether categories and projects make sense in daily use.</div>
            <div>- Note what should change before rolling the system out to other departments.</div>
          </div>
          <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
            <Link href="/dashboard/time"><Btn primary>Go to Time Capture</Btn></Link>
            <Link href="/dashboard/trends"><Btn>Open Trends</Btn></Link>
            <Link href="/dashboard/learning"><Btn>View Learning Register</Btn></Link>
          </div>
        </Card>
      </div>
    </div>
  )
}