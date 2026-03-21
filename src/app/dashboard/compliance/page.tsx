'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

export default function CompliancePage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [items, setItems] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState<any|null>(null)
  const [tab, setTab] = useState<'list'|'new'>('list')
  const [msg, setMsg] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('Regulatory')
  const [risk, setRisk] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)

  const RISK_COLORS: Record<string,'green'|'amber'|'red'|'purple'> = { Low:'green', Medium:'amber', High:'red', Critical:'purple' }
  const STATUS_COLORS: Record<string,'blue'|'amber'|'green'|'red'|'gray'> = { Open:'blue', 'In Review':'amber', Compliant:'green', 'Non-Compliant':'red', 'N/A':'gray' }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const { data: i } = await supabase.from('compliance_items').select('*, profiles!compliance_items_assigned_to_fkey(name)').order('created_at', { ascending:false })
    setItems(i || [])
    const { data: p } = await supabase.from('profiles').select('*').order('name')
    setProfiles(p || [])
  }, [])

  useEffect(() => { load() }, [])

  async function saveItem() {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('compliance_items').insert({ title, description:desc, category:cat, risk_level:risk, due_date:dueDate||null, assigned_to:assignedTo||null, created_by:user?.id })
    setTitle(''); setDesc(''); setDueDate(''); setAssignedTo('')
    setMsg('Compliance item added.'); load(); setTab('list')
    setTimeout(() => setMsg(''), 3000)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('compliance_items').update({ status, updated_at:new Date().toISOString() }).eq('id', id)
    load(); if (selected?.id===id) setSelected((s:any) => ({ ...s, status }))
  }

  const stats = { total:items.length, compliant:items.filter(i=>i.status==='Compliant').length, nonCompliant:items.filter(i=>i.status==='Non-Compliant').length, open:items.filter(i=>i.status==='Open').length }

  return (
    <div>
      <PageHeader title="Compliance" subtitle="Track regulatory requirements, policy adherence, and compliance status." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[['Total',stats.total,'#6366f1'],['Compliant',stats.compliant,'#059669'],['Non-Compliant',stats.nonCompliant,'#dc2626'],['Open',stats.open,'#d97706']].map(([l,v,c])=>(
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e8eaf2', marginBottom:20 }}>
        {(['list',...(isElevated?['new']:[])]).map(t=>(
          <div key={t} onClick={()=>setTab(t as any)} style={{ padding:'8px 18px', fontSize:13, cursor:'pointer', color:tab===t?'#6366f1':'#6b7280', borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent', marginBottom:-1, fontWeight:tab===t?600:400 }}>
            {t==='list'?'All Items':'Add Item'}
          </div>
        ))}
      </div>

      {tab==='new' && isElevated && (
        <Card style={{ maxWidth:560, marginBottom:20 }}>
          <CardTitle>New Compliance Item</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Title *"><input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. POPIA data handling audit" /></FormGroup></div>
            <FormGroup label="Category"><input style={inputStyle} value={cat} onChange={e=>setCat(e.target.value)} placeholder="e.g. Regulatory" /></FormGroup>
            <FormGroup label="Risk Level"><select style={inputStyle} value={risk} onChange={e=>setRisk(e.target.value)}>{['Low','Medium','High','Critical'].map(r=><option key={r}>{r}</option>)}</select></FormGroup>
            <FormGroup label="Due Date"><input style={inputStyle} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></FormGroup>
            <FormGroup label="Assign To"><select style={inputStyle} value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}><option value="">Unassigned</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></FormGroup>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Description"><textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={desc} onChange={e=>setDesc(e.target.value)} /></FormGroup></div>
          </div>
          <div style={{ marginTop:16 }}><Btn primary onClick={saveItem}>Add Item</Btn></div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 360px':'1fr', gap:20 }}>
        <Card>
          <Table heads={['Title','Category','Risk','Due Date','Assigned','Status','']} empty={items.length===0}>
            {items.map(item=>(
              <tr key={item.id} onClick={()=>setSelected(selected?.id===item.id?null:item)} style={{ cursor:'pointer', background:selected?.id===item.id?'#fafbff':'transparent' }}>
                <Td style={{ fontWeight:500 }}>{item.title}</Td>
                <Td style={{ color:'#6b7280' }}>{item.category}</Td>
                <Td><Badge text={item.risk_level} type={RISK_COLORS[item.risk_level]||'gray'} /></Td>
                <Td style={{ fontSize:12, color:item.due_date&&new Date(item.due_date)<new Date()?'#dc2626':'#6b7280' }}>{fmtDate(item.due_date)||'?'}</Td>
                <Td style={{ fontSize:12 }}>{(item.profiles as any)?.name||'?'}</Td>
                <Td><Badge text={item.status} type={STATUS_COLORS[item.status]||'gray'} /></Td>
                <Td><span style={{ fontSize:12, color:'#6366f1' }}>Details</span></Td>
              </tr>
            ))}
          </Table>
        </Card>
        {selected && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{selected.title}</div>
              <Btn small onClick={()=>setSelected(null)}>Close</Btn>
            </div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <Badge text={selected.risk_level} type={RISK_COLORS[selected.risk_level]||'gray'} />
              <Badge text={selected.status} type={STATUS_COLORS[selected.status]||'gray'} />
            </div>
            {selected.description && <p style={{ fontSize:13, color:'#6b7280', marginBottom:14, lineHeight:1.5 }}>{selected.description}</p>}
            {isElevated && (
              <div style={{ marginTop:12 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#a0a8c0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Update Status</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {['Open','In Review','Compliant','Non-Compliant','N/A'].map(s=>(
                    <Btn key={s} small primary={selected.status===s} onClick={()=>updateStatus(selected.id,s)}>{s}</Btn>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
