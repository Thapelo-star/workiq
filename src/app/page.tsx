'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLog, Profile } from '@/lib/types'
import { fmtDate, todayStr } from '@/lib/kpi'
import {
  Card,
  CardTitle,
  PageHeader,
  Btn,
  Badge,
  Table,
  Td,
  FormGroup,
  inputStyle
} from '@/components/ui'

type ManagedCategory = {
  id: string
  name: string
  active: boolean
  sort_order: number
}

type ManagedProject = {
  id: string
  name: string
  active: boolean
  sort_order: number
}

function splitStoredHours(total: number) {
  const totalMinutes = Math.round(Number(total || 0) * 60)

  return {
    hours: String(Math.floor(totalMinutes / 60)),
    minutes: String(totalMinutes % 60),
  }
}

function buildStoredHours(hoursText: string, minutesText: string) {
  const hrs = parseInt(hoursText || '0', 10) || 0
  const mins = parseInt(minutesText || '0', 10) || 0

  return Number((hrs + mins / 60).toFixed(4))
}

function formatDuration(total: number) {
  const totalMinutes = Math.round(Number(total || 0) * 60)
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`

  return `${hrs}h ${String(mins).padStart(2, '0')}m`
}

function displayCategory(log: TimeLog) {
  if (log.category === 'Other' && log.custom_category?.trim()) {
    return log.custom_category.trim()
  }

  return log.category
}

function StatCard(props: {
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e6ebf3',
        borderRadius: 16,
        padding: '16px 18px',
        boxShadow: '0 4px 14px rgba(20,27,45,0.04)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: props.color,
        }}
      />

      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#98a2b3',
          marginBottom: 8,
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          fontFamily: 'DM Mono,monospace',
          color: '#141b2d',
        }}
      >
        {props.value}
      </div>

      {props.sub && (
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 7 }}>
          {props.sub}
        </div>
      )}
    </div>
  )
}

export default function TimePage() {
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)

  const [logs, setLogs] = useState<TimeLog[]>([])
  const [categories, setCategories] = useState<ManagedCategory[]>([])
  const [projects, setProjects] = useState<ManagedProject[]>([])

  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  const [editingId, setEditingId] = useState('')

  const [date, setDate] = useState(todayStr())
  const [hours, setHours] = useState('')
  const [minutes, setMinutes] = useState('0')

  const [projectChoice, setProjectChoice] = useState('')
  const [customProject, setCustomProject] = useState('')

  const [categoryChoice, setCategoryChoice] = useState('')
  const [customCategory, setCustomCategory] = useState('')

  const [notes, setNotes] = useState('')

  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fCat, setFCat] = useState('')
  const [fProj, setFProj] = useState('')

  const fetchReferenceData = useCallback(async () => {
    const [categoryResult, projectResult] = await Promise.all([
      supabase
        .from('time_categories')
        .select('*')
        .eq('active', true)
        .order('sort_order')
        .order('name'),

      supabase
        .from('time_projects')
        .select('*')
        .eq('active', true)
        .order('sort_order')
        .order('name'),
    ])

    setCategories(categoryResult.data || [])
    setProjects(projectResult.data || [])
  }, [supabase])

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    setProfile(data)
  }, [supabase])

  const fetchLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const { data: prof } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    let q = supabase
      .from('time_logs')
      .select('*, profiles(name,role,team)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000)

    if (prof?.role === 'Employee') {
      q = q.eq('user_id', user.id)
    }

    if (fFrom) q = q.gte('date', fFrom)
    if (fTo) q = q.lte('date', fTo)

    if (fCat) {
      if (fCat === '__custom__') {
        q = q.eq('category', 'Other')
      } else {
        q = q.eq('category', fCat)
      }
    }

    const { data } = await q

    let result: TimeLog[] = data || []

    if (fProj) {
      result = result.filter(log =>
        (log.project || '').toLowerCase().includes(fProj.toLowerCase())
      )
    }

    setLogs(result)
  }, [supabase, fFrom, fTo, fCat, fProj])

  useEffect(() => {
    fetchProfile()
    fetchReferenceData()
  }, [fetchProfile, fetchReferenceData])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function setQuickDuration(totalMinutes: number) {
    setHours(String(Math.floor(totalMinutes / 60)))
    setMinutes(String(totalMinutes % 60))
  }

  function resetForm() {
    setEditingId('')
    setDate(todayStr())
    setHours('')
    setMinutes('0')
    setProjectChoice('')
    setCustomProject('')
    setCategoryChoice('')
    setCustomCategory('')
    setNotes('')
    setMsg('')
  }

  function startEdit(log: TimeLog) {
    const split = splitStoredHours(log.hours)

    setEditingId(log.id)
    setDate(log.date)
    setHours(split.hours)
    setMinutes(split.minutes)

    const projectExists = projects.some(p => p.name === log.project)

    if (projectExists) {
      setProjectChoice(log.project)
      setCustomProject('')
    } else {
      setProjectChoice('__new__')
      setCustomProject(log.project || '')
    }

    const categoryExists = categories.some(c => c.name === log.category)

    if (log.category === 'Other') {
      setCategoryChoice('Other')
      setCustomCategory(log.custom_category || '')
    } else if (categoryExists) {
      setCategoryChoice(log.category)
      setCustomCategory('')
    } else {
      setCategoryChoice('Other')
      setCustomCategory(log.category || '')
    }

    setNotes(log.notes || '')
    setMsg('')

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveLog() {
    setMsg('')

    const hrs = parseInt(hours || '0', 10) || 0
    const mins = parseInt(minutes || '0', 10) || 0

    if (!date) {
      setMsg('Please select a date.')
      setMsgType('err')
      return
    }

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

    if (!projectChoice) {
      setMsg('Please select a project.')
      setMsgType('err')
      return
    }

    if (projectChoice === '__new__' && !customProject.trim()) {
      setMsg('Please enter the new project name.')
      setMsgType('err')
      return
    }

    if (!categoryChoice) {
      setMsg('Please select a category.')
      setMsgType('err')
      return
    }

    if (categoryChoice === 'Other' && !customCategory.trim()) {
      setMsg('Please enter an additional category.')
      setMsgType('err')
      return
    }

    const actualProject =
      projectChoice === '__new__'
        ? customProject.trim()
        : projectChoice

    const actualCategory =
      categoryChoice === 'Other'
        ? 'Other'
        : categoryChoice

    const totalHours = buildStoredHours(hours, minutes)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    const hiddenTask =
      notes.trim() ||
      (categoryChoice === 'Other'
        ? customCategory.trim()
        : categoryChoice)

    const payload = {
      date,
      project: actualProject,
      category: actualCategory,
      custom_category:
        categoryChoice === 'Other'
          ? customCategory.trim()
          : null,
      hours: totalHours,
      notes: notes.trim(),
      task: hiddenTask,
    }

    setLoading(true)

    let error = null

    if (editingId) {
      const result = await supabase
        .from('time_logs')
        .update(payload)
        .eq('id', editingId)

      error = result.error
    } else {
      const result = await supabase
        .from('time_logs')
        .insert({
          user_id: user.id,
          ...payload,
        })

      error = result.error
    }

    setLoading(false)

    if (error) {
      setMsg(error.message)
      setMsgType('err')
      return
    }

    setMsg(
      editingId
        ? 'Log updated successfully.'
        : 'Log saved successfully.'
    )

    setMsgType('ok')

    const savedDate = date

    setEditingId('')
    setDate(savedDate)
    setHours('')
    setMinutes('0')
    setProjectChoice('')
    setCustomProject('')
    setCategoryChoice('')
    setCustomCategory('')
    setNotes('')

    fetchLogs()

    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteLog(id: string) {
    if (!confirm('Delete this time log?')) return

    await supabase
      .from('time_logs')
      .delete()
      .eq('id', id)

    if (editingId === id) resetForm()

    fetchLogs()
  }

  function escapeCsv(value: unknown) {
    const text = String(value ?? '')

    if (
      text.includes(',') ||
      text.includes('"') ||
      text.includes('\n')
    ) {
      return '"' + text.replace(/"/g, '""') + '"'
    }

    return text
  }

  function exportLogs() {
    if (!logs.length) {
      setMsg('There are no logs to export.')
      setMsgType('err')
      return
    }

    const headers = [
      'Date',
      'Person',
      'Team',
      'Project',
      'Category',
      'Hours',
      'Minutes',
      'Duration',
      'Notes',
    ]

    const rows = logs.map(log => {
      const parts = splitStoredHours(log.hours)

      return [
        log.date,
        (log.profiles as any)?.name || '',
        (log.profiles as any)?.team || '',
        log.project,
        displayCategory(log),
        parts.hours,
        parts.minutes,
        formatDuration(log.hours),
        log.notes || '',
      ]
        .map(escapeCsv)
        .join(',')
    })

    const csv = [headers.join(','), ...rows].join('\r\n')

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8;' }
    )

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, '-')

    link.href = url
    link.setAttribute(
      'download',
      `workiq_pr_logs_${stamp}.csv`
    )

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    window.URL.revokeObjectURL(url)
  }

  function resetFilters() {
    setFFrom('')
    setFTo('')
    setFCat('')
    setFProj('')
  }

  const canExport =
    profile?.role === 'Manager' ||
    profile?.role === 'Admin'

  function canManageLog(log: TimeLog) {
    if (!profile) return false

    if (
      profile.role === 'Manager' ||
      profile.role === 'Admin'
    ) {
      return true
    }

    return log.user_id === profile.id
  }

  const totalMinutes = logs.reduce(
    (sum, log) =>
      sum + Math.round(Number(log.hours || 0) * 60),
    0
  )

  const uniqueProjects =
    Array.from(
      new Set(logs.map(l => l.project).filter(Boolean))
    ).length

  const uniqueCategories =
    Array.from(
      new Set(logs.map(l => displayCategory(l)))
    ).length

  const activeDays =
    Array.from(
      new Set(logs.map(l => l.date))
    ).length

  return (
    <div>
      <PageHeader
        title="Time Capture"
        subtitle="Record PR work quickly and keep an accurate activity history."
        action={
          canExport
            ? <Btn onClick={exportLogs}>Export Logs</Btn>
            : undefined
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        <StatCard
          label="Log Entries"
          value={String(logs.length)}
          color="#5b5ce2"
        />

        <StatCard
          label="Total Logged"
          value={formatDuration(totalMinutes / 60)}
          sub="Current view"
          color="#0ea5e9"
        />

        <StatCard
          label="Projects"
          value={String(uniqueProjects)}
          color="#059669"
        />

        <StatCard
          label="Categories"
          value={String(uniqueCategories)}
          color="#d97706"
        />

        <StatCard
          label="Active Days"
          value={String(activeDays)}
          color="#7c3aed"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '390px minmax(0,1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <Card accent={editingId ? '#d97706' : '#5b5ce2'}>
          <CardTitle>
            {editingId ? 'Edit Time Log' : 'Add Time Log'}
          </CardTitle>

          <div
            style={{
              marginBottom: 14,
              padding: '10px 12px',
              borderRadius: 12,
              background: '#f8fafc',
              border: '1px solid #e6ebf3',
              color: '#5f6b85',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Logging for:{' '}
            <span
              style={{
                color: '#141b2d',
                fontWeight: 800,
              }}
            >
              {fmtDate(date)}
            </span>
          </div>

          {editingId && (
            <div
              style={{
                marginBottom: 14,
                padding: '10px 12px',
                borderRadius: 12,
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                color: '#9a3412',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              You are editing an existing time log.
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}
          >
            <FormGroup label="Date *">
              <input
                style={inputStyle}
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </FormGroup>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#5f6b85',
                  marginBottom: 7,
                }}
              >
                Duration *
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
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

            <div style={{ gridColumn: '1 / -1' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#98a2b3',
                  marginBottom: 7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Quick duration
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 7,
                  flexWrap: 'wrap',
                }}
              >
                {[15, 30, 45, 60, 120].map(value => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQuickDuration(value)}
                    style={{
                      border: '1px solid #e6ebf3',
                      background: '#fff',
                      borderRadius: 10,
                      padding: '7px 11px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#5b5ce2',
                    }}
                  >
                    {value < 60
                      ? `${value} min`
                      : `${value / 60}h`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Project *">
                <select
                  style={inputStyle}
                  value={projectChoice}
                  onChange={e => {
                    setProjectChoice(e.target.value)

                    if (e.target.value !== '__new__') {
                      setCustomProject('')
                    }
                  }}
                >
                  <option value="">
                    Select project
                  </option>

                  {projects.map(project => (
                    <option
                      key={project.id}
                      value={project.name}
                    >
                      {project.name}
                    </option>
                  ))}

                  <option value="__new__">
                    Other / New Project
                  </option>
                </select>
              </FormGroup>
            </div>

            {projectChoice === '__new__' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <FormGroup label="New Project Name *">
                  <input
                    style={inputStyle}
                    value={customProject}
                    onChange={e =>
                      setCustomProject(e.target.value)
                    }
                    placeholder="Enter project name"
                  />
                </FormGroup>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Category *">
                <select
                  style={inputStyle}
                  value={categoryChoice}
                  onChange={e => {
                    setCategoryChoice(e.target.value)

                    if (e.target.value !== 'Other') {
                      setCustomCategory('')
                    }
                  }}
                >
                  <option value="">
                    Select category
                  </option>

                  {categories.map(category => (
                    <option
                      key={category.id}
                      value={category.name}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </FormGroup>
            </div>

            {categoryChoice === 'Other' && (
              <div style={{ gridColumn: '1 / -1' }}>
                <FormGroup label="Additional Category *">
                  <input
                    style={inputStyle}
                    value={customCategory}
                    onChange={e =>
                      setCustomCategory(e.target.value)
                    }
                    placeholder="Enter the category"
                  />
                </FormGroup>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <FormGroup label="Notes (optional)">
                <textarea
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 90,
                  }}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add any useful context..."
                />
              </FormGroup>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <Btn
              primary
              onClick={saveLog}
              disabled={loading}
            >
              {loading
                ? editingId
                  ? 'Updating...'
                  : 'Saving...'
                : editingId
                  ? 'Update Log'
                  : 'Save Log'}
            </Btn>

            <Btn onClick={resetForm}>
              {editingId
                ? 'Cancel Edit'
                : 'Clear'}
            </Btn>
          </div>

          {msg && (
            <div
              style={{
                marginTop: 12,
                fontSize: 13,
                color:
                  msgType === 'ok'
                    ? '#166534'
                    : '#b91c1c',
                padding: '10px 12px',
                borderRadius: 12,
                background:
                  msgType === 'ok'
                    ? '#dcfce7'
                    : '#fee2e2',
                border:
                  msgType === 'ok'
                    ? '1px solid #bbf7d0'
                    : '1px solid #fecaca',
                fontWeight: 600,
              }}
            >
              {msg}
            </div>
          )}
        </Card>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
            minWidth: 0,
          }}
        >
          <Card>
            <CardTitle>Filters</CardTitle>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit,minmax(145px,1fr))',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <FormGroup label="From">
                <input
                  style={inputStyle}
                  type="date"
                  value={fFrom}
                  onChange={e =>
                    setFFrom(e.target.value)
                  }
                />
              </FormGroup>

              <FormGroup label="To">
                <input
                  style={inputStyle}
                  type="date"
                  value={fTo}
                  onChange={e =>
                    setFTo(e.target.value)
                  }
                />
              </FormGroup>

              <FormGroup label="Category">
                <select
                  style={inputStyle}
                  value={fCat}
                  onChange={e =>
                    setFCat(e.target.value)
                  }
                >
                  <option value="">All</option>

                  {categories.map(category => (
                    <option
                      key={category.id}
                      value={category.name}
                    >
                      {category.name}
                    </option>
                  ))}

                  <option value="__custom__">
                    Additional Categories
                  </option>
                </select>
              </FormGroup>

              <FormGroup label="Project">
                <input
                  style={inputStyle}
                  value={fProj}
                  onChange={e =>
                    setFProj(e.target.value)
                  }
                  placeholder="Search project"
                />
              </FormGroup>

              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <Btn primary onClick={fetchLogs}>
                  Apply
                </Btn>

                <Btn onClick={resetFilters}>
                  Reset
                </Btn>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Log History</CardTitle>

            <Table
              heads={[
                'Date',
                'Project',
                'Category',
                'Notes',
                'Duration',
                ''
              ]}
              empty={logs.length === 0}
            >
              {logs.map(log => (
                <tr key={log.id}>
                  <Td>
                    {fmtDate(log.date)}
                  </Td>

                  <Td style={{ fontWeight: 600 }}>
                    {log.project}
                  </Td>

                  <Td>
                    <Badge
                      text={displayCategory(log)}
                    />
                  </Td>

                  <Td
                    style={{
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: '#5f6b85',
                    }}
                  >
                    {log.notes || '-'}
                  </Td>

                  <Td
                    style={{
                      fontWeight: 700,
                      fontFamily:
                        'DM Mono,monospace',
                    }}
                  >
                    {formatDuration(log.hours)}
                  </Td>

                  <Td>
                    <div
                      style={{
                        display: 'flex',
                        gap: 6,
                        justifyContent:
                          'flex-end',
                        flexWrap: 'wrap',
                      }}
                    >
                      {canManageLog(log) && (
                        <Btn
                          small
                          onClick={() =>
                            startEdit(log)
                          }
                        >
                          Edit
                        </Btn>
                      )}

                      {canManageLog(log) && (
                        <Btn
                          small
                          danger
                          onClick={() =>
                            deleteLog(log.id)
                          }
                        >
                          Delete
                        </Btn>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      </div>
    </div>
  )
}
