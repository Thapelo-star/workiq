'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Learning } from '@/lib/types'
import { Card, CardTitle, PageHeader, Badge, FormGroup, inputStyle } from '@/components/ui'
import { fmtDate } from '@/lib/kpi'

const OUTCOME_META: Record<string,{ color:string; bg:string; icon:string }> = {
  Improved:    { color:'#059669', bg:'#d1fae5', icon:'↑' },
  'No Change': { color:'#d97706', bg:'#fef3c7', icon:'→' },
  Worsened:    { color:'#dc2626', bg:'#fee2e2', icon:'↓' },
}

const CAT_COLORS: Record<string,'blue'|'green'|'amber'|'red'|'purple'|'teal'|'gray'> = {
  Process:'blue', People:'purple', Client:'green', Technical:'teal',
  Financial:'amber', Operational:'blue', Strategic:'purple', General:'gray',
}

export default function LearningPage() {
  const supabase = createClient()
  const [learnings, setLearnings] = useState<any[]>([])
  const [selected, setSelected] = useState<any|null>(null)
  const [filterCat, setFilterCat] = useState('All')
  const [filterOutcome, setFilterOutcome] = useState('All')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('learnings')
      .select('*, decisions(title, related_kpi, expected_outcome, type), profiles(name)')
      .order('created_at', { ascending:false })
    setLearnings(data || [])
  }, [])

  useEffect(() => { load() }, [])

  const categories = ['All', ...Array.from(new Set(learnings.map(l=>l.category).filter(Boolean)))]
  const outcomes = ['All', 'Improved', 'No Change', 'Worsened']

  const filtered = learnings.filter(l => {
    if (filterCat !== 'All' && l.category !== filterCat) return false
    if (filterOutcome !== 'All' && l.outcome_status !== filterOutcome) return false
    if (search && !l.title.toLowerCase().includes(search.toLowerCase()) &&
        !l.recommendation?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total: learnings.length,
    improved: learnings.filter(l=>l.outcome_status==='Improved').length,
    noChange: learnings.filter(l=>l.outcome_status==='No Change').length,
    worsened: learnings.filter(l=>l.outcome_status==='Worsened').length,
  }

  return (
    <div>
      <PageHeader title="Learning Register"
        subtitle="Organisational memory — lessons captured from completed decisions and actions." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          ['Total Learnings', stats.total,   '#6366f1'],
          ['Improved',        stats.improved, '#059669'],
          ['No Change',       stats.noChange, '#d97706'],
          ['Worsened',        stats.worsened, '#dc2626'],
        ].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'16px 18px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:26, fontWeight:800, fontFamily:'DM Mono,monospace', color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom:20, padding:'14px 20px' }}>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <FormGroup label="Search">
            <input style={{ ...inputStyle, width:220 }} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search learnings..." />
          </FormGroup>
          <FormGroup label="Category">
            <select style={{ ...inputStyle, width:160 }} value={filterCat} onChange={e=>setFilterCat(e.target.value)}>
              {categories.map(c=><option key={c}>{c}</option>)}
            </select>
          </FormGroup>
          <FormGroup label="Outcome">
            <div style={{ display:'flex', gap:6 }}>
              {outcomes.map(o => (
                <button key={o} onClick={()=>setFilterOutcome(o)}
                  style={{ fontFamily:'inherit', fontSize:12, fontWeight:filterOutcome===o?700:500, padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer',
                    background: filterOutcome===o ? (o==='All'?'linear-gradient(135deg,#6366f1,#4f46e5)':OUTCOME_META[o]?.bg||'#f4f6fb') : '#f4f6fb',
                    color: filterOutcome===o ? (o==='All'?'#fff':OUTCOME_META[o]?.color||'#6b7280') : '#6b7280' }}>
                  {o !== 'All' && OUTCOME_META[o]?.icon+' '}{o}
                </button>
              ))}
            </div>
          </FormGroup>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign:'center', padding:48, color:'#a0a8c0' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📚</div>
            <div style={{ fontSize:15, fontWeight:600, color:'#6b7280', marginBottom:6 }}>No learnings yet</div>
            <div style={{ fontSize:13 }}>Complete decisions and actions and record their outcomes to build the organisation's memory.</div>
          </div>
        </Card>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 400px' : 'repeat(auto-fill,minmax(340px,1fr))', gap:20 }}>
          <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr' : 'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
            {filtered.map(l => {
              const om = OUTCOME_META[l.outcome_status]
              return (
                <div key={l.id} onClick={()=>setSelected(selected?.id===l.id?null:l)}
                  style={{ background:'#fff', border:'2px solid', borderColor: selected?.id===l.id ? '#6366f1' : '#e8eaf2', borderRadius:12, padding:18, cursor:'pointer', transition:'all 0.15s',
                    boxShadow: selected?.id===l.id ? '0 0 0 3px rgba(99,102,241,0.1)' : '0 1px 3px rgba(30,33,64,0.05)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div style={{ flex:1, marginRight:8 }}>
                      <div style={{ fontWeight:700, fontSize:14, marginBottom:6 }}>{l.title}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <Badge text={l.category||'General'} type={CAT_COLORS[l.category]||'gray'} />
                        {om && <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:100, background:om.bg, color:om.color }}>{om.icon} {l.outcome_status}</span>}
                      </div>
                    </div>
                  </div>

                  {l.decisions && (
                    <div style={{ fontSize:11, color:'#9ca3af', marginBottom:8 }}>
                      From: {l.decisions.title}
                    </div>
                  )}

                  {l.recommendation && (
                    <div style={{ fontSize:13, color:'#374151', lineHeight:1.5, marginBottom:8 }}>
                      <span style={{ fontWeight:600, color:'#6366f1' }}>Recommendation: </span>
                      {l.recommendation.slice(0,120)}{l.recommendation.length>120?'...':''}
                    </div>
                  )}

                  <div style={{ fontSize:11, color:'#a0a8c0', marginTop:8 }}>
                    {fmtDate(l.created_at?.slice(0,10))} · {l.profiles?.name||'—'}
                  </div>
                </div>
              )
            })}
          </div>

          {selected && (
            <Card>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{selected.title}</div>
                <button onClick={()=>setSelected(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, color:'#9ca3af' }}>×</button>
              </div>

              {OUTCOME_META[selected.outcome_status] && (
                <div style={{ marginBottom:14, padding:'10px 12px', background:OUTCOME_META[selected.outcome_status].bg, borderRadius:8 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:OUTCOME_META[selected.outcome_status].color }}>
                    {OUTCOME_META[selected.outcome_status].icon} Outcome: {selected.outcome_status}
                  </div>
                </div>
              )}

              {selected.decisions && (
                <div style={{ marginBottom:14, padding:'10px 12px', background:'#f4f6fb', borderRadius:8 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:4 }}>Original Decision / Action</div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{selected.decisions.title}</div>
                  {selected.decisions.related_kpi && <div style={{ fontSize:12, color:'#6b7280', marginTop:4 }}>KPI: {selected.decisions.related_kpi}</div>}
                </div>
              )}

              {selected.context && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0', marginBottom:4 }}>What Happened</div>
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
                Added by {selected.profiles?.name||'—'} on {fmtDate(selected.created_at?.slice(0,10))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
