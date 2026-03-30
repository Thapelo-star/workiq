'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Learning } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

const OUTCOME_META: Record<string,{bg:string;color:string;icon:string}> = {
  'Improved': { bg:'#d1fae5', color:'#059669', icon:'+' },
  'No Change': { bg:'#fef3c7', color:'#d97706', icon:'=' },
  'Worsened': { bg:'#fee2e2', color:'#dc2626', icon:'-' },
}

const CATEGORY_OPTIONS = [
  'General',
  'Time Capture',
  'Trends',
  'Learning',
  'Operations',
  'Process',
  'Reporting',
  'Team Adoption',
]

export default function LearningPage() {
  const supabase = createClient()
  const [learnings, setLearnings] = useState<Learning[]>([])
  const [selected, setSelected] = useState<Learning | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [filterOutcome, setFilterOutcome] = useState('All')

  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [whatWorked, setWhatWorked] = useState('')
  const [whatDidnt, setWhatDidnt] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [outcomeStatus, setOutcomeStatus] = useState('Improved')
  const [category, setCategory] = useState('General')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('learnings')
      .select('*, decisions(title), profiles(name)')
      .order('created_at', { ascending:false })

    setLearnings((data || []) as Learning[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
  }, [load])

  function resetForm() {
    setTitle('')
    setContext('')
    setWhatWorked('')
    setWhatDidnt('')
    setRecommendation('')
    setOutcomeStatus('Improved')
    setCategory('General')
  }

  async function saveLearning() {
    setMsg('')

    if (!title.trim()) {
      setMsg('Please enter a title.')
      return
    }

    if (!recommendation.trim()) {
      setMsg('Please enter a recommendation.')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setMsg('You must be signed in.')
      return
    }

    setSaving(true)

    const payload = {
      title: title.trim(),
      context: context.trim(),
      what_worked: whatWorked.trim(),
      what_didnt: whatDidnt.trim(),
      recommendation: recommendation.trim(),
      outcome_status: outcomeStatus,
      category,
      created_by: user.id,
    }

    const { error } = await supabase.from('learnings').insert(payload as any)

    setSaving(false)

    if (error) {
      setMsg(error.message)
      return
    }

    setMsg('Learning saved successfully.')
    resetForm()
    setShowForm(false)
    load()
    setTimeout(() => setMsg(''), 3000)
  }

  const categories = ['All', ...Array.from(new Set(learnings.map(l => l.category).filter(Boolean)))]
  const outcomes = ['All', 'Improved', 'No Change', 'Worsened']

  const filtered = learnings.filter(l => {
    if (filterCat !== 'All' && l.category !== filterCat) return false
    if (filterOutcome !== 'All' && l.outcome_status !== filterOutcome) return false
    if (
      search &&
      !l.title.toLowerCase().includes(search.toLowerCase()) &&
      !(l.recommendation || '').toLowerCase().includes(search.toLowerCase())
    ) return false
    return true
  })

  const stats = {
    total: learnings.length,
    improved: learnings.filter(l => l.outcome_status === 'Improved').length,
    noChange: learnings.filter(l => l.outcome_status === 'No Change').length,
    worsened: learnings.filter(l => l.outcome_status === 'Worsened').length,
  }

  return (
    <div>
      <PageHeader
        title="Learning Register"
        subtitle="Capture lessons manually while the department rollout is underway."
        action={
          <Btn primary onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Close Form' : 'Add Learning'}
          </Btn>
        }
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          ['Total Learnings', stats.total, '#6366f1'],
          ['Improved', stats.improved, '#059669'],
          ['No Change', stats.noChange, '#d97706'],
          ['Worsened', stats.worsened, '#dc2626'],
        ].map(([label, value, color]) => (
          <div key={label as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:color as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:color as string }}>{value}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <Card style={{ marginBottom:20 }}>
          <CardTitle>Add Learning</CardTitle>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div style={{ gridColumn:'1 / -1' }}>
              <FormGroup label="Title">
                <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Short title for the lesson" />
              </FormGroup>
            </div>

            <FormGroup label="Category">
              <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORY_OPTIONS.map(option => <option key={option}>{option}</option>)}
              </select>
            </FormGroup>

            <FormGroup label="Outcome">
              <select style={inputStyle} value={outcomeStatus} onChange={e => setOutcomeStatus(e.target.value)}>
                <option>Improved</option>
                <option>No Change</option>
                <option>Worsened</option>
              </select>
            </FormGroup>

            <div style={{ gridColumn:'1 / -1' }}>
              <FormGroup label="Context">
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={context} onChange={e => setContext(e.target.value)} placeholder="What happened?" />
              </FormGroup>
            </div>

            <div style={{ gridColumn:'1 / -1' }}>
              <FormGroup label="What Worked">
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={whatWorked} onChange={e => setWhatWorked(e.target.value)} placeholder="What worked well?" />
              </FormGroup>
            </div>

            <div style={{ gridColumn:'1 / -1' }}>
              <FormGroup label="What Did Not Work">
                <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={whatDidnt} onChange={e => setWhatDidnt(e.target.value)} placeholder="What did not work?" />
              </FormGroup>
            </div>

            <div style={{ gridColumn:'1 / -1' }}>
              <FormGroup label="Recommendation">
                <textarea style={{ ...inputStyle, minHeight:80, resize:'vertical' }} value={recommendation} onChange={e => setRecommendation(e.target.value)} placeholder="What should be repeated, changed, or avoided next time?" />
              </FormGroup>
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:16, alignItems:'center', flexWrap:'wrap' }}>
            <Btn primary onClick={saveLearning} disabled={saving}>{saving ? 'Saving...' : 'Save Learning'}</Btn>
            <Btn onClick={resetForm}>Clear</Btn>
            {msg && <span style={{ fontSize:13, color: msg.toLowerCase().includes('success') ? '#059669' : '#dc2626' }}>{msg}</span>}
          </div>
        </Card>
      )}

      <Card style={{ marginBottom:20, padding:'14px 20px' }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <FormGroup label="Search">
            <input style={{ ...inputStyle, width:220 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learnings..." />
          </FormGroup>

          <FormGroup label="Category">
            <select style={{ ...inputStyle, width:170 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </FormGroup>

          <FormGroup label="Outcome">
            <select style={{ ...inputStyle, width:170 }} value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}>
              {outcomes.map(o => <option key={o}>{o}</option>)}
            </select>
          </FormGroup>
        </div>
      </Card>

      {loading ? (
        <Card>
          <div style={{ padding:32, color:'#6b7280', fontSize:13 }}>Loading learnings...</div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:48, color:'#a0a8c0' }}>
            <div style={{ fontSize:15, fontWeight:600, color:'#6b7280', marginBottom:6 }}>No learnings yet</div>
            <div style={{ fontSize:13 }}>Use the Add Learning button to capture the first lesson from your department rollout.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 400px' : 'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
          <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
            {filtered.map(l => {
              const meta = OUTCOME_META[l.outcome_status] || { bg:'#f3f4f6', color:'#6b7280', icon:'*' }

              return (
                <div
                  key={l.id}
                  onClick={() => setSelected(selected?.id === l.id ? null : l)}
                  style={{
                    background:'#fff',
                    border:'2px solid',
                    borderColor: selected?.id === l.id ? '#6366f1' : '#e8eaf2',
                    borderRadius:12,
                    padding:18,
                    cursor:'pointer',
                    transition:'all 0.15s',
                    boxShadow: selected?.id === l.id ? '0 0 0 3px rgba(99,102,241,0.1)' : '0 1px 3px rgba(30,33,64,0.05)'
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ flex:1, marginRight:8 }}>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{l.title}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <Badge text={l.category || 'General'} type="gray" />
                        {l.outcome_status && <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:meta.bg, color:meta.color }}>{meta.icon} {l.outcome_status}</span>}
                      </div>
                    </div>
                  </div>

                  {(l.recommendation || '') && (
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.5, marginBottom:8 }}>
                      <span style={{ fontWeight:600, color:'#6366f1' }}>Recommendation: </span>
                      {(l.recommendation || '').slice(0,120)}{(l.recommendation || '').length > 120 ? '...' : ''}
                    </div>
                  )}

                  <div style={{ fontSize:11, color:'#a0a8c0', marginTop:8 }}>
                    {fmtDate((l.created_at || '').slice(0,10))}
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <Card>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{selected.title}</div>
                <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9ca3af' }}>x</button>
              </div>

              {selected.outcome_status && OUTCOME_META[selected.outcome_status] && (
                <div style={{ marginBottom:14, padding:'10px 12px', background:OUTCOME_META[selected.outcome_status].bg, borderRadius:8 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:OUTCOME_META[selected.outcome_status].color }}>
                    {OUTCOME_META[selected.outcome_status].icon} Outcome: {selected.outcome_status}
                  </div>
                </div>
              )}

              {selected.context && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:4 }}>Context</div>
                  <p style={{ fontSize:13, color:'#6b7280', lineHeight:1.5 }}>{selected.context}</p>
                </div>
              )}

              {selected.what_worked && (
                <div style={{ marginBottom:12, padding:'10px 12px', background:'#d1fae5', borderRadius:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#059669', marginBottom:4 }}>What Worked</div>
                  <p style={{ fontSize:13, color:'#065f46', lineHeight:1.5 }}>{selected.what_worked}</p>
                </div>
              )}

              {selected.what_didnt && (
                <div style={{ marginBottom:12, padding:'10px 12px', background:'#fee2e2', borderRadius:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#dc2626', marginBottom:4 }}>What Did Not Work</div>
                  <p style={{ fontSize:13, color:'#991b1b', lineHeight:1.5 }}>{selected.what_didnt}</p>
                </div>
              )}

              {selected.recommendation && (
                <div style={{ marginBottom:12, padding:'10px 12px', background:'#eef2ff', borderRadius:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#6366f1', marginBottom:4 }}>Recommendation</div>
                  <p style={{ fontSize:13, color:'#374151', lineHeight:1.5 }}>{selected.recommendation}</p>
                </div>
              )}

              <div style={{ fontSize:11, color:'#a0a8c0', marginTop:8 }}>
                Added on {fmtDate((selected.created_at || '').slice(0,10))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}