'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Decision, Profile } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, Badge, FormGroup, inputStyle, StatusBadge } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

const OUTCOME_META: Record<string,{ color:string; bg:string; icon:string }> = {
  Improved:    { color:'#059669', bg:'#d1fae5', icon:'↑' },
  'No Change': { color:'#d97706', bg:'#fef3c7', icon:'→' },
  Worsened:    { color:'#dc2626', bg:'#fee2e2', icon:'↓' },
}

type Tab = 'list' | 'new' | 'outcome'
type FilterKey = 'all' | 'Open' | 'In Progress' | 'Done' | 'overdue' | 'needs-review'

export default function DecisionsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [selected, setSelected] = useState<Decision|null>(null)
  const [tab, setTab] = useState<Tab>('list')
  const [filter, setFilter] = useState<FilterKey>('all')
  const [msg, setMsg] = useState('')

  // New decision form
  const [type, setType] = useState<'Decision'|'Action'>('Action')
  const [title, setTitle] = useState('')
  const [ownerId, setOwnerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [reason, setReason] = useState('')
  const [outcome, setOutcome] = useState('')
  const [relatedKpi, setRelatedKpi] = useState('')
  const [reviewDate, setReviewDate] = useState('')

  // Outcome recording form
  const [outcomeText, setOutcomeText] = useState('')
  const [outcomeStatus, setOutcomeStatus] = useState<'Improved'|'No Change'|'Worsened'|''>('')
  const [learningText, setLearningText] = useState('')

  // Learning from outcome
  const [learningTitle, setLearningTitle] = useState('')
  const [whatWorked, setWhatWorked] = useState('')
  const [whatDidnt, setWhatDidnt] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [learningCat, setLearningCat] = useState('General')
  const [savingOutcome, setSavingOutcome] = useState(false)

  const today = new Date().toISOString().slice(0,10)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const { data: d } = await supabase.from('decisions')
      .select('*, profiles(name,role)')
      .order('created_at', { ascending:false })
    const { data: p } = await supabase.from('profiles').select('*').order('name')
    setDecisions(d || [])
    setProfiles(p || [])
    setOwnerId(user.id)

    // Send overdue notifications
    const overdue = (d||[]).filter((x:any) =>
      x.status !== 'Done' && x.due_date && x.due_date < today && !x.reminded_at
    )
    for (const item of overdue) {
      await supabase.from('notifications').insert({
        user_id: item.owner_id || user.id,
        title: 'Overdue Action',
        body: item.title + ' was due ' + fmtDate(item.due_date) + ' and is still ' + item.status + '.',
        type: 'error', link: '/dashboard/decisions'
      })
      await supabase.from('decisions').update({ reminded_at: new Date().toISOString() }).eq('id', item.id)
    }
  }, [])

  useEffect(() => {
    load()
    const prefill = sessionStorage.getItem('prefill_decision')
    if (prefill) {
      const p = JSON.parse(prefill)
      setType(p.type||'Action'); setTitle(p.title||'')
      setReason(p.reason||''); setRelatedKpi(p.relatedKpi||'')
      setTab('new'); sessionStorage.removeItem('prefill_decision')
    }
  }, [])

  async function saveDecision() {
    if (!title.trim()) { setMsg('Title is required.'); return }
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('decisions').insert({
      type, title, owner_id: ownerId||user?.id,
      due_date: dueDate||null, reason, expected_outcome: outcome,
      related_kpi: relatedKpi, review_date: reviewDate||null,
      status: 'Open', created_by: user?.id
    })
    if (error) { setMsg('Error: '+error.message); return }
    if (dueDate) {
      await supabase.from('notifications').insert({
        user_id: ownerId||user?.id, title: 'New '+type+' Assigned',
        body: title + (dueDate ? ' — due '+fmtDate(dueDate) : ''),
        type: 'info', link: '/dashboard/decisions'
      })
    }
    setMsg(type+' created successfully.')
    setTitle(''); setReason(''); setOutcome(''); setDueDate('')
    setRelatedKpi(''); setReviewDate('')
    load(); setTab('list'); setTimeout(() => setMsg(''), 3000)
  }

  async function updateStatus(id: string, status: string) {
    const updates: any = { status }
    if (status === 'Done') updates.completed_at = new Date().toISOString()
    await supabase.from('decisions').update(updates).eq('id', id)
    load()
    if (selected?.id === id) setSelected((s: any) => ({ ...s, ...updates }))
  }

  function openOutcomePanel(d: Decision) {
    setSelected(d)
    setOutcomeText(d.outcome_text || '')
    setOutcomeStatus(d.outcome_status || '')
    setLearningText(d.learning_text || '')
    setLearningTitle('Lesson from: ' + d.title)
    setWhatWorked(''); setWhatDidnt(''); setRecommendation('')
    setLearningCat('General')
    setTab('outcome')
  }

  async function saveOutcome() {
    if (!selected) return
    setSavingOutcome(true)
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('decisions').update({
      outcome_text: outcomeText,
      outcome_status: outcomeStatus,
      outcome_measured_at: new Date().toISOString(),
      learning_text: learningText,
      status: 'Done',
      completed_at: new Date().toISOString(),
    }).eq('id', selected.id)

    if (learningTitle && (whatWorked || whatDidnt || recommendation)) {
      await supabase.from('learnings').insert({
        decision_id: selected.id,
        title: learningTitle,
        context: outcomeText,
        what_worked: whatWorked,
        what_didnt: whatDidnt,
        recommendation,
        outcome_status: outcomeStatus,
        category: learningCat,
        created_by: user?.id,
      })
    }

    if (outcomeStatus) {
      await supabase.from('notifications').insert({
        user_id: selected.owner_id || user?.id,
        title: 'Outcome Recorded: ' + (outcomeStatus === 'Improved' ? 'Improved' : outcomeStatus === 'Worsened' ? 'Worsened' : 'No Change'),
        body: selected.title + ' — ' + outcomeText.slice(0,80),
        type: outcomeStatus === 'Improved' ? 'success' : outcomeStatus === 'Worsened' ? 'error' : 'warning',
        link: '/dashboard/decisions'
      })
    }

    setSavingOutcome(false)
    setMsg('Outcome and learning saved.')
    load(); setTab('list'); setSelected(null)
    setTimeout(() => setMsg(''), 3000)
  }

  const filtered = decisions.filter(d => {
    if (filter === 'overdue') return d.status !== 'Done' && d.due_date && d.due_date < today
    if (filter === 'needs-review') return d.status === 'Done' && !d.outcome_text
    if (filter !== 'all') return d.status === filter
    return true
  })

  const overdue = decisions.filter(d => d.status !== 'Done' && d.due_date && d.due_date < today)
  const needsReview = decisions.filter(d => d.status === 'Done' && !d.outcome_text)
  const open = decisions.filter(d => d.status === 'Open')
  const inProgress = decisions.filter(d => d.status === 'In Progress')

  const FILTERS: { key: FilterKey; label: string; count?: number }[] = [
    { key:'all',          label:'All',           count: decisions.length },
    { key:'Open',         label:'Open',          count: open.length },
    { key:'In Progress',  label:'In Progress',   count: inProgress.length },
    { key:'Done',         label:'Done' },
    { key:'overdue',      label:'Overdue',       count: overdue.length },
    { key:'needs-review', label:'Needs Review',  count: needsReview.length },
  ]

  if (tab === 'outcome' && selected) {
    const om = OUTCOME_META[outcomeStatus] || null
    return (
      <div>
        <PageHeader title="Record Outcome & Learning"
          subtitle={'Closing the loop on: ' + selected.title} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
          {/* Left — context */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card accent="#6366f1">
              <CardTitle>Original Decision / Action</CardTitle>
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:3 }}>Title</div>
                <div style={{ fontSize:14, fontWeight:600 }}>{selected.title}</div>
              </div>
              {selected.reason && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:3 }}>Why it was created</div>
                  <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.5 }}>{selected.reason}</div>
                </div>
              )}
              {selected.expected_outcome && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:3 }}>Expected outcome</div>
                  <div style={{ fontSize:13, color:'#6b7280', lineHeight:1.5 }}>{selected.expected_outcome}</div>
                </div>
              )}
              {selected.related_kpi && (
                <div>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:3 }}>Related KPI</div>
                  <Badge text={selected.related_kpi} type="blue" />
                </div>
              )}
            </Card>

            <Card>
              <CardTitle>What Actually Happened?</CardTitle>
              <div style={{ marginBottom:14 }}>
                <FormGroup label="Outcome Summary *">
                  <textarea style={{ ...inputStyle, minHeight:100, resize:'vertical' }}
                    value={outcomeText} onChange={e=>setOutcomeText(e.target.value)}
                    placeholder="Describe what actually happened as a result of this action..." />
                </FormGroup>
              </div>
              <div style={{ marginBottom:14 }}>
                <FormGroup label="Did the situation improve?">
                  <div style={{ display:'flex', gap:8 }}>
                    {(['Improved','No Change','Worsened'] as const).map(s => {
                      const meta = OUTCOME_META[s]
                      return (
                        <button key={s} onClick={()=>setOutcomeStatus(s)}
                          style={{ fontFamily:'inherit', flex:1, padding:'10px 8px', borderRadius:8, border:'2px solid', cursor:'pointer', transition:'all 0.15s', fontWeight:600, fontSize:13,
                            borderColor: outcomeStatus===s ? meta.color : '#e8eaf2',
                            background: outcomeStatus===s ? meta.bg : '#f8f9fc',
                            color: outcomeStatus===s ? meta.color : '#9ca3af',
                          }}>
                          {meta.icon} {s}
                        </button>
                      )
                    })}
                  </div>
                </FormGroup>
              </div>
              <FormGroup label="Key Learning (brief)">
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }}
                  value={learningText} onChange={e=>setLearningText(e.target.value)}
                  placeholder="One key takeaway from this action..." />
              </FormGroup>
            </Card>
          </div>

          {/* Right — learning register */}
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Card accent="#059669">
              <CardTitle>Add to Learning Register</CardTitle>
              <p style={{ fontSize:13, color:'#6b7280', marginBottom:14, lineHeight:1.5 }}>
                Capture a structured lesson so the organisation remembers what worked, what did not, and what to do differently next time.
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <FormGroup label="Learning Title">
                  <input style={inputStyle} value={learningTitle} onChange={e=>setLearningTitle(e.target.value)} placeholder="Short memorable title for this lesson" />
                </FormGroup>
                <FormGroup label="Category">
                  <select style={inputStyle} value={learningCat} onChange={e=>setLearningCat(e.target.value)}>
                    {['General','Process','People','Client','Technical','Financial','Operational','Strategic'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </FormGroup>
                <FormGroup label="What worked?">
                  <textarea style={{ ...inputStyle, minHeight:68, resize:'vertical' }}
                    value={whatWorked} onChange={e=>setWhatWorked(e.target.value)}
                    placeholder="What actions, approaches or decisions had a positive effect?" />
                </FormGroup>
                <FormGroup label="What did not work?">
                  <textarea style={{ ...inputStyle, minHeight:68, resize:'vertical' }}
                    value={whatDidnt} onChange={e=>setWhatDidnt(e.target.value)}
                    placeholder="What fell short or caused problems?" />
                </FormGroup>
                <FormGroup label="Recommendation for next time">
                  <textarea style={{ ...inputStyle, minHeight:68, resize:'vertical' }}
                    value={recommendation} onChange={e=>setRecommendation(e.target.value)}
                    placeholder="What should the team do differently or keep doing?" />
                </FormGroup>
              </div>
            </Card>

            {outcomeStatus && (
              <div style={{ padding:'14px 16px', borderRadius:10, background: OUTCOME_META[outcomeStatus].bg, border:'1px solid', borderColor: OUTCOME_META[outcomeStatus].color+'44' }}>
                <div style={{ fontSize:13, fontWeight:700, color: OUTCOME_META[outcomeStatus].color, marginBottom:4 }}>
                  {OUTCOME_META[outcomeStatus].icon} Outcome: {outcomeStatus}
                </div>
                <div style={{ fontSize:12, color:'#6b7280' }}>
                  This will be saved to the Learning Register and visible to all managers.
                </div>
              </div>
            )}

            <div style={{ display:'flex', gap:10 }}>
              <Btn primary onClick={saveOutcome} disabled={savingOutcome||!outcomeText||!outcomeStatus}>
                {savingOutcome ? 'Saving...' : 'Save Outcome & Learning'}
              </Btn>
              <Btn onClick={()=>{ setTab('list'); setSelected(null) }}>Cancel</Btn>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Decisions & Actions"
        subtitle="Track decisions, assign actions, measure outcomes, and capture learning."
        action={<Btn primary onClick={()=>setTab(tab==='new'?'list':'new')}>+ New</Btn>} />

      {overdue.length > 0 && (
        <div style={{ marginBottom:16, padding:'12px 16px', background:'#fee2e2', border:'1px solid rgba(220,38,38,0.2)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'#dc2626' }}>
              {overdue.length} Overdue Item{overdue.length>1?'s':''}
            </div>
            <div style={{ fontSize:12, color:'#991b1b', marginTop:2 }}>
              {overdue.map(d=>d.title).slice(0,2).join(' · ')}{overdue.length>2?' + '+(overdue.length-2)+' more':''}
            </div>
          </div>
          <Btn small danger onClick={()=>setFilter('overdue')}>View Overdue</Btn>
        </div>
      )}

      {needsReview.length > 0 && (
        <div style={{ marginBottom:16, padding:'12px 16px', background:'#fef3c7', border:'1px solid rgba(217,119,6,0.3)', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'#d97706' }}>
              {needsReview.length} Completed Item{needsReview.length>1?'s':''} Awaiting Outcome Review
            </div>
            <div style={{ fontSize:12, color:'#92400e', marginTop:2 }}>
              Close the loop by recording what happened and what was learned.
            </div>
          </div>
          <Btn small onClick={()=>setFilter('needs-review')} style={{ background:'#fef3c7', border:'1px solid #d97706', color:'#d97706' }}>
            Review Now
          </Btn>
        </div>
      )}

      {msg && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8,
          background: msg.startsWith('Error') ? '#fee2e2' : '#d1fae5',
          color: msg.startsWith('Error') ? '#dc2626' : '#059669', fontSize:13, fontWeight:500 }}>
          {msg}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        {[
          ['Total',        decisions.length,      '#6366f1'],
          ['Open',         open.length,           '#d97706'],
          ['In Progress',  inProgress.length,     '#0ea5e9'],
          ['Overdue',      overdue.length,        overdue.length>0?'#dc2626':'#059669'],
          ['Needs Review', needsReview.length,    needsReview.length>0?'#d97706':'#059669'],
        ].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'16px 18px', cursor:'pointer', position:'relative', overflow:'hidden' }}
            onClick={()=>setFilter(l==='Total'?'all':l==='Needs Review'?'needs-review':l==='Overdue'?'overdue':l as any)}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {tab === 'new' && (
        <Card style={{ maxWidth:580, marginBottom:20 }}>
          <CardTitle>New {type}</CardTitle>
          <div style={{ display:'flex', gap:6, marginBottom:16 }}>
            {(['Action','Decision'] as const).map(t => (
              <button key={t} onClick={()=>setType(t)}
                style={{ fontFamily:'inherit', fontSize:13, fontWeight:type===t?700:500, padding:'6px 18px', borderRadius:7, border:'none', cursor:'pointer',
                  background: type===t ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#f4f6fb',
                  color: type===t ? '#fff' : '#6b7280' }}>
                {t}
              </button>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Title *">
                <input style={inputStyle} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What needs to be done or decided?" />
              </FormGroup>
            </div>
            <FormGroup label="Owner">
              <select style={inputStyle} value={ownerId} onChange={e=>setOwnerId(e.target.value)}>
                {profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Due Date">
              <input style={inputStyle} type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
            </FormGroup>
            <FormGroup label="Related KPI">
              <input style={inputStyle} value={relatedKpi} onChange={e=>setRelatedKpi(e.target.value)} placeholder="e.g. billable %, avg hours" />
            </FormGroup>
            <FormGroup label="Review Date">
              <input style={inputStyle} type="date" value={reviewDate} onChange={e=>setReviewDate(e.target.value)} />
            </FormGroup>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Reason / Context">
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why is this needed? What insight triggered it?" />
              </FormGroup>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <FormGroup label="Expected Outcome">
                <textarea style={{ ...inputStyle, minHeight:56, resize:'vertical' }} value={outcome} onChange={e=>setOutcome(e.target.value)} placeholder="What does success look like?" />
              </FormGroup>
            </div>
          </div>
          <div style={{ marginTop:16, display:'flex', gap:8 }}>
            <Btn primary onClick={saveDecision}>Create {type}</Btn>
            <Btn onClick={()=>setTab('list')}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ display:'flex', gap:0, borderBottom:'1px solid #e8eaf2', marginBottom:20, flexWrap:'wrap' }}>
        {FILTERS.map(({ key, label, count }) => (
          <div key={key} onClick={()=>setFilter(key)}
            style={{ padding:'8px 16px', fontSize:13, cursor:'pointer', whiteSpace:'nowrap',
              color: filter===key ? '#6366f1' : '#6b7280',
              borderBottom: filter===key ? '2px solid #6366f1' : '2px solid transparent',
              marginBottom:-1, fontWeight: filter===key ? 600 : 400 }}>
            {label}
            {count !== undefined && count > 0 && (
              <span style={{ marginLeft:6, fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:100,
                background: key==='overdue'?'#fee2e2':key==='needs-review'?'#fef3c7':'#eef2ff',
                color: key==='overdue'?'#dc2626':key==='needs-review'?'#d97706':'#6366f1' }}>
                {count}
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap:20 }}>
        <Card>
          <Table heads={['Title','Type','Owner','Due Date','Outcome','Status','']} empty={filtered.length===0}>
            {filtered.map(d => {
              const isOverdue = d.status !== 'Done' && d.due_date && d.due_date < today
              const hasOutcome = !!d.outcome_text
              const om = d.outcome_status ? OUTCOME_META[d.outcome_status] : null
              return (
                <tr key={d.id} onClick={()=>setSelected(selected?.id===d.id?null:d)}
                  style={{ cursor:'pointer', background: selected?.id===d.id?'#fafbff':isOverdue?'#fff9f9':'transparent' }}>
                  <Td>
                    <div style={{ fontWeight:500 }}>{d.title}</div>
                    {isOverdue && <div style={{ fontSize:11, color:'#dc2626', fontWeight:600, marginTop:1 }}>Overdue</div>}
                    {d.status==='Done' && !hasOutcome && <div style={{ fontSize:11, color:'#d97706', fontWeight:600, marginTop:1 }}>Needs outcome review</div>}
                  </Td>
                  <Td><Badge text={d.type} type={d.type==='Action'?'blue':'purple'} /></Td>
                  <Td style={{ fontSize:12 }}>{(d.profiles as any)?.name||'—'}</Td>
                  <Td style={{ fontSize:12, color:isOverdue?'#dc2626':'#6b7280', fontWeight:isOverdue?600:400 }}>
                    {fmtDate(d.due_date)||'—'}
                  </Td>
                  <Td>
                    {om ? (
                      <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:om.bg, color:om.color }}>
                        {om.icon} {d.outcome_status}
                      </span>
                    ) : d.status==='Done' ? (
                      <span style={{ fontSize:11, color:'#d97706', fontWeight:600 }}>Pending</span>
                    ) : <span style={{ color:'#a0a8c0', fontSize:12 }}>—</span>}
                  </Td>
                  <Td><StatusBadge status={d.status} /></Td>
                  <Td><span style={{ fontSize:12, color:'#6366f1' }}>View →</span></Td>
                </tr>
              )
            })}
          </Table>
        </Card>

        {selected && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div style={{ flex:1, marginRight:8 }}>
                <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{selected.title}</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  <Badge text={selected.type} type={selected.type==='Action'?'blue':'purple'} />
                  <StatusBadge status={selected.status} />
                  {selected.outcome_status && (
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100,
                      background: OUTCOME_META[selected.outcome_status]?.bg,
                      color: OUTCOME_META[selected.outcome_status]?.color }}>
                      {OUTCOME_META[selected.outcome_status]?.icon} {selected.outcome_status}
                    </span>
                  )}
                </div>
              </div>
              <Btn small onClick={()=>setSelected(null)}>Close</Btn>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
              {[
                ['Owner',      (selected.profiles as any)?.name||'—'],
                ['Due Date',   fmtDate(selected.due_date)||'None'],
                ['Review Date',fmtDate(selected.review_date)||'None'],
                ['Related KPI',selected.related_kpi||'—'],
              ].map(([l,v]) => (
                <div key={l as string}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:13 }}>{v}</div>
                </div>
              ))}
            </div>

            {selected.reason && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:2 }}>Reason</div>
                <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.5 }}>{selected.reason}</p>
              </div>
            )}
            {selected.expected_outcome && (
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:2 }}>Expected Outcome</div>
                <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.5 }}>{selected.expected_outcome}</p>
              </div>
            )}

            {selected.outcome_text && (
              <div style={{ marginBottom:10, padding:'10px 12px', background: OUTCOME_META[selected.outcome_status]?.bg||'#f4f6fb', borderRadius:8 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color: OUTCOME_META[selected.outcome_status]?.color||'#a0a8c0', marginBottom:4 }}>
                  Actual Outcome
                </div>
                <p style={{ fontSize:13, lineHeight:1.5 }}>{selected.outcome_text}</p>
              </div>
            )}

            {selected.learning_text && (
              <div style={{ marginBottom:14, padding:'10px 12px', background:'#eef2ff', borderRadius:8 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6366f1', marginBottom:4 }}>Key Learning</div>
                <p style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{selected.learning_text}</p>
              </div>
            )}

            <div style={{ borderTop:'1px solid #f0f2f8', paddingTop:14, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#a0a8c0', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Actions</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {selected.status !== 'Done' && ['Open','In Progress','Done'].map(s => (
                  <Btn key={s} small primary={selected.status===s} onClick={()=>updateStatus(selected.id,s)}>{s}</Btn>
                ))}
              </div>
              {(selected.status === 'Done' || selected.status === 'In Progress') && (
                <Btn primary onClick={()=>openOutcomePanel(selected)} style={{ marginTop:4 }}>
                  {selected.outcome_text ? 'Edit Outcome & Learning' : 'Record Outcome & Learning'}
                </Btn>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
