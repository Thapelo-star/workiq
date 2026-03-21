'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LeaveRequest, LeaveBalance, Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

const LEAVE_TYPES = ['Annual','Sick','Family','Unpaid','Public Holiday','Other']
const STATUS_COLORS: Record<string,'amber'|'green'|'red'> = { Pending:'amber', Approved:'green', Rejected:'red' }

export default function LeavePage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [myRequests, setMyRequests] = useState<LeaveRequest[]>([])
  const [teamRequests, setTeamRequests] = useState<any[]>([])
  const [balance, setBalance] = useState<LeaveBalance|null>(null)
  const [tab, setTab] = useState<'my'|'apply'|'team'>('my')
  const [msg, setMsg] = useState('')
  const [leaveType, setLeaveType] = useState('Annual')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setMe(prof)

      // My own leave
      const { data: myLeave } = await supabase.from('leave_requests')
        .select('*').eq('user_id', user.id).order('created_at', { ascending:false })
      setMyRequests(myLeave || [])

      // Balance
      const { data: bal } = await supabase.from('leave_balances').select('*').eq('user_id', user.id).single()
      setBalance(bal)

      // Team requests based on role/team
      const isAdmin = prof?.role === 'Admin'
      const isExecutive = prof?.role === 'Executive' || prof?.team === 'Executive'
      const isAdminDept = prof?.team === 'Admin Department'
      const isManager = prof?.role === 'Manager'

      if (isAdmin || isExecutive || isAdminDept) {
        // See ALL leave requests
        const { data: all } = await supabase.from('leave_requests')
          .select('*, profiles(name, team, role)')
          .order('created_at', { ascending:false })
        setTeamRequests(all || [])
      } else if (isManager) {
        // See only their team's leave
        const { data: all } = await supabase.from('leave_requests')
          .select('*, profiles(name, team, role)')
          .order('created_at', { ascending:false })
        const filtered = (all || []).filter((l:any) => l.profiles?.team === prof?.team)
        setTeamRequests(filtered)
      }
    }
    init()
  }, [])

  function calcDays(from: string, to: string) {
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
      user_id: user.id, leave_type: leaveType,
      date_from: dateFrom, date_to: dateTo,
      days, reason, status: 'Pending',
    })
    if (error) { setMsg('Error: ' + error.message); return }
    await supabase.from('notifications').insert({
      user_id: user.id, title: 'Leave Application Submitted',
      body: leaveType + ' leave for ' + days + ' day(s) from ' + fmtDate(dateFrom) + ' is pending approval.',
      type: 'info', link: '/dashboard/leave'
    })
    setMsg('Leave application submitted.')
    setDateFrom(''); setDateTo(''); setReason('')
    const { data: myLeave } = await supabase.from('leave_requests')
      .select('*').eq('user_id', user.id).order('created_at', { ascending:false })
    setMyRequests(myLeave || [])
    setTab('my')
    setTimeout(() => setMsg(''), 4000)
  }

  async function reviewLeave(id: string, action: 'Approved'|'Rejected') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const req = teamRequests.find(r => r.id === id)
    await supabase.from('leave_requests').update({
      status: action, reviewed_by: user.id, reviewed_at: new Date().toISOString()
    }).eq('id', id)
    if (req && action === 'Approved') {
      const { data: existing } = await supabase.from('leave_balances').select('*').eq('user_id', req.user_id).single()
      const field = req.leave_type === 'Sick' ? 'sick_used' : 'annual_used'
      if (existing) {
        await supabase.from('leave_balances').update({ [field]: (existing[field]||0) + req.days }).eq('user_id', req.user_id)
      } else {
        await supabase.from('leave_balances').insert({
          user_id: req.user_id,
          annual_used: req.leave_type !== 'Sick' ? req.days : 0,
          sick_used: req.leave_type === 'Sick' ? req.days : 0
        })
      }
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title: 'Leave ' + action,
        body: req.leave_type + ' leave from ' + fmtDate(req.date_from) + ' to ' + fmtDate(req.date_to) + ' has been ' + action.toLowerCase() + '.',
        type: action === 'Approved' ? 'success' : 'warning',
        link: '/dashboard/leave'
      })
    }
    setMsg('Leave ' + action.toLowerCase() + '.')
    const { data: updated } = await supabase.from('leave_requests')
      .select('*, profiles(name, team, role)').order('created_at', { ascending:false })
    const isAdmin = me?.role === 'Admin'
    const isExecutive = me?.role === 'Executive' || me?.team === 'Executive'
    const isAdminDept = me?.team === 'Admin Department'
    const isManager = me?.role === 'Manager'
    if (isAdmin || isExecutive || isAdminDept) {
      setTeamRequests(updated || [])
    } else if (isManager) {
      setTeamRequests((updated || []).filter((l:any) => l.profiles?.team === me?.team))
    }
    setTimeout(() => setMsg(''), 3000)
  }

  const allowance = me?.leave_allowance || balance?.annual_allowance || 21
  const annualUsed = balance?.annual_used || 0
  const sickUsed = balance?.sick_used || 0
  const remaining = allowance - annualUsed

  const isAdmin = me?.role === 'Admin'
  const isExecutive = me?.role === 'Executive' || me?.team === 'Executive'
  const isAdminDept = me?.team === 'Admin Department'
  const isManager = me?.role === 'Manager'
  const canApprove = isAdmin || isExecutive || isManager
  const canViewTeam = isAdmin || isExecutive || isAdminDept || isManager
  const viewOnly = isAdminDept && !canApprove

  const teamLabel = (() => {
    if (isAdmin || isExecutive) return 'All Leave Requests'
    if (isAdminDept) return 'All Leave Requests (View Only)'
    if (isManager) return me?.team + ' ? Leave Requests'
    return 'Team Requests'
  })()

  return (
    <div>
      <PageHeader title="Leave & Absence" subtitle="Apply for leave, track your balance, and manage approvals." />
      {msg && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8,
          background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5',
          color: msg.startsWith('Error') ? '#dc2626' : '#059669', fontSize:13, fontWeight:500 }}>
          {msg}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          ['Annual Allowance', allowance+'d', '#6366f1'],
          ['Used (Annual)', annualUsed+'d', '#d97706'],
          ['Remaining', remaining+'d', remaining<5?'#dc2626':'#059669'],
          ['Sick Days Used', sickUsed+'d', '#7c3aed'],
        ].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:10 }}>{l}</div>
            <div style={{ fontSize:32, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:2, borderBottom:'1px solid #e8eaf2', marginBottom:20 }}>
        {[
          { key:'my', label:'My Leave History' },
          { key:'apply', label:'Apply for Leave' },
          ...(canViewTeam ? [{ key:'team', label: isManager ? (me?.team + ' Requests') : 'All Requests' }] : []),
        ].map(t => (
          <div key={t.key} onClick={() => setTab(t.key as any)}
            style={{ padding:'8px 18px', fontSize:13, cursor:'pointer',
              color: tab===t.key ? '#6366f1' : '#6b7280',
              borderBottom: tab===t.key ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom:-1, fontWeight: tab===t.key ? 600 : 400 }}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'my' && (
        <Card>
          <CardTitle>My Leave History</CardTitle>
          {myRequests.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#a0a8c0', fontSize:13 }}>
              No leave applications yet. Click Apply for Leave to submit one.
            </div>
          ) : (
            <Table heads={['Type','From','To','Days','Status']} empty={false}>
              {myRequests.map(r => (
                <tr key={r.id}>
                  <Td><Badge text={r.leave_type} type="gray" /></Td>
                  <Td>{fmtDate(r.date_from)}</Td>
                  <Td>{fmtDate(r.date_to)}</Td>
                  <Td style={{ fontFamily:'DM Mono,monospace' }}>{r.days}d</Td>
                  <Td><Badge text={r.status} type={STATUS_COLORS[r.status]||'gray'} /></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}

      {tab === 'apply' && (
        <Card style={{ maxWidth:520 }}>
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
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Brief reason..." />
              </FormGroup>
            </div>
          </div>
          <div style={{ marginTop:16 }}><Btn primary onClick={applyLeave}>Submit Application</Btn></div>
        </Card>
      )}

      {tab === 'team' && canViewTeam && (
        <Card>
          <CardTitle>{teamLabel}</CardTitle>
          {viewOnly && (
            <div style={{ marginBottom:12, padding:'8px 14px', background:'#fef3c7', borderRadius:8, fontSize:12, color:'#92400e' }}>
              View only ? Admin Department can see all requests but cannot approve or reject.
            </div>
          )}
          {teamRequests.length === 0 ? (
            <div style={{ textAlign:'center', padding:40, color:'#a0a8c0', fontSize:13 }}>No leave requests found.</div>
          ) : (
            <Table heads={['Person','Department','Type','From','To','Days','Status','']} empty={false}>
              {teamRequests.map(r => (
                <tr key={r.id}>
                  <Td style={{ fontWeight:500 }}>{(r.profiles as any)?.name||'?'}</Td>
                  <Td style={{ fontSize:12, color:'#6b7280' }}>{(r.profiles as any)?.team||'?'}</Td>
                  <Td><Badge text={r.leave_type} type="gray" /></Td>
                  <Td style={{ fontSize:12 }}>{fmtDate(r.date_from)}</Td>
                  <Td style={{ fontSize:12 }}>{fmtDate(r.date_to)}</Td>
                  <Td style={{ fontFamily:'DM Mono,monospace' }}>{r.days}d</Td>
                  <Td><Badge text={r.status} type={STATUS_COLORS[r.status]||'gray'} /></Td>
                  <Td>
                    {canApprove && r.status === 'Pending' && (
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn small primary onClick={()=>reviewLeave(r.id,'Approved')}>Approve</Btn>
                        <Btn small danger onClick={()=>reviewLeave(r.id,'Rejected')}>Reject</Btn>
                      </div>
                    )}
                    {viewOnly && (
                      <span style={{ fontSize:11, color:'#a0a8c0', fontStyle:'italic' }}>view only</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}
