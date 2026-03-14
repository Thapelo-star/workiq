'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile, TimeLog, BILLABLE_CATEGORIES } from '@/lib/types'
import { Card, CardTitle, PageHeader, FormGroup, inputStyle } from '@/components/ui'

const COLORS = ['#6366f1','#0ea5e9','#059669','#d97706','#7c3aed','#dc2626','#f472b6','#34d399','#fb923c','#38bdf8','#a78bfa']

function getWeeks(logs: TimeLog[]) {
  if (!logs.length) return []
  const byWeek: Record<string, { total: number; billable: number }> = {}
  logs.forEach(l => {
    const d = new Date(l.date)
    const diff = (d.getDay() + 6) % 7
    const mon = new Date(d); mon.setDate(d.getDate() - diff)
    const key = mon.toISOString().slice(0,10)
    if (!byWeek[key]) byWeek[key] = { total:0, billable:0 }
    byWeek[key].total += Number(l.hours)
    if (BILLABLE_CATEGORIES.includes(l.category as any)) byWeek[key].billable += Number(l.hours)
  })
  return Object.entries(byWeek).sort((a,b) => a[0].localeCompare(b[0])).slice(-12).map(([week, d]) => ({
    week, label: week.slice(5).replace('-','/'),
    total: parseFloat(d.total.toFixed(1)),
    billable: parseFloat(d.billable.toFixed(1)),
    billablePct: d.total > 0 ? Math.round((d.billable/d.total)*100) : 0,
  }))
}

function getCategoryMap(logs: TimeLog[]) {
  const m: Record<string,number> = {}
  logs.forEach(l => { m[l.category] = (m[l.category]||0) + Number(l.hours) })
  return Object.entries(m).sort((a,b) => b[1]-a[1])
}

function getTeamTrend(logs: TimeLog[], profiles: Profile[]) {
  const teamMap: Record<string,number> = {}
  const userTeam: Record<string,string> = {}
  profiles.forEach(p => { userTeam[p.id] = p.team || 'Unassigned' })
  logs.forEach(l => {
    const team = userTeam[l.user_id] || 'Unassigned'
    teamMap[team] = (teamMap[team]||0) + Number(l.hours)
  })
  return Object.entries(teamMap).sort((a,b) => b[1]-a[1])
}

