'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TimeLog, Category, CATEGORIES, Profile } from '@/lib/types'
import { fmtDate, todayStr } from '@/lib/kpi'
import { Card, CardTitle, PageHeader, Btn, Badge, Table, Td, FormGroup, inputStyle, EmptyState } from '@/components/ui'

export default function TimePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile|null>(null)
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  // Form state
  const [date, setDate] = useState(todayStr())
  const [hours, setHours] = useState('')
  const [project, setProject] = useState('')
  const [category, setCategory] = useState<Category|''>('')
  const [task, setTask] = useState('')
  const [notes, setNotes] = useState('')

  // Filters
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [fCat, setFCat] = useState('')
  const [fProj, setFProj] = useState('')

  const fetchProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data)
  }, [])

  const fetchLogs = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    let q = supabase.from('time_logs').select('*, profiles(name)').order('date', { ascending:false }).limit(300)
    if (prof?.role === 'Employee') q = q.eq('user_id', user.id)
    if (fFrom) q = q.gte('date', fFrom)
    if (fTo)   q = q.lte('date', fTo)
    if (fCat)  q = q.eq('category', fCat)
    const { data } = await q
    let result: TimeLog[] = data || []
    if (fProj) result = result.filter(l => l.project.toLowerCase().includes(fProj.toLowerCase()))
    setLogs(result)
  }, [fFrom, fTo, fCat, fProj])

  useEffect(() => { fetchProfile(); fetchLogs() }, [])

  async function saveLog() {
    if (!date || !hours || !project || !category || !task) {
      setMsg('Please fill in all required fields.'); setMsgType('err'); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setLoading(true)
    const { error } = await supabase.from('time_logs').insert({
      user_id: user.id, date, project, task, category, hours: parseFloat(hours), notes,
    })
    setLoading(false)
    if (error) { setMsg(error.message); setMsgType('err') }
    else {
      setMsg('Log saved successfully.'); setMsgType('ok')
      setHours(''); setProject(''); setCategory(''); setTask(''); setNotes('')
      setDate(todayStr())
      fetchLogs()
      setTimeout(() => setMsg(''), 3000)
    }
  }

  async function deleteLog(id: string) {
    if (!confirm('Delete this time log?')) return
    await supabase.from('time_logs').delete().eq('id', id)
    fetchLogs()
  }

  const canDelete = (log: TimeLog) => profile?.role !== 'Executive'

  return (
    <div>
      <PageHeader title="Time Capture" subtitle="Log your work hours against projects and categories." />
      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:20, alignItems:'start' }}>

        {/* FORM */}
        <Card>
          <CardTitle>Add Time Log</CardTitle>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FormGroup label="Date *">
              <input style={inputStyle} type="date" value={date} onChange={e=>setDate(e.target.value)} />
            </FormGroup>
            <FormGroup label="Duration (hours) *">
              <input style={inputStyle} type="number" min="0.5" max="24" step="0.5" value={hours} onChange={e=>setHours(e.target.value)} placeholder="e.g. 3" />
            </FormGroup>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Project *">
                <input style={inputStyle} value={project} onChange={e=>setProject(e.target.value)} placeholder="e.g. Alpha Platform" />
              </FormGroup>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Category *">
                <select style={inputStyle} value={category} onChange={e=>setCategory(e.target.value as Category)}>
                  <option value="">Select category</option>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </FormGroup>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Task Description *">
                <input style={inputStyle} value={task} onChange={e=>setTask(e.target.value)} placeholder="What did you work on?" />
              </FormGroup>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Notes (optional)">
                <textarea style={{ ...inputStyle, resize:'vertical', minHeight:64 }} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Any additional context..." />
              </FormGroup>
            </div>
          </div>
          <div style={{ marginTop:16, display:'flex', gap:8 }}>
            <Btn primary onClick={saveLog} disabled={loading}>{loading ? 'Saving...' : 'Save Log'}</Btn>
            <Btn onClick={() => { setHours(''); setProject(''); setCategory(''); setTask(''); setNotes(''); setMsg('') }}>Clear</Btn>
          </div>
          {msg && <div style={{ marginTop:10, fontSize:13, color: msgType==='ok' ? '#1a7f5a' : '#c0392b', padding:'6px 10px', borderRadius:6, background: msgType==='ok' ? '#e6f4ee' : '#fdecea' }}>{msg}</div>}
        </Card>

        {/* LOG TABLE */}
        <Card>
          <CardTitle>Log History</CardTitle>
          {/* FILTERS */}
          <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
            <FormGroup label="From"><input style={{ ...inputStyle, width:130 }} type="date" value={fFrom} onChange={e=>setFFrom(e.target.value)} /></FormGroup>
            <FormGroup label="To"><input style={{ ...inputStyle, width:130 }} type="date" value={fTo} onChange={e=>setFTo(e.target.value)} /></FormGroup>
            <FormGroup label="Category">
              <select style={{ ...inputStyle, width:130 }} value={fCat} onChange={e=>setFCat(e.target.value)}>
                <option value="">All</option>
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Project"><input style={{ ...inputStyle, width:130 }} value={fProj} onChange={e=>setFProj(e.target.value)} placeholder="All" /></FormGroup>
            <div style={{ marginTop:'auto' }}><Btn primary onClick={fetchLogs}>Filter</Btn></div>
          </div>

          <Table heads={['Date','Project','Category','Task','Hrs','']} empty={logs.length===0}>
            {logs.map(l=>(
              <tr key={l.id} style={{ cursor:'default' }}>
                <Td>{fmtDate(l.date)}</Td>
                <Td>{l.project}</Td>
                <Td><Badge text={l.category} /></Td>
                <Td style={{ maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.task}</Td>
                <Td style={{ fontWeight:500 }}>{l.hours}</Td>
                <Td>
                  {canDelete(l) && (
                    <Btn small onClick={()=>deleteLog(l.id)}>Delete</Btn>
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