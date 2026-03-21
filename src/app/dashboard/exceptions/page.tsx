'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'

export default function ExceptionsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [items, setItems] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState<any|null>(null)
  const [tab, setTab] = useState<'list'|'new'>('list')
  const [msg, setMsg] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('Process')
  const [sev, setSev] = useState('Medium')
  const [assignedTo, setAssignedTo] = useState('')
  const [resolution, setResolution] = useState('')

  const SEV_COLORS: Record<string,'green'|'amber'|'red'|'purple'> = { Low:'green', Medium:'amber', High:'red', Critical:'purple' }
  const STATUS_COLORS: Record<string,'blue'|'amber'|'green'|'gray'> = { Open:'blue', 'In Progress':'amber', Resolved:'green', Closed:'gray' }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const { data: i } = await supabase.from('exceptions')
      .select('*, reported:profiles!exceptions_reported_by_fkey(name), assigned:profiles!exceptions_assigned_to_fkey(name)')
      .order('created_at', { ascending:false })
    setItems(i || [])
    const { data: p } = await supabase.from('profiles').select('*').order('name')
    setProfiles(p || [])
  }, [])

  useEffect(() => { load() }, [])

  async function saveException() {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('exceptions').insert({ title, description:desc, category:cat, severity:sev, assigned_to:assignedTo||null, reported_by:user?.id })
    await supabase.from('notifications').insert({ user_id:user?.id, title:'Exception Logged', body:sev+' severity: '+title, type:sev==='Critical'||sev==='High'?'error':'warning', link:'/dashboard/exceptions' })
    setTitle(''); setDesc(''); setAssignedTo('')
    setMsg('Exception logged.'); load(); setTab('list')
    setTimeout(() => setMsg(''), 3000)
  }

  async function updateException(id: string, status: string, res: string='') {
    const updates: any = { status, updated_at:new Date().toISOString() }
    if (res) updates.resolution = res
    if (status==='Resolved'||status==='Closed') updates.resolved_at = new Date().toISOString()
    await supabase.from('exceptions').update(updates).eq('id', id)
    load(); setSelected((s:any) => s ? { ...s, ...updates } : null)
  }

  const stats = { total:items.length, open:items.filter(i=>i.status==='Open').length, inProgress:items.filter(i=>i.status==='In Progress').length, resolved:items.filter(i=>i.status==='Resolved'||i.status==='Closed').length }

  return (
    <div>
      <PageHeader title="Exceptions" subtitle="Log, track, and resolve process exceptions and incidents."
        action={<Btn primary onClick={()=>setTab(tab==='new'?'list':'new')}>+ Log Exception</Btn>} />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[['Total',stats.total,'#6366f1'],['Open',stats.open,'#d97706'],['In Progress',stats.inProgress,'#0ea5e9'],['Resolved',stats.resolved,'#059669']].map(([l,v,c])=>(
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {tab==='new' && (
        <Card style={{ maxWidth:560, marginBottom:20 }}>
          <CardTitle>Log New Exception</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Title *"><input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Brief description" /></FormGroup></div>
            <FormGroup label="Category"><select style={inputStyle} value={cat} onChange={e=>setCat(e.target.value)}>{['Process','System','Client','Financial','HR','Other'].map(c=><option key={c}>{c}</option>)}</select></FormGroup>
            <FormGroup label="Severity"><select style={inputStyle} value={sev} onChange={e=>setSev(e.target.value)}>{['Low','Medium','High','Critical'].map(s=><option key={s}>{s}</option>)}</select></FormGroup>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Assign To"><select style={inputStyle} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}><option value="">Unassigned</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormGroup></div>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Description"><textarea style={{ ...inputStyle, minHeight:80, resize:'vertical' }} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What happened and what is the impact..." /></FormGroup></div>
          </div>
          <div style={{ marginTop:16, display:'flex', gap:8 }}>
            <Btn primary onClick={saveException}>Log Exception</Btn>
            <Btn onClick={()=>setTab('list')}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'1fr', gap:20 }}>
        <Card>
          <Table heads={['Title','Category','Severity','Reported By','Assigned','Status','']} empty={items.length===0}>
            {items.map(item=>(
              <tr key={item.id} onClick={()=>setSelected(selected?.id===item.id?null:item)} style={{ cursor:'pointer', background:selected?.id===item.id?'#fafbff':'transparent' }}>
                <Td style={{ fontWeight:500 }}>{item.title}</Td>
                <Td style={{ color:'#6b7280' }}>{item.category}</Td>
                <Td><Badge text={item.severity} type={SEV_COLORS[item.severity]||'gray'} /></Td>
                <Td style={{ fontSize:12 }}>{(item.reported as any)?.name||'?'}</Td>
                <Td style={{ fontSize:12 }}>{(item.assigned as any)?.name||'?'}</Td>
                <Td><Badge text={item.status} type={STATUS_COLORS[item.status]||'gray'} /></Td>
                <Td><span style={{ fontSize:12, color:'#6366f1' }}>View</span></Td>
              </tr>
            ))}
          </Table>
        </Card>
        {selected && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:15, flex:1, marginRight:8 }}>{selected.title}</div>
              <Btn small onClick={()=>setSelected(null)}>Close</Btn>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <Badge text={selected.severity} type={SEV_COLORS[selected.severity]||'gray'} />
              <Badge text={selected.status} type={STATUS_COLORS[selected.status]||'gray'} />
              <Badge text={selected.category} type="gray" />
            </div>
            {selected.description && <p style={{ fontSize:13, color:'#6b7280', marginBottom:14, lineHeight:1.5 }}>{selected.description}</p>}
            {selected.resolution && (
              <div style={{ marginBottom:14, padding:'10px 12px', background:'#d1fae5', borderRadius:8 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#059669', marginBottom:4 }}>Resolution</div>
                <p style={{ fontSize:13, color:'#065f46', lineHeight:1.5 }}>{selected.resolution}</p>
              </div>
            )}
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a0a8c0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Update Status</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                {['Open','In Progress','Resolved','Closed'].map(s=>(
                  <Btn key={s} small primary={selected.status===s} onClick={()=>updateException(selected.id,s)}>{s}</Btn>
                ))}
              </div>
              {(selected.status==='Resolved'||selected.status==='In Progress') && (
                <FormGroup label="Resolution Notes">
                  <textarea style={{ ...inputStyle, minHeight:64, resize:'vertical' }} value={resolution} onChange={e=>setResolution(e.target.value)} placeholder="How was this resolved..." />
                  <Btn primary small onClick={()=>updateException(selected.id,selected.status,resolution)} style={{ marginTop:8 }}>Save Notes</Btn>
                </FormGroup>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
