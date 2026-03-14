'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLog, KpiRules, Profile } from '@/lib/types'
import { computeKpis, computeFlags } from '@/lib/kpi'
import { Card, CardTitle, PageHeader, KpiCard, Badge, FormGroup, inputStyle, Btn } from '@/components/ui'

export default function KpisPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [rules, setRules] = useState<KpiRules|null>(null)
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [scope, setScope] = useState<'mine'|'company'>('mine')
  const [loading, setLoading] = useState(true)
  const [snapping, setSnapping] = useState(false)
  const [snapMsg, setSnapMsg] = useState('')

  const currentPeriod = new Date().toISOString().slice(0,7)
  const prevPeriod = (() => {
    const d = new Date(); d.setMonth(d.getMonth()-1)
    return d.toISOString().slice(0,7)
  })()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const elevated = prof && ['Manager','Executive','Admin'].includes(prof.role)

    let q = supabase.from('time_logs').select('*, profiles(name,role,team)').limit(1000)
    if (!elevated || scope === 'mine') q = q.eq('user_id', user.id)
    const { data: l } = await q; setLogs(l || [])

    const { data: r } = await supabase.from('kpi_rules').select('*').limit(1).single()
    setRules(r)

    const { data: s } = await supabase.from('kpi_snapshots')
      .select('*').eq('user_id', user.id).eq('scope', scope)
      .in('period', [currentPeriod, prevPeriod])
      .order('period', { ascending:false })
    setSnapshots(s || [])

    setLoading(false)
  }, [scope])

  useEffect(() => { load() }, [scope])

  const kpis = computeKpis(logs)
  const flags = computeFlags(kpis, rules || { id:'', daily_hours_threshold:8, billable_target:70, category_targets:{}, updated_at:'' })

  const currentSnap = snapshots.find(s => s.period === currentPeriod)
  const prevSnap = snapshots.find(s => s.period === prevPeriod)

  function diff(current: number, prev: number | undefined, higherIsBetter = true) {
    if (!prev) return null
    const d = current - prev
    if (d === 0) return { text:'No change', color:'#d97706', icon:'→' }
    const positive = higherIsBetter ? d > 0 : d < 0
    return {
      text: (d > 0 ? '+' : '') + d.toFixed(1),
      color: positive ? '#059669' : '#dc2626',
      icon: d > 0 ? '↑' : '↓'
    }
  }

  async function saveSnapshot() {
    setSnapping(true)
    await fetch('/api/kpi-snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope, scopeLabel: scope === 'mine' ? (me?.name||'Me') : 'Company',
        period: currentPeriod, kpis
      })
    })
    setSnapping(false); setSnapMsg('Snapshot saved.')
    load(); setTimeout(() => setSnapMsg(''), 3000)
  }

  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)
  const catData = Object.entries(kpis.catMap).sort((a,b) => b[1]-a[1])
  const projData = Object.entries(kpis.projMap).sort((a,b) => b[1]-a[1]).slice(0,6)
  const CAT_COLORS: Record<string,string> = {
    Development:'#6366f1', Design:'#0ea5e9', Meetings:'#d97706', Research:'#7c3aed',
    Admin:'#6b7280', Client:'#059669', Training:'#f472b6',
    'Test Work':'#dc2626', 'Test Work Admin':'#fb923c', 'Test Work Setup':'#34d399', Other:'#a0a8c0',
  }

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#a0a8c0' }}>Loading KPIs...</div>

  return (
    <div>
      <PageHeader title="KPIs" subtitle="Live performance metrics with month-over-month comparison."
        action={
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {snapMsg && <span style={{ fontSize:12, color:'#059669', fontWeight:500 }}>{snapMsg}</span>}
            <Btn onClick={saveSnapshot} disabled={snapping}>{snapping?'Saving...':'Save Snapshot'}</Btn>
          </div>
        } />

      {isElevated && (
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {(['mine','company'] as const).map(s => (
            <button key={s} onClick={()=>setScope(s)}
              style={{ fontFamily:'inherit', fontSize:13, fontWeight:scope===s?700:500, padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer',
                background: scope===s?'linear-gradient(135deg,#6366f1,#4f46e5)':'#f4f6fb',
                color: scope===s?'#fff':'#6b7280',
                boxShadow: scope===s?'0 2px 8px rgba(99,102,241,0.3)':'none' }}>
              {s === 'mine' ? 'My KPIs' : 'Company KPIs'}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Hours', value:kpis.totalHours, diffVal: diff(kpis.totalHours, prevSnap?.total_hours), color:'#6366f1' },
          { label:'Billable Hours', value:kpis.billableHours, diffVal: diff(kpis.billableHours, prevSnap?.billable_hours), color:'#059669' },
          { label:'Billable %', value:kpis.billablePct+'%', diffVal: diff(kpis.billablePct, prevSnap?.billable_pct), color: kpis.billablePct>=(rules?.billable_target||70)?'#059669':'#d97706' },
          { label:'Avg per Day', value:kpis.avgPerDay+'h', diffVal: diff(kpis.avgPerDay, prevSnap?.avg_per_day, false), color:'#7c3aed' },
          { label:'Active Days', value:kpis.activeDays, color:'#0ea5e9' },
          { label:'Log Entries', value:logs.length, color:'#d97706' },
        ].map(({ label, value, diffVal, color }) => (
          <div key={label} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden', boxShadow:'0 1px 3px rgba(30,33,64,0.05)' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color, borderRadius:'12px 12px 0 0' }} />
            <div style={{ position:'absolute', top:0, right:0, width:56, height:56, borderRadius:'0 12px 0 56px', background:color, opacity:0.06 }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:28, fontWeight:800, fontFamily:'DM Mono,monospace', color }}>{value}</div>
            {diffVal && (
              <div style={{ marginTop:6, fontSize:12, fontWeight:700, color:diffVal.color, display:'flex', alignItems:'center', gap:3 }}>
                {diffVal.icon} {diffVal.text} vs last month
              </div>
            )}
            {!diffVal && prevSnap && <div style={{ marginTop:6, fontSize:11, color:'#a0a8c0' }}>vs last month: —</div>}
            {!prevSnap && <div style={{ marginTop:6, fontSize:11, color:'#a0a8c0' }}>No prior snapshot</div>}
          </div>
        ))}
      </div>

      {prevSnap && (
        <Card style={{ marginBottom:20, padding:'14px 20px', background:'linear-gradient(135deg,#fafbff,#f4f6fb)', border:'1px solid #e0e4f8' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#6366f1', marginBottom:4 }}>Month-over-month comparison</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Snapshot: {prevSnap.period} vs {currentPeriod}</div>
            </div>
            <div style={{ display:'flex', gap:24 }}>
              {[
                ['Hours', prevSnap.total_hours, kpis.totalHours, true],
                ['Billable %', prevSnap.billable_pct+'%', kpis.billablePct+'%', true],
                ['Avg/Day', prevSnap.avg_per_day+'h', kpis.avgPerDay+'h', false],
              ].map(([label, prev, curr, hib]) => (
                <div key={label as string} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:4 }}>{label}</div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:14, fontFamily:'DM Mono,monospace', color:'#9ca3af' }}>{prev}</span>
                    <span style={{ fontSize:12, color:'#d1d5db' }}>→</span>
                    <span style={{ fontSize:16, fontFamily:'DM Mono,monospace', fontWeight:700, color:'#1a1d2e' }}>{curr}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {flags.length > 0 && (
        <Card style={{ marginBottom:20 }}>
          <CardTitle>Active Flags</CardTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {flags.map((f,i) => (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', borderRadius:8,
                background: f.level==='High'?'#fff5f5':f.level==='Med'?'#fffbeb':'#f0fdf4',
                border: '1px solid ' + (f.level==='High'?'rgba(220,38,38,0.15)':f.level==='Med'?'rgba(217,119,6,0.15)':'rgba(5,150,105,0.15)') }}>
                <Badge text={f.level} type={f.level==='High'?'red':f.level==='Med'?'amber':'green'} />
                <span style={{ fontSize:13, color:'#374151' }}>{f.msg}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>Category Breakdown</CardTitle>
          {catData.length === 0 ? <p style={{ color:'#a0a8c0', fontSize:13 }}>No logs yet.</p> :
            catData.map(([cat, hours]) => {
              const pct = kpis.totalHours > 0 ? Math.round((hours/kpis.totalHours)*100) : 0
              const color = CAT_COLORS[cat] || '#6b7280'
              return (
                <div key={cat} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:2, background:color, flexShrink:0 }} />
                      <span style={{ fontSize:13, fontWeight:500 }}>{cat}</span>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                      <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', fontWeight:600, color }}>{hours.toFixed(1)}h</span>
                      <span style={{ fontSize:12, color:'#a0a8c0', width:32, textAlign:'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height:6, background:'#f4f6fb', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:pct+'%', height:'100%', background:color, borderRadius:3, transition:'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
        </Card>

        <Card>
          <CardTitle>Top Projects</CardTitle>
          {projData.length === 0 ? <p style={{ color:'#a0a8c0', fontSize:13 }}>No logs yet.</p> :
            projData.map(([proj, hours], i) => {
              const pct = kpis.totalHours > 0 ? Math.round((hours/kpis.totalHours)*100) : 0
              const colors = ['#6366f1','#0ea5e9','#059669','#d97706','#7c3aed','#f472b6']
              const color = colors[i % colors.length]
              return (
                <div key={proj} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:180 }}>{proj}</span>
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexShrink:0 }}>
                      <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', fontWeight:600, color }}>{hours.toFixed(1)}h</span>
                      <span style={{ fontSize:12, color:'#a0a8c0', width:32, textAlign:'right' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ height:6, background:'#f4f6fb', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ width:pct+'%', height:'100%', background:color, borderRadius:3 }} />
                  </div>
                </div>
              )
            })}
        </Card>
      </div>

      <Card>
        <CardTitle>Save Monthly Snapshot</CardTitle>
        <p style={{ fontSize:13, color:'#6b7280', marginBottom:12, lineHeight:1.6 }}>
          Snapshots let you compare this month against previous months. Click Save Snapshot at the top of this page at the end of each month. Once saved, the month-over-month arrows above will show whether your metrics improved or declined.
        </p>
        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
          {snapshots.map(s => (
            <div key={s.id} style={{ background:'#f4f6fb', borderRadius:8, padding:'10px 14px', minWidth:160 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a0a8c0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{s.period}</div>
              <div style={{ fontSize:13, color:'#374151' }}>{s.total_hours}h · {s.billable_pct}% billable</div>
            </div>
          ))}
          {snapshots.length === 0 && <p style={{ fontSize:13, color:'#a0a8c0' }}>No snapshots saved yet.</p>}
        </div>
      </Card>
    </div>
  )
}