function BarChart({ data, maxVal, color }: { data:{label:string;value:number}[]; maxVal:number; color:string }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:140, paddingBottom:28, position:'relative' }}>
      {data.map((d,i) => {
        const h = maxVal > 0 ? Math.round((d.value/maxVal)*100) : 0
        return (
          <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', gap:2 }}>
            <span style={{ fontSize:9, color:'#a0a8c0', fontFamily:'DM Mono,monospace' }}>{d.value > 0 ? d.value : ''}</span>
            <div style={{ width:'100%', background:'linear-gradient(180deg,'+color+','+color+'88)', borderRadius:'3px 3px 0 0', height:h+'%', minHeight:d.value>0?3:0, transition:'height 0.4s ease' }} />
            <span style={{ fontSize:8, color:'#a0a8c0', position:'absolute', bottom:0, whiteSpace:'nowrap' }}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ data, color }: { data:{label:string;value:number}[]; color:string }) {
  if (data.length < 2) return <div style={{ textAlign:'center', color:'#a0a8c0', padding:32, fontSize:13 }}>Not enough data yet.</div>
  const max = Math.max(...data.map(d=>d.value), 100)
  const w = 400; const h = 100; const pad = 14
  const pts = data.map((d,i) => {
    const x = pad + (i/(data.length-1)) * (w - pad*2)
    const y = h - pad - ((d.value/max) * (h - pad*2))
    return { x, y, label:d.label, value:d.value }
  })
  const path = pts.map((p,i) => (i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')
  const area = path + ' L'+pts[pts.length-1].x+','+h+' L'+pts[0].x+','+h+' Z'
  const gid = 'g' + color.replace('#','')
  return (
    <div style={{ overflowX:'auto' }}>
      <svg viewBox={'0 0 '+w+' '+(h+20)} style={{ width:'100%', height:120 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        <path d={area} fill={'url(#'+gid+')'} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {pts.map((p,i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={color} stroke="#fff" strokeWidth="1.5"/>
            <text x={p.x} y={h+16} textAnchor="middle" fontSize="8" fill="#a0a8c0">{p.label}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function DonutChart({ data }: { data:[string,number][] }) {
  if (!data.length) return <div style={{ textAlign:'center', color:'#a0a8c0', padding:20, fontSize:13 }}>No data.</div>
  const total = data.reduce((s,[,v])=>s+v,0)
  let cursor = 0
  const r = 50; const cx = 70; const cy = 70
  const slices = data.slice(0,8).map(([label,value],i) => {
    const pct = value/total
    const start = cursor; cursor += pct*360
    const startRad = (start-90)*Math.PI/180
    const endRad = (cursor-90)*Math.PI/180
    const x1=cx+r*Math.cos(startRad); const y1=cy+r*Math.sin(startRad)
    const x2=cx+r*Math.cos(endRad); const y2=cy+r*Math.sin(endRad)
    const large = pct > 0.5 ? 1 : 0
    const d = 'M'+cx+','+cy+' L'+x1+','+y1+' A'+r+','+r+' 0 '+large+',1 '+x2+','+y2+' Z'
    return { label, value, pct, color:COLORS[i%COLORS.length], d }
  })
  return (
    <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
      <svg viewBox="0 0 140 140" style={{ width:120, height:120, flexShrink:0 }}>
        {slices.map((s,i) => <path key={i} d={s.d} fill={s.color} opacity={0.9}/>)}
        <circle cx={cx} cy={cy} r={28} fill="#fff"/>
        <text x={cx} y={cy+4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#1a1d2e">{total.toFixed(0)}h</text>
      </svg>
      <div style={{ flex:1, minWidth:140 }}>
        {slices.map((s,i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
            <div style={{ width:8, height:8, borderRadius:2, background:s.color, flexShrink:0 }}/>
            <span style={{ fontSize:12, color:'#6b7280', flex:1 }}>{s.label}</span>
            <span style={{ fontSize:12, fontWeight:600, fontFamily:'DM Mono,monospace', color:'#1a1d2e' }}>{s.value.toFixed(1)}h</span>
            <span style={{ fontSize:11, color:'#a0a8c0' }}>{Math.round(s.pct*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label:string; value:string; color?:string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #f0f2f8' }}>
      <span style={{ fontSize:13, color:'#6b7280' }}>{label}</span>
      <span style={{ fontSize:15, fontWeight:700, fontFamily:'DM Mono,monospace', color:color||'#1a1d2e' }}>{value}</span>
    </div>
  )
}

export default function TrendsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [allProfiles, setAllProfiles] = useState<Profile[]>([])
  const [allLogs, setAllLogs] = useState<TimeLog[]>([])
  const [scope, setScope] = useState<'mine'|'company'|'team'|'user'>('mine')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const elevated = prof && ['Manager','Executive','Admin'].includes(prof.role)
    if (elevated) {
      const { data: profs } = await supabase.from('profiles').select('*').order('name')
      setAllProfiles(profs || [])
      const { data: logs } = await supabase.from('time_logs').select('*').limit(2000)
      setAllLogs(logs || [])
    } else {
      const { data: logs } = await supabase.from('time_logs').select('*').eq('user_id', user.id).limit(500)
      setAllLogs(logs || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [])

  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)

  const filteredLogs = (() => {
    if (!isElevated || scope === 'mine') return allLogs.filter(l => l.user_id === me?.id)
    if (scope === 'company') return allLogs
    if (scope === 'user') return selectedUser ? allLogs.filter(l => l.user_id === selectedUser) : []
    if (scope === 'team') {
      const ids = allProfiles.filter(p => p.team === selectedTeam).map(p => p.id)
      return selectedTeam ? allLogs.filter(l => ids.includes(l.user_id)) : []
    }
    return allLogs
  })()

  const weeks = getWeeks(filteredLogs)
  const cats = getCategoryMap(filteredLogs)
  const teams = getTeamTrend(filteredLogs, allProfiles)
  const totalHours = filteredLogs.reduce((s,l)=>s+Number(l.hours),0)
  const billableHours = filteredLogs.filter(l=>BILLABLE_CATEGORIES.includes(l.category as any)).reduce((s,l)=>s+Number(l.hours),0)
  const billablePct = totalHours > 0 ? Math.round((billableHours/totalHours)*100) : 0
  const avgWeekly = weeks.length > 0 ? parseFloat((weeks.reduce((s,w)=>s+w.total,0)/weeks.length).toFixed(1)) : 0
  const uniqueTeams = [...new Set(allProfiles.map(p=>p.team).filter(Boolean))]
  const selectedUserProfile = allProfiles.find(p=>p.id===selectedUser)

  const scopeLabel = (() => {
    if (!isElevated || scope==='mine') return 'My Trends'
    if (scope==='company') return 'Company Overview'
    if (scope==='user') return selectedUserProfile?.name || 'Select a person'
    if (scope==='team') return selectedTeam ? selectedTeam+' Team' : 'Select a team'
    return 'Trends'
  })()

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'#a0a8c0', fontSize:13 }}>Loading trends...</div>

  return (
    <div>
      <PageHeader title="Trends" subtitle="Visual analysis of hours, billability, and productivity over time." />

      {isElevated && (
        <Card style={{ marginBottom:24, padding:'16px 20px' }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
            <FormGroup label="View">
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {([
                  { key:'mine' as const,    label:'My Trends' },
                  { key:'company' as const, label:'Company' },
                  { key:'team' as const,    label:'By Team' },
                  { key:'user' as const,    label:'By Person' },
                ]).map(s => (
                  <button key={s.key} onClick={()=>setScope(s.key)}
                    style={{ fontFamily:'inherit', fontSize:13, fontWeight:scope===s.key?700:500, padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', transition:'all 0.15s',
                      background: scope===s.key ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f4f6fb',
                      color: scope===s.key ? '#fff' : '#6b7280',
                      boxShadow: scope===s.key ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </FormGroup>
            {scope==='user' && (
              <FormGroup label="Select Person">
                <select style={{ ...inputStyle, width:200 }} value={selectedUser} onChange={e=>setSelectedUser(e.target.value)}>
                  <option value="">Choose person...</option>
                  {allProfiles.map(p=><option key={p.id} value={p.id}>{p.name} ({p.role})</option>)}
                </select>
              </FormGroup>
            )}
            {scope==='team' && (
              <FormGroup label="Select Team">
                <select style={{ ...inputStyle, width:200 }} value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)}>
                  <option value="">Choose team...</option>
                  {uniqueTeams.map(t=><option key={t}>{t}</option>)}
                </select>
              </FormGroup>
            )}
          </div>
        </Card>
      )}

      <div style={{ marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:32, background:'linear-gradient(180deg,#6366f1,#0ea5e9)', borderRadius:4 }} />
        <div>
          <div style={{ fontSize:16, fontWeight:700, color:'#1a1d2e' }}>{scopeLabel}</div>
          {scope==='company' && isElevated && (
            <div style={{ fontSize:12, color:'#6b7280' }}>{allProfiles.length} people · {filteredLogs.length} log entries</div>
          )}
          {scope==='user' && selectedUserProfile && (
            <div style={{ fontSize:12, color:'#6b7280' }}>{selectedUserProfile.role} · {selectedUserProfile.team}</div>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Hours',   value:totalHours.toFixed(1)+'h',  color:'#6366f1' },
          { label:'Billable Hours',value:billableHours.toFixed(1)+'h',color:'#059669' },
          { label:'Billable %',    value:billablePct+'%',             color:billablePct>=70?'#059669':'#d97706' },
          { label:'Avg / Week',    value:avgWeekly+'h',               color:'#0ea5e9' },
          { label:'Log Entries',   value:filteredLogs.length.toString(),color:'#7c3aed' },
          { label:'Active Weeks',  value:weeks.length.toString(),     color:'#d97706' },
        ].map(s => (
          <div key={s.label} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden', boxShadow:'0 1px 3px rgba(30,33,64,0.05)' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:s.color, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:800, fontFamily:'DM Mono,monospace', color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {filteredLogs.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:48, color:'#a0a8c0', fontSize:13 }}>
            {scope==='user' && !selectedUser ? 'Select a person above to view their trends.' :
             scope==='team' && !selectedTeam ? 'Select a team above to view trends.' :
             'No time logs found for this selection.'}
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <Card>
              <CardTitle>Weekly Hours (last 12 weeks)</CardTitle>
              <BarChart data={weeks.map(w=>({ label:w.label, value:w.total }))} maxVal={Math.max(...weeks.map(w=>w.total),1)} color="#6366f1" />
            </Card>
            <Card>
              <CardTitle>Billable % per Week</CardTitle>
              <LineChart data={weeks.map(w=>({ label:w.label, value:w.billablePct }))} color="#059669" />
              <div style={{ display:'flex', gap:16, marginTop:8 }}>
                <div style={{ fontSize:12, color:'#6b7280' }}>Target: <strong>70%</strong></div>
                <div style={{ fontSize:12, color:billablePct>=70?'#059669':'#d97706' }}>Current avg: <strong>{billablePct}%</strong></div>
              </div>
            </Card>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <Card>
              <CardTitle>Category Breakdown</CardTitle>
              <DonutChart data={cats} />
            </Card>
            <Card>
              <CardTitle>Weekly Billable Hours</CardTitle>
              <BarChart data={weeks.map(w=>({ label:w.label, value:w.billable }))} maxVal={Math.max(...weeks.map(w=>w.total),1)} color="#0ea5e9" />
            </Card>
          </div>

          {(scope==='company' || scope==='team') && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
              <Card>
                <CardTitle>Hours by Team</CardTitle>
                {teams.map(([team,hours],i) => {
                  const pct = totalHours > 0 ? Math.round((hours/totalHours)*100) : 0
                  return (
                    <div key={team} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:13, fontWeight:500 }}>{team}</span>
                        <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', fontWeight:600, color:COLORS[i%COLORS.length] }}>{hours.toFixed(1)}h · {pct}%</span>
                      </div>
                      <div style={{ height:7, background:'#f4f6fb', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:pct+'%', height:'100%', background:COLORS[i%COLORS.length], borderRadius:4 }} />
                      </div>
                    </div>
                  )
                })}
              </Card>
              <Card>
                <CardTitle>Top Contributors</CardTitle>
                {allProfiles
                  .map(p => ({ profile:p, hours:filteredLogs.filter(l=>l.user_id===p.id).reduce((s,l)=>s+Number(l.hours),0) }))
                  .filter(x => x.hours > 0)
                  .sort((a,b) => b.hours-a.hours)
                  .slice(0,8)
                  .map(({ profile:p, hours },i) => {
                    const ub = filteredLogs.filter(l=>l.user_id===p.id&&BILLABLE_CATEGORIES.includes(l.category as any)).reduce((s,l)=>s+Number(l.hours),0)
                    const ubp = hours > 0 ? Math.round((ub/hours)*100) : 0
                    return (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #f0f2f8' }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:COLORS[i%COLORS.length]+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:COLORS[i%COLORS.length], flexShrink:0 }}>{p.name.charAt(0)}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize:11, color:'#a0a8c0' }}>{p.team}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:13, fontWeight:700, fontFamily:'DM Mono,monospace', color:COLORS[i%COLORS.length] }}>{hours.toFixed(1)}h</div>
                          <div style={{ fontSize:11, color:ubp>=70?'#059669':'#d97706' }}>{ubp}% billable</div>
                        </div>
                      </div>
                    )
                  })}
              </Card>
            </div>
          )}

          {scope==='user' && selectedUser && selectedUserProfile && (
            <Card>
              <CardTitle>Individual Summary — {selectedUserProfile.name}</CardTitle>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div>
                  <StatRow label="Total Hours" value={totalHours.toFixed(1)+'h'} />
                  <StatRow label="Billable Hours" value={billableHours.toFixed(1)+'h'} color="#059669" />
                  <StatRow label="Billable %" value={billablePct+'%'} color={billablePct>=70?'#059669':'#d97706'} />
                  <StatRow label="Avg per Week" value={avgWeekly+'h'} />
                  <StatRow label="Active Weeks" value={weeks.length.toString()} />
                  <StatRow label="Total Entries" value={filteredLogs.length.toString()} />
                </div>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#a0a8c0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>Top Projects</div>
                  {Object.entries(filteredLogs.reduce((m:Record<string,number>,l)=>{ m[l.project]=(m[l.project]||0)+Number(l.hours); return m },{}))
                    .sort((a,b)=>b[1]-a[1]).slice(0,5)
                    .map(([proj,hrs],i) => (
                      <div key={proj} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid #f0f2f8' }}>
                        <span style={{ fontSize:13, color:'#374151' }}>{proj}</span>
                        <span style={{ fontSize:13, fontWeight:600, fontFamily:'DM Mono,monospace', color:COLORS[i] }}>{Number(hrs).toFixed(1)}h</span>
                      </div>
                    ))}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
