'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

const STATUS_COLORS: Record<string,'green'|'amber'|'gray'|'red'> = {
  Active:'green', 'On Hold':'amber', Completed:'gray', Cancelled:'red'
}

export default function ProjectsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [members, setMembers] = useState<Record<string,any[]>>({})
  const [budgetActual, setBudgetActual] = useState<Record<string,{ cost:number; hours:number; revenue:number }>>({})
  const [rates, setRates] = useState<Record<string,number>>({})
  const [userRates, setUserRates] = useState<Record<string,number>>({})
  const [selected, setSelected] = useState<any|null>(null)
  const [tab, setTab] = useState<'list'|'new'|'budget'>('list')
  const [msg, setMsg] = useState('')
  const [pName, setPName] = useState('')
  const [pClient, setPClient] = useState('')
  const [pDesc, setPDesc] = useState('')
  const [pBudget, setPBudget] = useState('')
  const [pStatus, setPStatus] = useState('Active')
  const [pStart, setPStart] = useState('')
  const [pEnd, setPEnd] = useState('')
  const canEdit = me && ['Manager','Executive','Admin','Project Lead'].includes(me.role)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const { data: p } = await supabase.from('projects').select('*, clients(name)').order('created_at', { ascending:false })
    setProjects(p || [])
    const { data: c } = await supabase.from('clients').select('*').eq('status','Active').order('name')
    setClients(c || [])
    const { data: pr } = await supabase.from('profiles').select('*').order('name')
    setProfiles(pr || [])
    const { data: m } = await supabase.from('project_members').select('*, profiles(name,role)')
    const byProject: Record<string,any[]> = {}
    ;(m||[]).forEach((x:any) => { if (!byProject[x.project_id]) byProject[x.project_id]=[]; byProject[x.project_id].push(x) })
    setMembers(byProject)
    const { data: ratesData } = await supabase.from('project_rates').select('*')
    const rMap: Record<string,number> = {}
    ;(ratesData||[]).forEach((r:any) => { rMap[r.project] = r.rate })
    setRates(rMap)
    const urMap: Record<string,number> = {}
    ;(pr||[]).forEach((x:any) => { urMap[x.id] = x.hourly_rate || 0 })
    setUserRates(urMap)
    const { data: logs } = await supabase.from('time_logs').select('project,hours,user_id').limit(2000)
    const ba: Record<string,{ cost:number; hours:number; revenue:number }> = {}
    ;(logs||[]).forEach((l:any) => {
      if (!ba[l.project]) ba[l.project] = { cost:0, hours:0, revenue:0 }
      const h = Number(l.hours)
      ba[l.project].hours += h
      ba[l.project].cost += h * (urMap[l.user_id]||0)
      ba[l.project].revenue += h * (rMap[l.project]||0)
    })
    setBudgetActual(ba)
  }, [])

  useEffect(() => { load() }, [])

  async function saveProject() {
    if (!pName.trim()) { setMsg('Project name is required.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('projects').insert({
      name:pName, client_id:pClient||null, description:pDesc,
      budget:parseFloat(pBudget)||0, status:pStatus,
      start_date:pStart||null, end_date:pEnd||null, created_by:user?.id
    })
    if (error) { setMsg(error.message); return }
    setMsg('Project created.'); setPName(''); setPClient(''); setPDesc(''); setPBudget(''); setPStart(''); setPEnd('')
    load(); setTab('list'); setTimeout(() => setMsg(''), 3000)
  }

  async function addMember(projectId:string, userId:string) {
    await supabase.from('project_members').upsert({ project_id:projectId, user_id:userId })
    load()
  }
  async function removeMember(id:string) {
    await supabase.from('project_members').delete().eq('id', id)
    load()
  }

  const [addUser, setAddUser] = useState('')
  const projectMembers = selected ? (members[selected.id]||[]) : []
  const availableProfiles = selected ? profiles.filter(p => !projectMembers.some((m:any) => m.user_id === p.id)) : []

  const totalBudget = projects.reduce((s,p) => s + Number(p.budget||0), 0)
  const totalCost = Object.values(budgetActual).reduce((s,v) => s + v.cost, 0)
  const totalRevenue = Object.values(budgetActual).reduce((s,v) => s + v.revenue, 0)

  return (
    <div>
      <PageHeader title="Projects" subtitle="Manage projects, track budgets vs actuals, and assign teams." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          ['Total Projects', projects.length, '#6366f1'],
          ['Total Budget', 'R '+totalBudget.toLocaleString(), '#0ea5e9'],
          ['Actual Cost', 'R '+totalCost.toLocaleString(), totalCost>totalBudget&&totalBudget>0?'#dc2626':'#059669'],
          ['Projected Revenue', 'R '+totalRevenue.toLocaleString(), '#d97706'],
        ].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:24, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e8eaf2', marginBottom:20 }}>
        {(['list','budget', ...(canEdit?['new']:[])]).map(t => (
          <div key={t} onClick={()=>setTab(t as any)}
            style={{ padding:'8px 18px', fontSize:13, cursor:'pointer', color:tab===t?'#6366f1':'#6b7280', borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent', marginBottom:-1, fontWeight:tab===t?600:400 }}>
            {t==='list'?'All Projects':t==='budget'?'Budget vs Actual':'New Project'}
          </div>
        ))}
      </div>

      {tab === 'budget' && (
        <Card>
          <CardTitle>Budget vs Actual Cost per Project</CardTitle>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8f9fc' }}>
              {['Project','Budget','Actual Cost','Variance','Hours','Rev (projected)','Health'].map(h=>(
                <th key={h} style={{ textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'#6366f1', padding:'10px 14px', borderBottom:'2px solid #e8eaf2' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {projects.map(p => {
                const ba = budgetActual[p.name] || { cost:0, hours:0, revenue:0 }
                const budget = Number(p.budget||0)
                const variance = budget > 0 ? budget - ba.cost : null
                const overspend = variance !== null && variance < 0
                const pct = budget > 0 ? Math.round((ba.cost/budget)*100) : null
                return (
                  <tr key={p.id}>
                    <Td style={{ fontWeight:600 }}>{p.name}</Td>
                    <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12 }}>{budget>0?'R '+budget.toLocaleString():'—'}</Td>
                    <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:overspend?'#dc2626':'#374151' }}>R {ba.cost.toLocaleString()}</Td>
                    <Td>
                      {variance !== null ? (
                        <span style={{ fontSize:12, fontWeight:700, color:overspend?'#dc2626':'#059669' }}>
                          {overspend?'−':'+'} R {Math.abs(variance).toLocaleString()}
                        </span>
                      ) : <span style={{ color:'#a0a8c0', fontSize:12 }}>No budget</span>}
                    </Td>
                    <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12 }}>{ba.hours.toFixed(1)}h</Td>
                    <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:'#059669' }}>
                      {ba.revenue>0?'R '+ba.revenue.toLocaleString():'—'}
                    </Td>
                    <Td>
                      {pct !== null ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:80, height:7, background:'#f4f6fb', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ width:Math.min(100,pct)+'%', height:'100%', borderRadius:4,
                              background: pct>100?'#dc2626':pct>80?'#d97706':'#059669' }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:600, color:pct>100?'#dc2626':pct>80?'#d97706':'#059669' }}>{pct}%</span>
                        </div>
                      ) : <span style={{ color:'#a0a8c0', fontSize:12 }}>—</span>}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop:10, fontSize:11, color:'#a0a8c0' }}>
            Actual Cost = logged hours × user hourly rate. Revenue = logged hours × project rate. Set rates in Costing and Admin.
          </div>
        </Card>
      )}

      {tab === 'new' && canEdit && (
        <Card style={{ maxWidth:560, marginBottom:20 }}>
          <CardTitle>New Project</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Project Name *"><input style={inputStyle} value={pName} onChange={e=>setPName(e.target.value)} /></FormGroup></div>
            <FormGroup label="Client">
              <select style={inputStyle} value={pClient} onChange={e=>setPClient(e.target.value)}>
                <option value="">No client</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Status">
              <select style={inputStyle} value={pStatus} onChange={e=>setPStatus(e.target.value)}>
                <option>Active</option><option>On Hold</option><option>Completed</option><option>Cancelled</option>
              </select>
            </FormGroup>
            <FormGroup label="Budget (R)"><input style={inputStyle} type="number" value={pBudget} onChange={e=>setPBudget(e.target.value)} /></FormGroup>
            <FormGroup label="Start Date"><input style={inputStyle} type="date" value={pStart} onChange={e=>setPStart(e.target.value)} /></FormGroup>
            <FormGroup label="End Date"><input style={inputStyle} type="date" value={pEnd} onChange={e=>setPEnd(e.target.value)} /></FormGroup>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Description"><textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={pDesc} onChange={e=>setPDesc(e.target.value)} /></FormGroup></div>
          </div>
          <div style={{ marginTop:16 }}><Btn primary onClick={saveProject}>Create Project</Btn></div>
        </Card>
      )}

      {tab === 'list' && (
        <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 360px':'1fr', gap:20 }}>
          <Card>
            <Table heads={['Name','Client','Status','Budget','Cost','Health','']} empty={projects.length===0}>
              {projects.map(p => {
                const ba = budgetActual[p.name] || { cost:0, hours:0, revenue:0 }
                const budget = Number(p.budget||0)
                const pct = budget > 0 ? Math.round((ba.cost/budget)*100) : null
                return (
                  <tr key={p.id} onClick={()=>setSelected(selected?.id===p.id?null:p)} style={{ cursor:'pointer', background:selected?.id===p.id?'#fafbff':'transparent' }}>
                    <Td style={{ fontWeight:600 }}>{p.name}</Td>
                    <Td style={{ color:'#6b7280', fontSize:12 }}>{(p.clients as any)?.name||'—'}</Td>
                    <Td><Badge text={p.status} type={STATUS_COLORS[p.status]||'gray'} /></Td>
                    <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12 }}>{budget>0?'R '+budget.toLocaleString():'—'}</Td>
                    <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12, color:pct&&pct>100?'#dc2626':'#374151' }}>R {ba.cost.toLocaleString()}</Td>
                    <Td>
                      {pct !== null ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:60, height:5, background:'#f4f6fb', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:Math.min(100,pct)+'%', height:'100%', borderRadius:3, background:pct>100?'#dc2626':pct>80?'#d97706':'#059669' }} />
                          </div>
                          <span style={{ fontSize:11, color:'#6b7280' }}>{pct}%</span>
                        </div>
                      ) : <span style={{ color:'#a0a8c0', fontSize:12 }}>—</span>}
                    </Td>
                    <Td><span style={{ fontSize:12, color:'#6366f1' }}>{members[p.id]?.length||0} members</span></Td>
                  </tr>
                )
              })}
            </Table>
          </Card>
          {selected && (
            <Card>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{selected.name}</div>
                <Btn small onClick={()=>setSelected(null)}>Close</Btn>
              </div>
              {selected.description && <p style={{ fontSize:13, color:'#6b7280', marginBottom:14, lineHeight:1.5 }}>{selected.description}</p>}
              {(() => {
                const ba = budgetActual[selected.name] || { cost:0, hours:0, revenue:0 }
                const budget = Number(selected.budget||0)
                const variance = budget > 0 ? budget - ba.cost : null
                return budget > 0 ? (
                  <div style={{ marginBottom:14, padding:'12px 14px', background:'#f4f6fb', borderRadius:8 }}>
                    <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6366f1', marginBottom:8 }}>Budget vs Actual</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                      {[['Budget','R '+budget.toLocaleString()],['Actual Cost','R '+ba.cost.toLocaleString()],['Hours',ba.hours.toFixed(1)+'h'],['Variance',variance!==null?(variance>=0?'+':'-')+' R '+Math.abs(variance).toLocaleString():'—']].map(([l,v])=>(
                        <div key={l as string}>
                          <div style={{ fontSize:10, color:'#a0a8c0', fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>{l}</div>
                          <div style={{ fontSize:14, fontWeight:700, fontFamily:'DM Mono,monospace', color: l==='Variance'&&variance!==null&&variance<0?'#dc2626':'#1a1d2e' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}
              <CardTitle>Team Members ({projectMembers.length})</CardTitle>
              {projectMembers.map((m:any) => (
                <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>{m.profiles?.name}</span>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    <span style={{ fontSize:11, color:'#9ca3af' }}>{m.profiles?.role}</span>
                    {canEdit && <Btn small danger onClick={()=>removeMember(m.id)}>Remove</Btn>}
                  </div>
                </div>
              ))}
              {canEdit && availableProfiles.length > 0 && (
                <div style={{ marginTop:12, display:'flex', gap:8 }}>
                  <select style={{ ...inputStyle, flex:1 }} value={addUser} onChange={e=>setAddUser(e.target.value)}>
                    <option value="">Add member...</option>
                    {availableProfiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <Btn primary small onClick={()=>{ if(addUser){ addMember(selected.id,addUser); setAddUser('') }}}>Add</Btn>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
