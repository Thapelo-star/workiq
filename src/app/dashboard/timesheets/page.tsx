'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

function getMondayOf(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  return mon.toISOString().slice(0, 10)
}

const STATUS_COLORS: Record<string, 'gray' | 'blue' | 'green' | 'red'> = {
  Draft: 'gray',
  Submitted: 'blue',
  Approved: 'green',
  Rejected: 'red',
}

export default function TimesheetsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile | null>(null)
  const [sheets, setSheets] = useState<any[]>([])
  const [weekLogs, setWeekLogs] = useState<any[]>([])
  const [selectedWeek, setSelectedWeek] = useState(getMondayOf(new Date()))
  const [reviewNote, setReviewNote] = useState('')
  const [msg, setMsg] = useState('')

  const isElevated = !!me && ['Manager', 'Executive', 'Admin'].includes(me.role)

  const load = useCallback(async () => {
    setMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profErr) {
      console.error('profile error:', profErr)
      setMsg('Error loading your profile: ' + profErr.message)
      return
    }

    setMe(prof)

    const elevated = !!prof && ['Manager', 'Executive', 'Admin'].includes(prof.role)

    let q = supabase
      .from('timesheets')
      .select('*, requester:profiles!timesheets_user_id_fkey(id, name, role, team), reviewer:profiles!timesheets_reviewed_by_fkey(id, name, role, team)')
      .order('week_start', { ascending: false })

    if (!elevated) {
      q = q.eq('user_id', user.id)
    }

    const { data, error } = await q

    if (error) {
      console.error('timesheets load error:', error)
      setMsg('Error loading timesheets: ' + error.message)
      setSheets([])
      return
    }

    if (prof?.role === 'Manager') {
      const teamSheets = (data || []).filter((s: any) => s.requester?.team === prof.team || s.user_id === user.id)
      setSheets(teamSheets)
      return
    }

    setSheets(data || [])
  }, [supabase])

  const loadWeekLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const end = new Date(selectedWeek)
    end.setDate(end.getDate() + 6)

    const { data, error } = await supabase
      .from('time_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', selectedWeek)
      .lte('date', end.toISOString().slice(0, 10))
      .order('date')

    if (error) {
      console.error('week logs error:', error)
      setMsg('Error loading week logs: ' + error.message)
      setWeekLogs([])
      return
    }

    setWeekLogs(data || [])
  }, [selectedWeek, supabase])

  useEffect(() => {
    load()
    loadWeekLogs()
  }, [selectedWeek, load, loadWeekLogs])

  async function submitTimesheet() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !me) return

    const totalHours = weekLogs.reduce((s: number, l: any) => s + Number(l.hours), 0)
    const existing = sheets.find((s: any) => s.week_start === selectedWeek && s.user_id === user.id)

    if (existing) {
      const { error } = await supabase
        .from('timesheets')
        .update({
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
          total_hours: totalHours,
        })
        .eq('id', existing.id)

      if (error) {
        setMsg('Error submitting timesheet: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('timesheets')
        .insert({
          user_id: user.id,
          week_start: selectedWeek,
          status: 'Submitted',
          submitted_at: new Date().toISOString(),
          total_hours: totalHours,
        })

      if (error) {
        setMsg('Error submitting timesheet: ' + error.message)
        return
      }
    }

    await supabase.from('notifications').insert({
      user_id: user.id,
      title: 'Timesheet Submitted',
      body: 'Your timesheet for week of ' + fmtDate(selectedWeek) + ' (' + totalHours + 'h) has been submitted for approval.',
      type: 'info',
      link: '/dashboard/timesheets',
    })

    const { data: managers } = await supabase
      .from('profiles')
      .select('id')
      .eq('team', me.team)
      .eq('role', 'Manager')

    for (const manager of managers || []) {
      if (manager.id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: manager.id,
          title: 'Timesheet Pending Approval',
          body: me.name + ' submitted their timesheet for week of ' + fmtDate(selectedWeek) + ' (' + totalHours + 'h). Please review.',
          type: 'info',
          link: '/dashboard/timesheets',
        })
      }
    }

    const { data: admins } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'Admin')

    for (const admin of admins || []) {
      if (admin.id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: admin.id,
          title: 'Timesheet Pending',
          body: me.name + ' (' + me.team + ') submitted timesheet for ' + fmtDate(selectedWeek) + '.',
          type: 'info',
          link: '/dashboard/timesheets',
        })
      }
    }

    setMsg('Timesheet submitted. Your manager has been notified.')
    await load()
    setTimeout(() => setMsg(''), 4000)
  }

  async function reviewSheet(id: string, action: 'Approved' | 'Rejected') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sheet = sheets.find((s: any) => s.id === id)

    const { error } = await supabase
      .from('timesheets')
      .update({
        status: action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: reviewNote,
      })
      .eq('id', id)

    if (error) {
      setMsg('Error reviewing timesheet: ' + error.message)
      return
    }

    if (sheet) {
      await supabase.from('notifications').insert({
        user_id: sheet.user_id,
        title: 'Timesheet ' + action,
        body: 'Your timesheet for week of ' + fmtDate(sheet.week_start) + ' was ' + action.toLowerCase() + (reviewNote ? ': ' + reviewNote : '.'),
        type: action === 'Approved' ? 'success' : 'warning',
        link: '/dashboard/timesheets',
      })
    }

    setReviewNote('')
    await load()
    setMsg('Timesheet ' + action.toLowerCase() + '.')
    setTimeout(() => setMsg(''), 3000)
  }

  const currentSheet = sheets.find((s: any) => s.week_start === selectedWeek && me && s.user_id === me.id)
  const weekEnd = new Date(selectedWeek)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const totalHours = weekLogs.reduce((s: number, l: any) => s + Number(l.hours), 0)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedWeek)
    d.setDate(d.getDate() + i)
    return d.toISOString().slice(0, 10)
  })

  const pendingSheets = sheets.filter((s: any) => s.status === 'Submitted')

  return (
    <div>
      <PageHeader title="Timesheets" subtitle="Weekly time submissions and approval workflow." />

      {msg && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5',
            color: msg.startsWith('Error') ? '#dc2626' : '#059669',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          {msg}
        </div>
      )}

      {isElevated && pendingSheets.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: '#fef3c7',
            border: '1px solid rgba(217,119,6,0.3)',
            borderRadius: 10,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#d97706' }}>
              {pendingSheets.length} Timesheet{pendingSheets.length > 1 ? 's' : ''} Pending Approval
            </div>
            <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
              {pendingSheets
                .slice(0, 2)
                .map((s: any) => s.requester?.name || 'Unknown')
                .join(', ')}
              {pendingSheets.length > 2 ? ' + ' + (pendingSheets.length - 2) + ' more' : ''}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <CardTitle>My Timesheet</CardTitle>

          <div style={{ marginBottom: 16 }}>
            <FormGroup label="Select Week">
              <input
                style={inputStyle}
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(getMondayOf(new Date(e.target.value)))}
              />
            </FormGroup>

            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
              Week: {fmtDate(selectedWeek)} to {fmtDate(weekEnd.toISOString().slice(0, 10))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {days.map((day) => {
              const dayLogs = weekLogs.filter((l: any) => l.date === day)
              const dayHours = dayLogs.reduce((s: number, l: any) => s + Number(l.hours), 0)
              const dayName = new Date(day + 'T12:00:00').toLocaleDateString('en-ZA', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })

              return (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, width: 120 }}>{dayName}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: 'DM Mono,monospace',
                      color: dayHours === 0 ? '#9ca3af' : '#111827',
                      fontWeight: dayHours > 0 ? 600 : 400,
                    }}
                  >
                    {dayHours > 0 ? dayHours.toFixed(1) + 'h' : '-'}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {dayLogs.length} {dayLogs.length === 1 ? 'log' : 'logs'}
                  </span>
                </div>
              )
            })}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 700 }}>
              <span style={{ fontSize: 13 }}>Total</span>
              <span style={{ fontSize: 16, fontFamily: 'DM Mono,monospace', color: '#6366f1' }}>
                {totalHours.toFixed(1)}h
              </span>
            </div>
          </div>

          {currentSheet ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge text={currentSheet.status} type={STATUS_COLORS[currentSheet.status]} />
              {currentSheet.status === 'Submitted' && <span style={{ fontSize: 12, color: '#6b7280' }}>Awaiting manager review</span>}
              {currentSheet.status === 'Approved' && <span style={{ fontSize: 12, color: '#059669' }}>Approved by your manager</span>}
            </div>
          ) : (
            <Btn primary onClick={submitTimesheet} disabled={weekLogs.length === 0}>
              {weekLogs.length === 0 ? 'No logs this week - log time first' : 'Submit for Approval'}
            </Btn>
          )}

          {currentSheet?.reviewer_note && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: '#fef3c7', borderRadius: 8, fontSize: 13, color: '#92400e' }}>
              Manager note: {currentSheet.reviewer_note}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>{isElevated ? 'Pending & Recent Submissions' : 'My Submission History'}</CardTitle>

          {isElevated && (
            <div style={{ marginBottom: 12 }}>
              <FormGroup label="Review Note (optional - shown to employee)">
                <input
                  style={inputStyle}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Reason for rejection or approval note..."
                />
              </FormGroup>
            </div>
          )}

          <Table heads={['Week', 'Person', 'Hours', 'Status', '']} empty={sheets.length === 0}>
            {sheets.slice(0, 15).map((s: any) => (
              <tr key={s.id}>
                <Td style={{ fontSize: 12 }}>{fmtDate(s.week_start)}</Td>
                <Td style={{ fontWeight: 500, fontSize: 13 }}>{s.requester?.name || 'Me'}</Td>
                <Td style={{ fontFamily: 'DM Mono,monospace' }}>{s.total_hours}h</Td>
                <Td><Badge text={s.status} type={STATUS_COLORS[s.status]} /></Td>
                <Td>
                  {isElevated && s.status === 'Submitted' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn small primary onClick={() => reviewSheet(s.id, 'Approved')}>Approve</Btn>
                      <Btn small danger onClick={() => reviewSheet(s.id, 'Rejected')}>Reject</Btn>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}

