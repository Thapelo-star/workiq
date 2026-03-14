'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KpiRules, CATEGORIES, Category } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, FormGroup, inputStyle } from '@/components/ui'

export default function AdminKpiPage() {
  const supabase = createClient()
  const [rules, setRules] = useState<KpiRules|null>(null)
  const [daily, setDaily] = useState('8')
  const [billable, setBillable] = useState('70')
  const [catTargets, setCatTargets] = useState<Record<string,string>>({})
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('kpi_rules').select('*').limit(1).single().then(({ data }) => {
      if (!data) return
      setRules(data)
      setDaily(String(data.daily_hours_threshold))
      setBillable(String(data.billable_target))
      const t: Record<string,string> = {}
      CATEGORIES.forEach(c => { t[c] = String((data.category_targets as any)[c] || 0) })
      setCatTargets(t)
    })
  }, [])

  async function save() {
    setSaving(true)
    const targets: Record<string,number> = {}
    CATEGORIES.forEach(c => { targets[c] = parseFloat(catTargets[c])||0 })
    const payload = {
      daily_hours_threshold: parseFloat(daily)||8,
      billable_target: parseInt(billable)||70,
      category_targets: targets,
      updated_at: new Date().toISOString(),
    }
    const { error } = rules
      ? await supabase.from('kpi_rules').update(payload).eq('id', rules.id)
      : await supabase.from('kpi_rules').insert(payload)
    setSaving(false)
    setMsg(error ? error.message : 'Rules saved successfully.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div>
      <PageHeader title="KPI Rules" subtitle="Configure thresholds and targets that drive flags and insights." />
      <Card style={{ maxWidth:560 }}>
        <CardTitle>Global Thresholds</CardTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24 }}>
          <FormGroup label="Daily Hours Overload Threshold">
            <input style={inputStyle} type="number" min="1" max="24" step="0.5" value={daily} onChange={e=>setDaily(e.target.value)} />
          </FormGroup>
          <FormGroup label="Minimum Billable % Target">
            <input style={inputStyle} type="number" min="0" max="100" step="5" value={billable} onChange={e=>setBillable(e.target.value)} />
          </FormGroup>
        </div>

        <CardTitle>Category Hour Targets (per period)</CardTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
          {CATEGORIES.map(c=>(
            <FormGroup key={c} label={c}>
              <input style={inputStyle} type="number" min="0" max="80" step="1"
                value={catTargets[c]||'0'}
                onChange={e=>setCatTargets(prev=>({ ...prev, [c]:e.target.value }))} />
            </FormGroup>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <Btn primary onClick={save} disabled={saving}>{saving?'Saving...':'Save Rules'}</Btn>
          {msg && <span style={{ fontSize:13, color: msg.includes('error')||msg.includes('Error') ? '#c0392b':'#1a7f5a' }}>{msg}</span>}
        </div>
      </Card>
    </div>
  )
}