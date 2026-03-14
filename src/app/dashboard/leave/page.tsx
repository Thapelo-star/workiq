'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeaveRequest, LeaveBalance, Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

const LEAVE_TYPES = ['Annual','Sick','Family','Unpaid','Public Holiday','Other']
const STATUS_COLORS: Record<string,'amber'|'green'|'red'> = { Pending:'amber', Approved:'green', Rejected:'red' }

export default function LeavePage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [balance, setBalance] = useState<LeaveBalance|null>(null)
  const [tab, setTab] = useState<'list'|'apply'>('list')
  const [msg, setMsg] = useState('')

  const [leaveType, setLeaveType] = useState('Annual')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState('')

  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const elevated = prof && ['Manager','Executive','Admin'].includes(prof.role)
    let q = supabase.from('leave_requests').select('*, profiles(name)').order('created_at', { ascending:false })
    if (!elevated) q = q.eq('user_id', user.id)
    const { data } = await q; setRequests(data || [])
    const { data: bal } = await supabase.from('leave_balances').select('*').eq('user_id', user.id).single()
    setBalance(bal)
  }, [])

  useEffect(() => { load() }, [])

  function calcDays(from:string, to:string) {
    if (!from || !to) return 0
    const d1 = new Date(from), d2 = new Date(to)
    return Math.max(1, Math.round((d2.getTime()-d1.getTime())/(86400000))+1)
  }

  async function applyLeave() {
    if (!dateFrom || !dateTo) { setMsg('Please select dates.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const days = calcDays(dateFrom, dateTo)
    const { error } = await supabase.from('leave_requests').insert({
      user_id: user.id, leave_type: leaveType, date_from: dateFrom,
      date_to: dateTo, days, reason, status: 'Pending'
    })
    if (error) { setMsg(error.message); return }
    await supabase.from('notifications').insert({
      user_id: user.id, title:'Leave Application Submitted',
      body: leaveType + ' leave for ' + days + ' day(s) from ' + fmtDate(dateFrom) + ' is pending approval.',
      type:'info', link:'/dashboard/leave'
    })
    setMsg('Leave application submitted.'); setDateFrom(''); setDateTo(''); setReason(''); setTab('list')
    load(); setTimeout(() => setMsg(''), 4000)
  }

  async function reviewLeave(id:string, action:'Approved'|'Rejected') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const req = requests.find(r => r.id === id)
    await supabase.from('leave_requests').update({ status:action, reviewed_by:user.id, reviewed_at:new Date().toISOString() }).eq('id', id)
    if (req && action === 'Approved') {
      const existing = await supabase.from('leave_balances').select('*').eq('user_id', req.user_id).single()
      if (existing.data) {
        const field = req.leave_type === 'Sick' ? 'sick_used' : 'annual_used'
        await supabase.from('leave_balances').update({ [field]: (existing.data[field]||0) + req.days }).eq('user_id', req.user_id)
      } else {
        await supabase.from('leave_balances').insert({ user_id:req.user_id, annual_used: req.leave_type!=='Sick'?req.days:0, sick_used:req.leave_type==='Sick'?req.days:0 })
      }
      await supabase.from('notifications').insert({
        user_id: req.user_id, title:'Leave ' + action,
        body: req.leave_type + ' leave from ' + fmtDate(req.date_from) + ' to ' + fmtDate(req.date_to) + ' has been ' + action.toLowerCase() + '.',
        type: action==='Approved'?'success':'warning', link:'/dashboard/leave'
      })
    }
    load(); setMsg('Leave ' + action.toLowerCase() + '.'); setTimeout(() => setMsg(''), 3000)
  }

  async function setAllowance(uid:string, val:number) {
    await supabase.from('profiles').update({ leave_allowance:val }).eq('id', uid)
    const existing = await supabase.from('leave_balances').select('*').eq('user_id', uid).single()
    if (existing.data) await supabase.from('leave_balances').update({ annual_allowance:val }).eq('user_id', uid)
    else await supabase.from('leave_balances').insert({ user_id:uid, annual_allowance:val })
    load()
  }

  const allowance = me?.leave_allowance || balance?.annual_allowance || 21
  const annualUsed = balance?.annual_used || 0
  const sickUsed = balance?.sick_used || 0
  const remaining = allowance - annualUsed

  return (
    <div>
      <PageHeader title="Leave & Absence" subtitle="Apply for leave, track balances, and manage approvals." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13, fontWeight:500 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[['Annual Allowance', allowance+'d'],['Used (Annual)', annualUsed+'d'],['Remaining', remaining+'d'],['Sick Days Used', sickUsed+'d']].map(([l,v],i)=>(
          <div key={l} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background: i===2&&remaining<5 ? '#dc2626' : '#6366f1', borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'#9ca3af', marginBottom:10 }}>{l}</div>
            <div style={{ fontSize:32, fontWeight:700, fontFamily:'DM Mono,monospace', color: i===2&&remaining<5?'#dc2626':'#111827' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e5e7eb', marginBottom:20 }}>
        {(['list','apply'] as const).map(t=>(
          <div key={t} onClick={()=>setTab(t)}
            style={{ padding:'8px 18px', fontSize:13, cursor:'pointer', color:tab===t?'#6366f1':'#6b7280', borderBottom:tab===t?'2px solid #6366f1':'2px solid transparent', marginBottom:-1, fontWeight:tab===t?600:400 }}>
            {t==='list'?'Leave History':'Apply for Leave'}
          </div>
        ))}
      </div>

      {tab==='apply' && (
        <Card style={{ maxWidth:520, marginBottom:20 }}>
          <CardTitle>New Leave Application</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Leave Type">
                <select style={inputStyle} value={leaveType} onChange={e=>setLeaveType(e.target.value)}>
                  {LEAVE_TYPES.map(t=><option key={t}>{t}</option>)}
                </select>
              </FormGroup>
            </div>
            <FormGroup label="From Date"><input style={inputStyle} type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} /></FormGroup>
            <FormGroup label="To Date"><input style={inputStyle} type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} /></FormGroup>
            {dateFrom && dateTo && (
              <div style={{ gridColumn:'1/-1', background:'#eef2ff', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#6366f1', fontWeight:600 }}>
                {calcDays(dateFrom,dateTo)} day(s) selected
              </div>
            )}
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Reason (optional)">
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Brief reason for leave..." />
              </FormGroup>
            </div>
          </div>
          <div style={{ marginTop:16 }}><Btn primary onClick={applyLeave}>Submit Application</Btn></div>
        </Card>
      )}

      <Card>
        <Table heads={isElevated?['Person','Type','From','To','Days','Status','']:['Type','From','To','Days','Status']} empty={requests.length===0}>
          {requests.map(r=>(
            <tr key={r.id}>
              {isElevated && <Td style={{ fontWeight:500 }}>{(r.profiles as any)?.name||'—'}</Td>}
              <Td><Badge text={r.leave_type} type="gray" /></Td>
              <Td>{fmtDate(r.date_from)}</Td>
              <Td>{fmtDate(r.date_to)}</Td>
              <Td style={{ fontFamily:'DM Mono,monospace' }}>{r.days}d</Td>
              <Td><Badge text={r.status} type={STATUS_COLORS[r.status]||'gray'} /></Td>
              {isElevated && (
                <Td>
                  {r.status==='Pending' && (
                    <div style={{ display:'flex', gap:6 }}>
                      <Btn small primary onClick={()=>reviewLeave(r.id,'Approved')}>Approve</Btn>
                      <Btn small danger onClick={()=>reviewLeave(r.id,'Rejected')}>Reject</Btn>
                    </div>
                  )}
                </Td>
              )}
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
