'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Badge, FormGroup, inputStyle } from '@/components/ui'

export default function SopPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [items, setItems] = useState<any[]>([])
  const [checks, setChecks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [tab, setTab] = useState<'board'|'new'>('board')
  const [msg, setMsg] = useState('')
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [cat, setCat] = useState('General')
  const [freq, setFreq] = useState('Monthly')
  const [ownerRole, setOwnerRole] = useState('Employee')
  const period = new Date().toISOString().slice(0,7)
  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const { data: i } = await supabase.from('sop_items').select('*').eq('active', true).order('created_at')
    setItems(i || [])
    const { data: c } = await supabase.from('sop_checks').select('*, profiles(name)').eq('period', period)
    setChecks(c || [])
    const { data: p } = await supabase.from('profiles').select('*').order('name')
    setProfiles(p || [])
  }, [])

  useEffect(() => { load() }, [])

  async function saveItem() {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('sop_items').insert({ title, description:desc, category:cat, frequency:freq, owner_role:ownerRole, created_by:user?.id })
    setTitle(''); setDesc(''); setMsg('SOP item added.'); load(); setTab('board')
    setTimeout(() => setMsg(''), 3000)
  }

  async function markCheck(sopId: string, userId: string) {
    await supabase.from('sop_checks').upsert({ sop_id:sopId, user_id:userId, period, status:'Done', checked_at:new Date().toISOString() })
    load()
  }

  const relevantProfiles = isElevated ? profiles : profiles.filter(p => me && p.id === me.id)
  const totalChecks = items.length * relevantProfiles.length
  const doneChecks = checks.filter(c => c.status === 'Done').length
  const compliance = totalChecks > 0 ? Math.round((doneChecks/totalChecks)*100) : 0

  return (
    <div>
      <PageHeader title="SOP Adherence" subtitle="Track standard operating procedure compliance across your team." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[['SOP Items',items.length,'#6366f1'],['Completed',doneChecks,'#059669'],['Period',period,'#0ea5e9'],['Compliance %',compliance+'%',compliance>=80?'#059669':'#dc2626']].map(([l,v,c])=>(
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e8eaf2', marginBottom:20 }}>
        {(['board',...(isElevated?['new']:[])]).map(t=>(
          <div key={t} onClick={()=>setTab(t as any)} style={{ padding:'8px 18px', fontSize:13, cursor:'pointer', color:tab===t?'#6366f1':'#6b7280', borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent', marginBottom:-1, fontWeight:tab===t?600:400 }}>
            {t==='board'?'Compliance Board':'Add SOP Item'}
          </div>
        ))}
      </div>

      {tab==='new' && isElevated && (
        <Card style={{ maxWidth:520, marginBottom:20 }}>
          <CardTitle>New SOP Item</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Title *"><input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Weekly timesheet submission" /></FormGroup></div>
            <FormGroup label="Category"><input style={inputStyle} value={cat} onChange={e=>setCat(e.target.value)} placeholder="e.g. HR, Finance" /></FormGroup>
            <FormGroup label="Frequency">
              <select style={inputStyle} value={freq} onChange={e=>setFreq(e.target.value)}>
                {['Daily','Weekly','Monthly','Quarterly','Annual'].map(f=><option key={f}>{f}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Owner Role">
              <select style={inputStyle} value={ownerRole} onChange={e=>setOwnerRole(e.target.value)}>
                {['Employee','Project Lead','Manager','Executive','Admin'].map(r=><option key={r}>{r}</option>)}
              </select>
            </FormGroup>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Description"><textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={desc} onChange={e=>setDesc(e.target.value)} /></FormGroup></div>
          </div>
          <div style={{ marginTop:16 }}><Btn primary onClick={saveItem}>Add SOP Item</Btn></div>
        </Card>
      )}

      {tab==='board' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {items.length===0 ? (
            <Card><div style={{ textAlign:'center', padding:40, color:'#a0a8c0', fontSize:13 }}>{isElevated?'No SOP items yet. Add one above.':'No SOP items have been set up yet.'}</div></Card>
          ) : items.map(item => {
            const itemChecks = checks.filter(c=>c.sop_id===item.id)
            return (
              <Card key={item.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{item.title}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <Badge text={item.frequency} type="amber" />
                      <Badge text={item.category} type="gray" />
                    </div>
                  </div>
                  <div style={{ fontSize:12, color:'#a0a8c0' }}>{period}</div>
                </div>
                {item.description && <p style={{ fontSize:13, color:'#6b7280', marginBottom:12, lineHeight:1.5 }}>{item.description}</p>}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {relevantProfiles.map(p => {
                    const check = itemChecks.find(c=>c.user_id===p.id)
                    const done = check?.status==='Done'
                    return (
                      <div key={p.id} style={{ background:'#f8f9fc', borderRadius:8, padding:'8px 12px', display:'flex', alignItems:'center', gap:10, minWidth:180 }}>
                        <div style={{ width:28, height:28, borderRadius:7, background:done?'#d1fae5':'#eef2ff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:done?'#059669':'#6366f1', flexShrink:0 }}>
                          {done?'?':p.name.charAt(0)}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:12, fontWeight:500 }}>{p.name}</div>
                          <Badge text={done?'Done':'Pending'} type={done?'green':'blue'} />
                        </div>
                        {(me?.id===p.id||isElevated) && !done && (
                          <Btn small primary onClick={()=>markCheck(item.id,p.id)}>Done</Btn>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
