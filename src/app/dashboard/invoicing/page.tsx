'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Invoice, TimeLog, ProjectRate } from '@/lib/types'
import { fmtDate } from '@/lib/kpi'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle, StatusBadge } from '@/components/ui'

const STATUS_COLORS: Record<string,'blue'|'amber'|'green'> = { Draft:'blue', Sent:'amber', Paid:'green' }

export default function InvoicingPage() {
  const supabase = createClient()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [projects, setProjects] = useState<string[]>([])
  const [rates, setRates] = useState<ProjectRate[]>([])
  const [tab, setTab] = useState<'list'|'new'>('list')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const [client, setClient] = useState('')
  const [project, setProject] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [rate, setRate] = useState('')
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<{ hours: number; amount: number }|null>(null)

  const load = useCallback(async () => {
    const { data: inv } = await supabase.from('invoices').select('*').order('created_at', { ascending:false })
    setInvoices(inv || [])
    const { data: logs } = await supabase.from('time_logs').select('project').limit(500)
    const unique = [...new Set((logs||[]).map((l:any) => l.project))].sort()
    setProjects(unique)
    const { data: r } = await supabase.from('project_rates').select('*')
    setRates(r || [])
  }, [])

  useEffect(() => { load() }, [])

  async function calcPreview() {
    if (!project || !from || !to) return
    const { data: logs } = await supabase.from('time_logs').select('hours')
      .eq('project', project).gte('date', from).lte('date', to)
    const hours = (logs||[]).reduce((s:number,l:any) => s + Number(l.hours), 0)
    const r = parseFloat(rate) || 0
    setPreview({ hours, amount: parseFloat((hours * r).toFixed(2)) })
  }

  useEffect(() => {
    const found = rates.find(r => r.project === project)
    if (found) setRate(String(found.rate))
  }, [project])

  async function saveInvoice() {
    if (!client || !project || !from || !to || !rate) { setMsg('Please fill in all required fields.'); return }
    setSaving(true)
    const { data: logs } = await supabase.from('time_logs').select('hours')
      .eq('project', project).gte('date', from).lte('date', to)
    const hours = (logs||[]).reduce((s:number,l:any) => s + Number(l.hours), 0)
    const r = parseFloat(rate)
    const amount = parseFloat((hours * r).toFixed(2))
    const invNum = 'INV-' + Date.now().toString().slice(-6)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('invoices').insert({
      invoice_number: invNum, client_name: client, project, period_from: from,
      period_to: to, hours, rate: r, amount, status: 'Draft', notes, created_by: user?.id,
    })
    setSaving(false)
    if (error) { setMsg(error.message); return }
    setMsg('Invoice ' + invNum + ' created.')
    setClient(''); setProject(''); setFrom(''); setTo(''); setRate(''); setNotes(''); setPreview(null)
    load(); setTab('list')
    setTimeout(() => setMsg(''), 4000)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('invoices').update({ status }).eq('id', id)
    load()
  }

  const total = invoices.reduce((s,i) => s + Number(i.amount), 0)
  const paid = invoices.filter(i=>i.status==='Paid').reduce((s,i) => s + Number(i.amount), 0)
  const outstanding = invoices.filter(i=>i.status!=='Paid').reduce((s,i) => s + Number(i.amount), 0)

  return (
    <div>
      <PageHeader title="Invoicing" subtitle="Generate and track client invoices from logged time." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[['Total Invoiced','R ' + total.toLocaleString()],['Paid','R ' + paid.toLocaleString()],['Outstanding','R ' + outstanding.toLocaleString()]].map(([l,v])=>(
          <div key={l} style={{ background:'#fff', border:'1px solid #e2e0d8', borderRadius:8, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:24, fontWeight:600, letterSpacing:-0.5 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e2e0d8', marginBottom:20 }}>
        {(['list','new'] as const).map(t=>(
          <div key={t} onClick={()=>setTab(t)}
            style={{ padding:'8px 16px', fontSize:13, cursor:'pointer', color:tab===t?'#2a5cff':'#6b6860', borderBottom:tab===t?'2px solid #2a5cff':'2px solid transparent', marginBottom:-1, fontWeight:tab===t?500:400 }}>
            {t==='list' ? 'All Invoices' : 'New Invoice'}
          </div>
        ))}
      </div>

      {tab==='list' && (
        <Card>
          <Table heads={['Invoice','Client','Project','Period','Hours','Amount','Status','']} empty={invoices.length===0}>
            {invoices.map(inv=>(
              <tr key={inv.id}>
                <Td style={{ fontFamily:'DM Mono,monospace', fontSize:12 }}>{inv.invoice_number}</Td>
                <Td style={{ fontWeight:500 }}>{inv.client_name}</Td>
                <Td>{inv.project}</Td>
                <Td style={{ color:'#6b6860', fontSize:12 }}>{fmtDate(inv.period_from)} - {fmtDate(inv.period_to)}</Td>
                <Td>{inv.hours}h</Td>
                <Td style={{ fontWeight:500 }}>R {Number(inv.amount).toLocaleString()}</Td>
                <Td><Badge text={inv.status} type={STATUS_COLORS[inv.status]||'gray'} /></Td>
                <Td>
                  {inv.status==='Draft' && <Btn small onClick={()=>updateStatus(inv.id,'Sent')}>Mark Sent</Btn>}
                  {inv.status==='Sent' && <Btn small onClick={()=>updateStatus(inv.id,'Paid')}>Mark Paid</Btn>}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab==='new' && (
        <Card>
          <CardTitle>New Invoice</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <FormGroup label="Client Name *">
              <input style={inputStyle} value={client} onChange={e=>setClient(e.target.value)} placeholder="Client or company name" />
            </FormGroup>
            <FormGroup label="Project *">
              <select style={inputStyle} value={project} onChange={e=>setProject(e.target.value)}>
                <option value="">Select project</option>
                {projects.map(p=><option key={p}>{p}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Period From *">
              <input style={inputStyle} type="date" value={from} onChange={e=>setFrom(e.target.value)} />
            </FormGroup>
            <FormGroup label="Period To *">
              <input style={inputStyle} type="date" value={to} onChange={e=>setTo(e.target.value)} />
            </FormGroup>
            <FormGroup label="Hourly Rate (R) *">
              <input style={inputStyle} type="number" value={rate} onChange={e=>setRate(e.target.value)} placeholder="e.g. 850" />
            </FormGroup>
            <div style={{ display:'flex', alignItems:'flex-end' }}>
              <Btn onClick={calcPreview}>Preview Hours & Amount</Btn>
            </div>
            {preview && (
              <div style={{ gridColumn:'1/-1', background:'#eef1ff', borderRadius:8, padding:16, display:'flex', gap:32 }}>
                <div><div style={{ fontSize:11, color:'#6b6860', marginBottom:4 }}>HOURS LOGGED</div><div style={{ fontSize:22, fontWeight:600 }}>{preview.hours.toFixed(1)}h</div></div>
                <div><div style={{ fontSize:11, color:'#6b6860', marginBottom:4 }}>INVOICE AMOUNT</div><div style={{ fontSize:22, fontWeight:600 }}>R {preview.amount.toLocaleString()}</div></div>
              </div>
            )}
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Notes">
                <textarea style={{ ...inputStyle, resize:'vertical', minHeight:64 }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Payment terms, reference numbers, etc." />
              </FormGroup>
            </div>
          </div>
          <div style={{ marginTop:16, display:'flex', gap:10, alignItems:'center' }}>
            <Btn primary onClick={saveInvoice} disabled={saving}>{saving?'Creating...':'Create Invoice'}</Btn>
            {msg && <span style={{ fontSize:13, color: msg.includes('error')||msg.includes('Please') ? '#c0392b':'#1a7f5a' }}>{msg}</span>}
          </div>
        </Card>
      )}
    </div>
  )
}
