'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ALL_ROLES } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, FormGroup, inputStyle } from '@/components/ui'

const ROLE_COLORS: Record<string,{ bg:string; color:string; border:string }> = {
  Admin:          { bg:'#fee2e2', color:'#dc2626', border:'rgba(220,38,38,0.2)' },
  Executive:      { bg:'#fef3c7', color:'#d97706', border:'rgba(217,119,6,0.2)' },
  Manager:        { bg:'#eef2ff', color:'#6366f1', border:'rgba(99,102,241,0.2)' },
  'Project Lead': { bg:'#ede9fe', color:'#7c3aed', border:'rgba(124,58,237,0.2)' },
  Employee:       { bg:'#f3f4f6', color:'#6b7280', border:'rgba(107,114,128,0.2)' },
}

export default function AccountabilityPage() {
  const supabase = createClient()
  const [data, setData] = useState<any[]>([])
  const [editing, setEditing] = useState<any|null>(null)
  const [responsibility, setResponsibility] = useState('')
  const [metric, setMetric] = useState('')
  const [msg, setMsg] = useState('')
  const [activeRole, setActiveRole] = useState('All')

  const load = useCallback(async () => {
    const { data: d } = await supabase.from('role_accountability').select('*').order('role').order('module')
    setData(d || [])
  }, [])

  useEffect(() => { load() }, [])

  async function save() {
    if (!editing) return
    await supabase.from('role_accountability').update({ responsibility, metric }).eq('id', editing.id)
    setEditing(null); setResponsibility(''); setMetric('')
    setMsg('Saved.'); load(); setTimeout(() => setMsg(''), 3000)
  }

  const roles = ['All', ...ALL_ROLES]
  const filtered = data.filter(d => activeRole === 'All' || d.role === activeRole)
  const grouped: Record<string, any[]> = {}
  filtered.forEach(d => { if (!grouped[d.role]) grouped[d.role] = []; grouped[d.role].push(d) })

  return (
    <div>
      <PageHeader title="Role Accountability Map"
        subtitle="Clear ownership matrix — who is responsible for what across the system." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:24 }}>
        {roles.map(r => (
          <button key={r} onClick={() => setActiveRole(r)}
            style={{ fontFamily:'inherit', fontSize:12, fontWeight:activeRole===r?700:500, padding:'6px 14px', borderRadius:8, border:'none', cursor:'pointer',
              background: activeRole===r ? (ROLE_COLORS[r]?.bg||'linear-gradient(135deg,#6366f1,#4f46e5)') : '#f4f6fb',
              color: activeRole===r ? (ROLE_COLORS[r]?.color||'#fff') : '#6b7280',
              boxShadow: activeRole===r ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
            {r}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([role, items]) => {
        const rc = ROLE_COLORS[role] || ROLE_COLORS.Employee
        return (
          <div key={role} style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, padding:'5px 14px', borderRadius:100, background:rc.bg, color:rc.color, border:'1px solid '+rc.border }}>{role}</span>
              <span style={{ fontSize:12, color:'#a0a8c0' }}>{items.length} responsibilities</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
              {items.map(item => (
                <div key={item.id} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:10, padding:16, boxShadow:'0 1px 3px rgba(30,33,64,0.05)', borderLeft:'3px solid '+rc.color }}>
                  {editing?.id === item.id ? (
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:rc.color, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.module}</div>
                      <div style={{ marginBottom:10 }}>
                        <FormGroup label="Responsibility">
                          <textarea style={{ ...inputStyle, minHeight:72, resize:'vertical' }} value={responsibility} onChange={e=>setResponsibility(e.target.value)} />
                        </FormGroup>
                      </div>
                      <div style={{ marginBottom:10 }}>
                        <FormGroup label="Success Metric">
                          <input style={inputStyle} value={metric} onChange={e=>setMetric(e.target.value)} />
                        </FormGroup>
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <Btn small primary onClick={save}>Save</Btn>
                        <Btn small onClick={()=>setEditing(null)}>Cancel</Btn>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:rc.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>{item.module}</span>
                        <Btn small onClick={()=>{ setEditing(item); setResponsibility(item.responsibility); setMetric(item.metric||'') }}>Edit</Btn>
                      </div>
                      <p style={{ fontSize:13, color:'#374151', lineHeight:1.5, marginBottom:8 }}>{item.responsibility}</p>
                      {item.metric && (
                        <div style={{ padding:'6px 10px', background:'#f4f6fb', borderRadius:6 }}>
                          <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#a0a8c0' }}>Metric: </span>
                          <span style={{ fontSize:12, color:'#6b7280' }}>{item.metric}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
