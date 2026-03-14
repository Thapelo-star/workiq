'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Timesheet, Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

function getMondayOf(d: Date) {
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon.toISOString().slice(0,10)
}

const STATUS_COLORS: Record<string,'gray'|'blue'|'green'|'red'|'amber'> = {
  Draft:'gray', Submitted:'blue', Approved:'green', Rejected:'red'
}

export default function TimesheetsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [sheets, setSheets] = useState<Timesheet[]>([])
  const [weekLogs, setWeekLogs] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState(getMondayOf(new Date()))
  const [reviewNote, setReviewNote] = useState('')
  const [msg, setMsg] = useState('')
  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const elevated = prof && ['Manager','Executive','Admin'].includes(prof.role)
    let q = supabase.from('timesheets').select('*, profiles(name,role)').order('week_start', { ascending:false })
    if (!elevated) q = q.eq('user_id', user.id)
    const { data } = await q
    setSheets(data || [])
  }, [])

  const loadWeekLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const end = new Date(selectedWeek)
    end.setDate(end.getDate() + 6)
    const { data } = await supabase.from('time_logs').select('*')
      .eq('user_id', user.id).gte('date', selectedWeek).lte('date', end.toISOString().slice(0,10))
      .order('date')
    setWeekLogs(data || [])
  }, [selectedWeek])

  useEffect(() => { load(); loadWeekLogs() }, [selectedWeek])

  async function submitTimesheet() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const totalHours = weekLogs.reduce((s:number,l:any) => s + Number(l.hours), 0)
    const existing = sheets.find(s => s.week_start === selectedWeek && s.user_id === user.id)
    if (existing) {
      await supabase.from('timesheets').update({ status:'Submitted', submitted_at: new Date().toISOString(), total_hours: totalHours }).eq('id', existing.id)
    } else {
      await supabase.from('timesheets').insert({ user_id: user.id, week_start: selectedWeek, status:'Submitted', submitted_at: new Date().toISOString(), total_hours: totalHours })
    }
    await supabase.from('notifications').insert({
      user_id: user.id, title:'Timesheet Submitted',
      body: 'Your timesheet for week of ' + fmtDate(selectedWeek) + ' has been submitted for approval.',
      type:'info', link:'/dashboard/timesheets'
    })
    setMsg('Timesheet submitted for approval.')
    load(); setTimeout(() => setMsg(''), 3000)
  }

  async function reviewSheet(id: string, action: 'Approved'|'Rejected') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const sheet = sheets.find(s => s.id === id)
    await supabase.from('timesheets').update({ status: action, reviewed_by: user.id, reviewed_at: new Date().toISOString(), reviewer_note: reviewNote }).eq('id', id)
    if (sheet) {
      await supabase.from('notifications').insert({
        user_id: sheet.user_id, title: 'Timesheet ' + action,
        body: 'Your timesheet for week of ' + fmtDate(sheet.week_start) + ' was ' + action.toLowerCase() + (reviewNote ? ': ' + reviewNote : '.'),
        type: action === 'Approved' ? 'success' : 'warning', link:'/dashboard/timesheets'
      })
    }
    setReviewNote(''); load()
    setMsg('Timesheet ' + action.toLowerCase() + '.')
    setTimeout(() => setMsg(''), 3000)
  }

  const currentSheet = sheets.find(s => s.week_start === selectedWeek && me && s.user_id === me.id)
  const weekEnd = new Date(selectedWeek); weekEnd.setDate(weekEnd.getDate() + 6)
  const totalHours = weekLogs.reduce((s:number,l:any) => s + Number(l.hours), 0)

  const days = Array.from({ length:7 }, (_, i) => {
    const d = new Date(selectedWeek); d.setDate(d.getDate() + i)
    return d.toISOString().slice(0,10)
  })

  return (
    <div>
      <PageHeader title="Timesheets" subtitle="Weekly time submissions and approval workflow." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13, fontWeight:500 }}>{msg}</div>}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
        <Card>
          <CardTitle>My Timesheet</CardTitle>
          <div style={{ marginBottom:16 }}>
            <FormGroup label="Select Week">
              <input style={inputStyle} type="date" value={selectedWeek}
                onChange={e => setSelectedWeek(getMondayOf(new Date(e.target.value)))} />
            </FormGroup>
            <div style={{ marginTop:8, fontSize:12, color:'#6b7280' }}>
              Week: {fmtDate(selectedWeek)} — {fmtDate(weekEnd.toISOString().slice(0,10))}
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            {days.map(day => {
              const dayLogs = weekLogs.filter((l:any) => l.date === day)
              const dayHours = dayLogs.reduce((s:number,l:any) => s + Number(l.hours), 0)
              const dayName = new Date(day).toLocaleDateString('en-ZA', { weekday:'short', day:'2-digit', month:'short' })
              return (
                <div key={day} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #f3f4f6' }}>
                  <span style={{ fontSize:13, color:'#374151', fontWeight:500, width:120 }}>{dayName}</span>
                  <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', color: dayHours === 0 ? '#9ca3af' : '#111827', fontWeight: dayHours > 0 ? 600 : 400 }}>
                    {dayHours > 0 ? dayHours.toFixed(1)+'h' : '—'}
                  </span>
                  <span style={{ fontSize:11, color:'#9ca3af' }}>{dayLogs.length} {dayLogs.length===1?'log':'logs'}</span>
                </div>
              )
            })}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', fontWeight:700 }}>
              <span style={{ fontSize:13 }}>Total</span>
              <span style={{ fontSize:16, fontFamily:'DM Mono,monospace', color:'#6366f1' }}>{totalHours.toFixed(1)}h</span>
            </div>
          </div>

          {currentSheet ? (
            <Badge text={currentSheet.status} type={STATUS_COLORS[currentSheet.status]} />
          ) : (
            <Btn primary onClick={submitTimesheet} disabled={weekLogs.length === 0}>
              {weekLogs.length === 0 ? 'No logs this week' : 'Submit for Approval'}
            </Btn>
          )}
          {currentSheet?.reviewer_note && (
            <div style={{ marginTop:12, padding:'10px 12px', background:'#fef3c7', borderRadius:8, fontSize:13, color:'#92400e' }}>
              Manager note: {currentSheet.reviewer_note}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{isElevated ? 'All Submissions' : 'My History'}</CardTitle>
          <Table heads={['Week','Person','Hours','Status','']} empty={sheets.length===0}>
            {sheets.slice(0,12).map(s => (
              <tr key={s.id}>
                <Td style={{ fontSize:12 }}>{fmtDate(s.week_start)}</Td>
                <Td style={{ fontWeight:500 }}>{(s.profiles as any)?.name || 'Me'}</Td>
                <Td style={{ fontFamily:'DM Mono,monospace' }}>{s.total_hours}h</Td>
                <Td><Badge text={s.status} type={STATUS_COLORS[s.status]} /></Td>
                <Td>
                  {isElevated && s.status === 'Submitted' && (
                    <div style={{ display:'flex', gap:6 }}>
                      <Btn small primary onClick={() => reviewSheet(s.id,'Approved')}>Approve</Btn>
                      <Btn small danger onClick={() => reviewSheet(s.id,'Rejected')}>Reject</Btn>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          {isElevated && (
            <div style={{ marginTop:12 }}>
              <FormGroup label="Review Note (optional)">
                <input style={inputStyle} value={reviewNote} onChange={e=>setReviewNote(e.target.value)} placeholder="Reason for rejection or approval note..." />
              </FormGroup>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
