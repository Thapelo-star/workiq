'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, TimeLog, KpiRules, Goal, LeaveBalance } from '@/lib/types'
import { computeKpis } from '@/lib/kpi'
import { Card, CardTitle, PageHeader, KpiCard, Badge } from '@/components/ui'

export default function MyDashboardPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [kpis, setKpis] = useState<any>(null)
  const [weekKpis, setWeekKpis] = useState<any>(null)
  const [goal, setGoal] = useState<Goal|null>(null)
  const [balance, setBalance] = useState<LeaveBalance|null>(null)
  const [recentLogs, setRecentLogs] = useState<TimeLog[]>([])

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const { data: logs } = await supabase.from('time_logs').select('*').eq('user_id', user.id).order('date', { ascending:false }).limit(200)
    const allLogs: TimeLog[] = logs || []
    setKpis(computeKpis(allLogs))
    setRecentLogs(allLogs.slice(0,5))
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekLogs = allLogs.filter(l => l.date >= weekStart.toISOString().slice(0,10))
    setWeekKpis(computeKpis(weekLogs))
    const month = new Date().toISOString().slice(0,7)
    const { data: g } = await supabase.from('goals').select('*').eq('user_id', user.id).eq('month', month).single()
    setGoal(g)
    const { data: b } = await supabase.from('leave_balances').select('*').eq('user_id', user.id).single()
    setBalance(b)
  }, [])

  useEffect(() => { load() }, [])

  if (!me || !kpis) return <div style={{ padding:32, color:'#9ca3af' }}>Loading...</div>

  const month = new Date().toLocaleString('default', { month:'long', year:'numeric' })
  const targetH = goal?.target_hours || 160
  const targetB = goal?.target_billable_pct || 70
  const monthLogs = (recentLogs as TimeLog[])
  const hoursPct = Math.min(100, Math.round((kpis.totalHours/targetH)*100))
  const allowance = me.leave_allowance || balance?.annual_allowance || 21
  const usedLeave = balance?.annual_used || 0

  return (
    <div>
      <PageHeader title={'Hi, ' + me.name.split(' ')[0] + ' 👋'} subtitle={'Your personal dashboard — ' + month} />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:16, marginBottom:24 }}>
        <KpiCard label="My Total Hours" value={kpis.totalHours} sub={'Across '+kpis.activeDays+' days'} color="#6366f1" />
        <KpiCard label="This Week" value={weekKpis?.totalHours||0} sub={weekKpis?.activeDays+' days logged'} color="#0ea5e9" />
        <KpiCard label="Billable %" value={kpis.billablePct+'%'} flag={kpis.billablePct<targetB?{text:'Below target',level:'amber'}:{text:'On target',level:'green'}} color="#059669" />
        <KpiCard label="Leave Remaining" value={(allowance-usedLeave)+'d'} sub={usedLeave+'d used of '+allowance+'d'} color="#d97706" />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>Monthly Goal Progress</CardTitle>
          {goal ? (
            <>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ color:'#6b7280' }}>Hours Target</span>
                  <span style={{ fontWeight:600, fontFamily:'DM Mono,monospace' }}>{kpis.totalHours} / {targetH}h</span>
                </div>
                <div style={{ height:10, background:'#f3f4f6', borderRadius:5, overflow:'hidden' }}>
                  <div style={{ width:hoursPct+'%', height:'100%', background:'linear-gradient(90deg,#6366f1,#0ea5e9)', borderRadius:5 }} />
                </div>
                <div style={{ fontSize:12, color:'#9ca3af', marginTop:4 }}>{hoursPct}% of monthly target</div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ color:'#6b7280' }}>Billable Target</span>
                  <span style={{ fontWeight:600, fontFamily:'DM Mono,monospace' }}>{kpis.billablePct}% / {targetB}%</span>
                </div>
                <div style={{ height:10, background:'#f3f4f6', borderRadius:5, overflow:'hidden' }}>
                  <div style={{ width:Math.min(100,kpis.billablePct)+'%', height:'100%', background: kpis.billablePct>=targetB?'#059669':'#d97706', borderRadius:5 }} />
                </div>
              </div>
            </>
          ) : <p style={{ color:'#9ca3af', fontSize:13 }}>No goal set for this month yet. Ask your manager to set one.</p>}
        </Card>

        <Card>
          <CardTitle>Recent Activity</CardTitle>
          {recentLogs.length===0 ? <p style={{ color:'#9ca3af', fontSize:13 }}>No time logged yet.</p> :
            recentLogs.map(l=>(
              <div key={l.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f9fafb' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{l.project}</div>
                  <div style={{ fontSize:11, color:'#9ca3af', marginTop:1 }}>{l.date} · {l.task.slice(0,32)}{l.task.length>32?'...':''}</div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <Badge text={l.category} type="gray" />
                  <span style={{ fontSize:13, fontWeight:600, fontFamily:'DM Mono,monospace', color:'#6366f1' }}>{l.hours}h</span>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      <Card>
        <CardTitle>My Category Breakdown</CardTitle>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))', gap:12 }}>
          {Object.entries(kpis.catMap).sort((a:any,b:any)=>b[1]-a[1]).map(([cat,hours]:any)=>(
            <div key={cat} style={{ background:'#f9fafb', borderRadius:8, padding:'12px 14px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.05em' }}>{cat}</div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:'DM Mono,monospace', color:'#111827' }}>{Number(hours).toFixed(1)}h</div>
              <div style={{ fontSize:11, color:'#9ca3af' }}>{kpis.totalHours>0?Math.round(hours/kpis.totalHours*100):0}% of total</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
