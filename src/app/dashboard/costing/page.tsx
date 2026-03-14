'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProjectRate } from '@/lib/types'
import { Card, CardTitle, PageHeader, Btn, Table, Td, FormGroup, inputStyle } from '@/components/ui'

export default function CostingPage() {
  const supabase = createClient()
  const [rates, setRates] = useState<ProjectRate[]>([])
  const [projects, setProjects] = useState<string[]>([])
  const [costData, setCostData] = useState<{project:string;hours:number;cost:number;rate:number}[]>([])
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    const { data: r } = await supabase.from('project_rates').select('*').order('project')
    setRates(r || [])
    const { data: logs } = await supabase.from('time_logs').select('project,hours').limit(1000)
    const projMap: Record<string,number> = {}
    ;(logs||[]).forEach((l:any) => { projMap[l.project] = (projMap[l.project]||0) + Number(l.hours) })
    const unique = Object.keys(projMap).sort()
    setProjects(unique)
    const rateMap: Record<string,number> = {}
    ;(r||[]).forEach((x:ProjectRate) => { rateMap[x.project] = x.rate })
    const data = unique.map(p => ({ project:p, hours:projMap[p], rate:rateMap[p]||0, cost:parseFloat(((projMap[p])*(rateMap[p]||0)).toFixed(2)) }))
    setCostData(data)
  }, [])

  useEffect(() => { load() }, [])

  async function saveRate(project: string, rate: number, client: string) {
    const existing = rates.find(r => r.project === project)
    if (existing) {
      await supabase.from('project_rates').update({ rate, client, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('project_rates').insert({ project, rate, client })
    }
    setMsg('Rate saved for ' + project)
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  const totalCost = costData.reduce((s,d) => s + d.cost, 0)
  const totalHours = costData.reduce((s,d) => s + d.hours, 0)

  return (
    <div>
      <PageHeader title="Costing" subtitle="Project cost analysis based on hourly rates and logged time." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
        {[['Total Hours',totalHours.toFixed(1)+'h'],['Total Cost','R '+totalCost.toLocaleString()],['Projects',costData.length.toString()]].map(([l,v])=>(
          <div key={l} style={{ background:'#fff', border:'1px solid #e2e0d8', borderRadius:8, padding:'18px 20px' }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase', color:'#9e9b94', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:24, fontWeight:600, letterSpacing:-0.5 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <Card>
          <CardTitle>Project Cost Summary</CardTitle>
          <Table heads={['Project','Hours','Rate','Cost']}>
            {costData.map(d=>(
              <tr key={d.project}>
                <Td style={{ fontWeight:500 }}>{d.project}</Td>
                <Td>{d.hours.toFixed(1)}h</Td>
                <Td style={{ color:'#6b6860' }}>{d.rate > 0 ? 'R '+d.rate+'/h' : <span style={{ color:'#9e9b94' }}>Not set</span>}</Td>
                <Td style={{ fontWeight:500 }}>{d.cost > 0 ? 'R '+d.cost.toLocaleString() : '—'}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card>
          <CardTitle>Set Project Rates</CardTitle>
          {msg && <div style={{ marginBottom:12, fontSize:13, color:'#1a7f5a' }}>{msg}</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {projects.map(p => {
              const existing = rates.find(r => r.project === p)
              return <RateRow key={p} project={p} existing={existing} onSave={saveRate} />
            })}
            {projects.length === 0 && <p style={{ color:'#9e9b94', fontSize:13 }}>Log some time first to see projects here.</p>}
          </div>
        </Card>
      </div>
    </div>
  )
}

function RateRow({ project, existing, onSave }: { project:string; existing?:ProjectRate; onSave:(p:string,r:number,c:string)=>void }) {
  const [rate, setRate] = useState(existing ? String(existing.rate) : '')
  const [client, setClient] = useState(existing?.client || '')
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 80px 80px auto', gap:8, alignItems:'center' }}>
      <span style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{project}</span>
      <input style={{ ...inputStyle, padding:'5px 8px' }} placeholder="Client" value={client} onChange={e=>setClient(e.target.value)} />
      <input style={{ ...inputStyle, padding:'5px 8px' }} type="number" placeholder="Rate" value={rate} onChange={e=>setRate(e.target.value)} />
      <Btn small primary onClick={()=>onSave(project, parseFloat(rate)||0, client)}>Save</Btn>
    </div>
  )
}
