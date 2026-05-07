'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLog, Category, CATEGORIES, Profile } from '@/lib/types'
import { fmtDate, todayStr } from '@/lib/kpi'
import { Card, CardTitle, PageHeader, Btn, Badge, Table, Td, FormGroup, inputStyle } from '@/components/ui'

function splitStoredHours(total: number) {
  const totalMinutes = Math.round(Number(total || 0) * 60)
  const wholeHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return {
    hours: String(wholeHours),
    minutes: String(minutes),
  }
}

function buildStoredHours(hoursText: string, minutesText: string) {
  const hrs = parseInt(hoursText || '0', 10) || 0
  const mins = parseInt(minutesText || '0', 10) || 0
  return Number((hrs + (mins / 60)).toFixed(4))
}

function formatDuration(total: number) {
  const totalMinutes = Math.round(Number(total || 0) * 60)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  return mins > 0 ? `${hrs}h ${String(mins).padStart(2, '0')}m` : `${hrs}h`
}

export default function TimePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  const [editingId, setEditingId] = useState('')

  const [date, setDate] = useState(todayStr())
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('0')
  const [project, setProject] = useState('')
  const [category, setCategory] = useState<Category | ''>('')
  const [task, setTask] = useState('')
  const [notes, setNotes] = useState('')

  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fCat, setFCat] = useState('')
  const [fProj, setFProj] = useState('')

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }, [supabase])

  const fetchLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()

    let q = supabase
      .from('time_logs')
      .select('*, profiles(name)')
      .order('date', { ascending: false })
      .limit(300)

    if (prof?.role === 'Employee') q = q.eq('user_id', user.id)
    if (fFrom) q = q.gte('date', fFrom)
    if (fTo) q = q.lte('date', fTo)
    if (fCat) q = q.eq('category', fCat)

    const { data } = await q
    let result: TimeLog[] = data || []

    if (fProj) {
      result = result.filter(l => l.project.toLowerCase().includes(fProj.toLowerCase()))
    }

    setLogs(result)
  }, [supabase, fFrom, fTo, fCat, fProj])

  useEffect(() => {
    fetchProfile()
    fetchLogs()
  }, [fetchProfile, fetchLogs])

  function resetForm() {
    setEditingId('')
    setDate(todayStr())
    setHours('')
    setMinutes('0')
    setProject('')
    setCategory('')
    setTask('')
    setNotes('')
    setMsg('')
  }

  function startEdit(log: TimeLog) {
    const split = splitStoredHours(log.hours)
    setEditingId(log.id)
    setDate(log.date)
    setHours(split.hours)
    setMinutes(split.minutes)
    setProject(log.project)
    setCategory(log.category)
    setTask(log.task)
    setNotes(log.notes || '')
    setMsg('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveLog() {
    if (!date || !project || !category || !task) {
      setMsg('Please fill in all required fields.')
      setMsgType('err')
      return
    }

    const hrs = parseInt(hours || '0', 10) || 0
    const mins = parseInt(minutes || '0', 10) || 0

    if (hrs === 0 && mins === 0) {
      setMsg('Please enter a duration greater than zero.')
      setMsgType('err')
      return
    }

    if (mins < 0 || mins > 59) {
      setMsg('Minutes must be between 0 and 59.')
      setMsgType('err')
      return
    }

    const totalHours = buildStoredHours(hours, minutes)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setLoading(true)

    let error = null

    if (editingId) {
      const result = await supabase
        .from('time_logs')
        .update({
          date,
          project,
          task,
          category,
          hours: totalHours,
          notes,
        })
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('time_logs')
        .insert({
          user_id: user.id,
          date,
          project,
          task,
          category,
          hours: totalHours,
          notes,
        })

      error = result.error
    }

    setLoading(false)

    if (error) {
      setMsg(error.message)
      setMsgType('err')
    } else {
      setMsg(editingId ? 'Log updated successfully.' : 'Log saved successfully.')
      setMsgType('ok')
      resetForm()
      fetchLogs()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function deleteLog(id: string) {
    if (!confirm('Delete this time log?')) return
    await supabase.from('time_logs').delete().eq('id', id)

    if (editingId === id) {
      resetForm()
    }

    fetchLogs()
  }

  const canManage = (log: TimeLog) => profile?.role !== 'Executive'

  return (
    <div>
      <PageHeader
        title="Time Capture"
        subtitle="Log your work hours against projects and categories."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '390px 1fr', gap: 20, alignItems: 'start' }}>
        <Card>
          <CardTitle>{editingId ? 'Edit Time Log' : 'Add Time Log'}</CardTitle>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormGroup label="Date *">
              <input
                style={inputStyle}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </FormGroup>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', marginBottom: 6 }}>Duration *</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  max="24"
                  step="1"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  placeholder="Hours"
                />
                <input
                  style={inputStyle}
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  value={minutes}
                  onChange={e => setMinutes(e.target.value)}
                  placeholder="Minutes"
                />
              </div>
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <FormGroup label="Project *">
                <input
                  style={inputStyle}
                  value={project}
                  onChange={e => setProject(e.target.value)}
                  placeholder="e.g. Alpha Platform"
                />
              </FormGroup>
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <FormGroup label="Category *">
                <select
                  style={inputStyle}
                  value={category}
                  onChange={e => setCategory(e.target.value as Category)}
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormGroup>
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <FormGroup label="Task Description *">
                <input
                  style={inputStyle}
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder="What did you work on?"
                />
              </FormGroup>
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <FormGroup label="Notes (optional)">
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional context..."
                />
              </FormGroup>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Btn primary onClick={saveLog} disabled={loading}>
              {loading ? (editingId ? 'Updating...' : 'Saving...') : (editingId ? 'Update Log' : 'Save Log')}
            </Btn>
            <Btn onClick={resetForm}>
              {editingId ? 'Cancel Edit' : 'Clear'}
            </Btn>
          </div>

          {msg && (
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: msgType === 'ok' ? '#1a7f5a' : '#c0392b',
                padding: '6px 10px',
                borderRadius: 6,
                background: msgType === 'ok' ? '#e6f4ee' : '#fdecea'
              }}
            >
              {msg}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Log History</CardTitle>

          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <FormGroup label="From">
              <input
                style={{ ...inputStyle, width: 130 }}
                type="date"
                value={fFrom}
                onChange={e => setFFrom(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="To">
              <input
                style={{ ...inputStyle, width: 130 }}
                type="date"
                value={fTo}
                onChange={e => setFTo(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="Category">
              <select
                style={{ ...inputStyle, width: 170 }}
                value={fCat}
                onChange={e => setFCat(e.target.value)}
              >
                <option value="">All</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </FormGroup>

            <FormGroup label="Project">
              <input
                style={{ ...inputStyle, width: 150 }}
                value={fProj}
                onChange={e => setFProj(e.target.value)}
                placeholder="All"
              />
            </FormGroup>

            <div style={{ marginTop: 'auto' }}>
              <Btn primary onClick={fetchLogs}>Filter</Btn>
            </div>
          </div>

          <Table heads={['Date', 'Project', 'Category', 'Task', 'Duration', '']} empty={logs.length === 0}>
            {logs.map(l => (
              <tr key={l.id}>
                <Td>{fmtDate(l.date)}</Td>
                <Td>{l.project}</Td>
                <Td><Badge text={l.category} /></Td>
                <Td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.task}</Td>
                <Td style={{ fontWeight: 500 }}>{formatDuration(l.hours)}</Td>
                <Td>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {canManage(l) && <Btn small onClick={() => startEdit(l)}>Edit</Btn>}
                    {canManage(l) && <Btn small onClick={() => deleteLog(l.id)}>Delete</Btn>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </div>
  )
}

