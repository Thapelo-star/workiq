'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Client } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'

export default function ClientsPage() {
  const supabase = createClient()
  const [clients, setClients] = useState<Client[]>([])
  const [selected, setSelected] = useState<Client|null>(null)
  const [tab, setTab] = useState<'list'|'new'>('list')
  const [msg, setMsg] = useState('')
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [industry, setIndustry] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
  }, [])

  useEffect(() => { load() }, [])

  async function save() {
    if (!name.trim()) { setMsg('Client name required.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('clients').insert({ name, contact_name:contact, contact_email:email, contact_phone:phone, industry, notes, created_by:user?.id })
    if (error) { setMsg(error.message); return }
    setMsg('Client added.')
    setName(''); setContact(''); setEmail(''); setPhone(''); setIndustry(''); setNotes('')
    load(); setTab('list'); setTimeout(() => setMsg(''), 3000)
  }

  async function toggleStatus(c: Client) {
    await supabase.from('clients').update({ status: c.status==='Active'?'Inactive':'Active' }).eq('id', c.id)
    load()
  }

  return (
    <div>
      <PageHeader title="Clients" subtitle="Manage client profiles, contacts, and linked projects." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[['Total Clients',clients.length],['Active',clients.filter(c=>c.status==='Active').length],['Inactive',clients.filter(c=>c.status==='Inactive').length]].map(([l,v])=>(
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#6366f1', borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:32, fontWeight:800, fontFamily:'DM Mono,monospace', color:'#6366f1' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e8eaf2', marginBottom:20 }}>
        {(['list','new'] as const).map(t=>(
          <div key={t} onClick={()=>setTab(t)}
            style={{ padding:'8px 18px', fontSize:13, cursor:'pointer', color:tab===t?'#6366f1':'#6b7280', borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent', marginBottom:-1, fontWeight:tab===t?600:400 }}>
            {t==='list'?'All Clients':'New Client'}
          </div>
        ))}
      </div>

      {tab==='new' && (
        <Card style={{ maxWidth:560, marginBottom:20 }}>
          <CardTitle>New Client</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Company Name *"><input style={inputStyle} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Acme Corporation" /></FormGroup></div>
            <FormGroup label="Contact Name"><input style={inputStyle} value={contact} onChange={e=>setContact(e.target.value)} placeholder="Primary contact" /></FormGroup>
            <FormGroup label="Industry"><input style={inputStyle} value={industry} onChange={e=>setIndustry(e.target.value)} placeholder="e.g. Finance, Tech" /></FormGroup>
            <FormGroup label="Email"><input style={inputStyle} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="contact@client.com" /></FormGroup>
            <FormGroup label="Phone"><input style={inputStyle} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+27 ..." /></FormGroup>
            <div style={{ gridColumn:'1/-1' }}><FormGroup label="Notes"><textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any relevant context..." /></FormGroup></div>
          </div>
          <div style={{ marginTop:16 }}><Btn primary onClick={save}>Add Client</Btn></div>
        </Card>
      )}

      <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 320px':'1fr', gap:20 }}>
        <Card>
          <Table heads={['Client','Contact','Email','Industry','Status','']} empty={clients.length===0}>
            {clients.map(c=>(
              <tr key={c.id} onClick={()=>setSelected(selected?.id===c.id?null:c)} style={{ cursor:'pointer', background:selected?.id===c.id?'#fafbff':'transparent' }}>
                <Td style={{ fontWeight:600 }}>{c.name}</Td>
                <Td style={{ color:'#6b7280' }}>{c.contact_name||'?'}</Td>
                <Td style={{ fontSize:12, color:'#6b7280' }}>{c.contact_email||'?'}</Td>
                <Td style={{ color:'#6b7280' }}>{c.industry||'?'}</Td>
                <Td><Badge text={c.status} type={c.status==='Active'?'green':'gray'} /></Td>
                <Td><Btn small onClick={()=>toggleStatus(c)}>{c.status==='Active'?'Deactivate':'Activate'}</Btn></Td>
              </tr>
            ))}
          </Table>
        </Card>
        {selected && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{selected.name}</div>
              <Btn small onClick={()=>setSelected(null)}>Close</Btn>
            </div>
            {[['Industry',selected.industry],['Contact',selected.contact_name],['Email',selected.contact_email],['Phone',selected.contact_phone]].filter(([,v])=>v).map(([l,v])=>(
              <div key={l as string} style={{ marginBottom:12 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:3 }}>{l}</div>
                <div style={{ fontSize:13, color:'#374151' }}>{v}</div>
              </div>
            ))}
            {selected.notes && <div style={{ marginTop:8, padding:'10px 12px', background:'#f4f6fb', borderRadius:8, fontSize:13, color:'#6b7280', lineHeight:1.5 }}>{selected.notes}</div>}
          </Card>
        )}
      </div>
    </div>
  )
}
