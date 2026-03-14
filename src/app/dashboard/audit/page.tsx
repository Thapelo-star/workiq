'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle, PageHeader, FormGroup, inputStyle, Badge } from '@/components/ui'

type AuditEntry = {
  id: string
  time: string
  user: string
  action: string
  module: string
  detail: string
  type: 'create'|'update'|'delete'|'auth'|'review'
}

const TYPE_COLORS: Record<string,'green'|'blue'|'red'|'amber'|'purple'> = {
  create:'green', update:'blue', delete:'red', auth:'purple', review:'amber'
}

export default function AuditPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterModule, setFilterModule] = useState('All')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const from = filterFrom || new Date(Date.now()-30*86400000).toISOString().slice(0,10)
    const to = filterTo ? filterTo+'T23:59:59Z' : new Date().toISOString()

    const [logs, decisions, leaves, timesheets, exceptions, compliance, invoices] = await Promise.all([
      supabase.from('time_logs').select('id,created_at,user_id,project,task,hours,profiles(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(100),
      supabase.from('decisions').select('id,created_at,created_by,title,type,status,completed_at,profiles(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(50),
      supabase.from('leave_requests').select('id,created_at,user_id,leave_type,days,status,profiles(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(50),
      supabase.from('timesheets').select('id,created_at,user_id,week_start,status,submitted_at,profiles(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(50),
      supabase.from('exceptions').select('id,created_at,reported_by,title,severity,status,reported:profiles!exceptions_reported_by_fkey(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(50),
      supabase.from('compliance_items').select('id,created_at,created_by,title,risk_level,status,profiles(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(50),
      supabase.from('invoices').select('id,created_at,created_by,invoice_number,client_name,amount,status,profiles(name)').gte('created_at',from).lte('created_at',to).order('created_at',{ascending:false}).limit(50),
    ])

    const all: AuditEntry[] = []

    ;(logs.data||[]).forEach((l:any) => all.push({ id:'tl-'+l.id, time:l.created_at, user:l.profiles?.name||'Unknown', action:'Logged time', module:'Time', detail:l.hours+'h on '+l.project+' — '+l.task?.slice(0,60), type:'create' }))
    ;(decisions.data||[]).forEach((d:any) => all.push({ id:'dc-'+d.id, time:d.created_at, user:d.profiles?.name||'Unknown', action:'Created '+d.type, module:'Decisions', detail:d.title, type:'create' }))
    ;(leaves.data||[]).forEach((l:any) => all.push({ id:'lv-'+l.id, time:l.created_at, user:l.profiles?.name||'Unknown', action:'Leave request', module:'Leave', detail:l.leave_type+' — '+l.days+'d — '+l.status, type:'create' }))
    ;(timesheets.data||[]).forEach((t:any) => all.push({ id:'ts-'+t.id, time:t.submitted_at||t.created_at, user:t.profiles?.name||'Unknown', action:'Timesheet '+t.status, module:'Timesheets', detail:'Week of '+t.week_start+' — '+t.status, type: t.status==='Approved'?'review':t.status==='Rejected'?'delete':'update' }))
    ;(exceptions.data||[]).forEach((e:any) => all.push({ id:'ex-'+e.id, time:e.created_at, user:e.reported?.name||'Unknown', action:'Exception logged', module:'Exceptions', detail:e.severity+' — '+e.title, type:e.severity==='Critical'||e.severity==='High'?'delete':'create' }))
    ;(compliance.data||[]).forEach((c:any) => all.push({ id:'co-'+c.id, time:c.created_at, user:c.profiles?.name||'Unknown', action:'Compliance item', module:'Compliance', detail:c.risk_level+' risk — '+c.title, type:'create' }))
    ;(invoices.data||[]).forEach((i:any) => all.push({ id:'in-'+i.id, time:i.created_at, user:i.profiles?.name||'Unknown', action:'Invoice '+i.status, module:'Invoicing', detail:i.invoice_number+' — '+i.client_name+' — R '+Number(i.amount).toLocaleString(), type:'create' }))

    all.sort((a,b) => b.time.localeCompare(a.time))
    setEntries(all)
    setLoading(false)
  }, [filterFrom, filterTo])

  useEffect(() => { load() }, [filterFrom, filterTo])

  const modules = ['All', ...Array.from(new Set(entries.map(e=>e.module)))]
  const filtered = entries.filter(e => filterModule === 'All' || e.module === filterModule)

  function fmtTime(t: string) {
    const d = new Date(t)
    return d.toLocaleDateString('en-ZA',{day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})
  }

  return (
    <div>
      <PageHeader title="Audit Reporting" subtitle="Full activity trail across all modules — last 30 days by default." />

      <Card style={{ marginBottom:20, padding:'14px 20px' }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <FormGroup label="From">
            <input style={{ ...inputStyle, width:160 }} type="date" value={filterFrom} onChange={e=>{setFilterFrom(e.target.value)}} />
          </FormGroup>
          <FormGroup label="To">
            <input style={{ ...inputStyle, width:160 }} type="date" value={filterTo} onChange={e=>{setFilterTo(e.target.value)}} />
          </FormGroup>
          <FormGroup label="Module">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {modules.map(m => (
                <button key={m} onClick={()=>setFilterModule(m)}
                  style={{ fontFamily:'inherit', fontSize:12, fontWeight:filterModule===m?700:500, padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer',
                    background: filterModule===m ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f4f6fb',
                    color: filterModule===m ? '#fff' : '#6b7280' }}>
                  {m}
                </button>
              ))}
            </div>
          </FormGroup>
        </div>
      </Card>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          ['Total Events', filtered.length, '#6366f1'],
          ['Time Logs', filtered.filter(e=>e.module==='Time').length, '#0ea5e9'],
          ['Decisions', filtered.filter(e=>e.module==='Decisions').length, '#7c3aed'],
          ['Exceptions', filtered.filter(e=>e.module==='Exceptions').length, '#dc2626'],
        ].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'14px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:6 }}>{l}</div>
            <div style={{ fontSize:24, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ textAlign:'center', padding:48, color:'#a0a8c0', fontSize:13 }}>Loading audit trail...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:48, color:'#a0a8c0', fontSize:13 }}>No activity in this period.</div>
        ) : (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'140px 120px 100px 1fr', gap:0, padding:'8px 14px', borderBottom:'2px solid #e8eaf2', background:'#f8f9fc' }}>
              {['Time','User','Module','Action & Detail'].map(h => (
                <div key={h} style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#6366f1' }}>{h}</div>
              ))}
            </div>
            {filtered.map((e,i) => (
              <div key={e.id} style={{ display:'grid', gridTemplateColumns:'140px 120px 100px 1fr', gap:0, padding:'10px 14px', borderBottom:'1px solid #f0f2f8', background:i%2===0?'#fff':'#fafbff', alignItems:'center' }}>
                <div style={{ fontSize:11, fontFamily:'DM Mono,monospace', color:'#9ca3af' }}>{fmtTime(e.time)}</div>
                <div style={{ fontSize:12, fontWeight:500, color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.user}</div>
                <div><Badge text={e.module} type={TYPE_COLORS[e.type]||'gray'} /></div>
                <div>
                  <span style={{ fontSize:12, fontWeight:600, color:'#374151', marginRight:6 }}>{e.action}</span>
                  <span style={{ fontSize:12, color:'#6b7280' }}>{e.detail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
