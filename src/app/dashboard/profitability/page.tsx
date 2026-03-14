'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CAN_SEE_PROFITABILITY } from '@/lib/types'
import { Card, CardTitle, PageHeader } from '@/components/ui'
import { useRouter } from 'next/navigation'

export default function ProfitabilityPage() {
  const supabase = createClient()
  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [allowed, setAllowed] = useState<boolean|null>(null)
  const [revenueMode, setRevenueMode] = useState<'theoretical'|'actual'>('actual')

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!prof || !CAN_SEE_PROFITABILITY.includes(prof.role)) { setAllowed(false); return }
    setAllowed(true)

    const { data: logs } = await supabase.from('time_logs').select('project,hours,user_id').limit(2000)
    const { data: rates } = await supabase.from('project_rates').select('*')
    const { data: profiles } = await supabase.from('profiles').select('id,hourly_rate')
    const { data: invoices } = await supabase.from('invoices').select('project,amount,status')

    const rateMap: Record<string,number> = {}
    ;(rates||[]).forEach((r:any) => { rateMap[r.project] = r.rate })
    const userRateMap: Record<string,number> = {}
    ;(profiles||[]).forEach((p:any) => { userRateMap[p.id] = p.hourly_rate || 0 })
    const paidRevMap: Record<string,number> = {}
    const totalRevMap: Record<string,number> = {}
    ;(invoices||[]).forEach((i:any) => {
      totalRevMap[i.project] = (totalRevMap[i.project]||0) + Number(i.amount)
      if (i.status === 'Paid') paidRevMap[i.project] = (paidRevMap[i.project]||0) + Number(i.amount)
    })

    const projData: Record<string,{ hours:number; cost:number; theoreticalRevenue:number }> = {}
    ;(logs||[]).forEach((l:any) => {
      if (!projData[l.project]) projData[l.project] = { hours:0, cost:0, theoreticalRevenue:0 }
      const h = Number(l.hours)
      projData[l.project].hours += h
      projData[l.project].cost += h * (userRateMap[l.user_id]||0)
      projData[l.project].theoreticalRevenue += h * (rateMap[l.project]||0)
    })

    const result = Object.entries(projData).map(([project, d]) => {
      const actualRevenue = paidRevMap[project] || 0
      const totalInvoiced = totalRevMap[project] || 0
      const revenue = revenueMode === 'actual' ? (actualRevenue || d.theoreticalRevenue) : d.theoreticalRevenue
      const margin = revenue - d.cost
      const marginPct = revenue > 0 ? Math.round((margin/revenue)*100) : 0
      return {
        project, hours:d.hours,
        revenue:parseFloat(revenue.toFixed(2)),
        actualRevenue, totalInvoiced,
        theoreticalRevenue:parseFloat(d.theoreticalRevenue.toFixed(2)),
        cost:parseFloat(d.cost.toFixed(2)),
        margin:parseFloat(margin.toFixed(2)),
        marginPct
      }
    }).sort((a,b) => b.revenue - a.revenue)
    setData(result)
  }, [revenueMode])

  useEffect(() => { load() }, [revenueMode])

  if (allowed === null) return <div style={{ padding:32, color:'#9ca3af', fontSize:13 }}>Loading...</div>
  if (!allowed) return (
    <div>
      <PageHeader title="Profitability" />
      <Card>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:240, gap:12 }}>
          <div style={{ fontWeight:600, fontSize:16 }}>Access Restricted</div>
          <div style={{ color:'#6b7280', fontSize:13 }}>Profitability is only visible to Managers, Executives, and Admins.</div>
        </div>
      </Card>
    </div>
  )

  const totRevenue = data.reduce((s,d)=>s+d.revenue,0)
  const totCost = data.reduce((s,d)=>s+d.cost,0)
  const totMargin = totRevenue - totCost
  const totMarginPct = totRevenue > 0 ? Math.round((totMargin/totRevenue)*100) : 0
  const totalPaid = data.reduce((s,d)=>s+d.actualRevenue,0)
  const totalInvoiced = data.reduce((s,d)=>s+d.totalInvoiced,0)

  return (
    <div>
      <PageHeader title="Profitability" subtitle="Revenue vs cost — toggle between paid invoices and theoretical rates." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
        {[
          ['Total Revenue', 'R '+totRevenue.toLocaleString(), '#6366f1'],
          ['Total Cost', 'R '+totCost.toLocaleString(), '#d97706'],
          ['Gross Margin', 'R '+totMargin.toLocaleString(), totMargin>=0?'#059669':'#dc2626'],
          ['Margin %', totMarginPct+'%', totMarginPct>=50?'#059669':totMarginPct>=20?'#d97706':'#dc2626'],
        ].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#fff', border:'1px solid #e8eaf2', borderRadius:12, padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c as string, borderRadius:'12px 12px 0 0' }} />
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.09em', color:'#a0a8c0', marginBottom:8 }}>{l}</div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:-0.5, color:c as string }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:16, padding:'12px 16px', background:'#f4f6fb', borderRadius:10, display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#374151' }}>Revenue source:</div>
        {(['actual','theoretical'] as const).map(m => (
          <button key={m} onClick={()=>setRevenueMode(m)}
            style={{ fontFamily:'inherit', fontSize:12, fontWeight:revenueMode===m?700:500, padding:'6px 16px', borderRadius:7, border:'none', cursor:'pointer',
              background: revenueMode===m ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : '#fff',
              color: revenueMode===m ? '#fff' : '#6b7280',
              boxShadow: revenueMode===m ? '0 2px 8px rgba(99,102,241,0.3)' : '0 1px 2px rgba(0,0,0,0.06)' }}>
            {m === 'actual' ? 'Paid invoices (actual)' : 'Hours × rate (theoretical)'}
          </button>
        ))}
        <div style={{ fontSize:12, color:'#9ca3af', marginLeft:'auto' }}>
          Total invoiced: R {totalInvoiced.toLocaleString()} · Paid: R {totalPaid.toLocaleString()}
        </div>
      </div>

      <Card>
        <CardTitle>Project Profitability</CardTitle>
        {data.length === 0 ? (
          <p style={{ color:'#9ca3af', fontSize:13 }}>Set project rates in Costing and user rates in Admin to see data.</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f8f9fc' }}>
              {['Project','Hours','Revenue','Cost','Margin','Margin %','Health'].map(h=>(
                <th key={h} style={{ textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'#6366f1', padding:'10px 14px', borderBottom:'2px solid #e8eaf2' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.project}>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8', fontWeight:600, fontSize:13 }}>
                    {d.project}
                    {d.actualRevenue > 0 && revenueMode === 'actual' && (
                      <div style={{ fontSize:10, color:'#059669', fontWeight:500 }}>R {d.actualRevenue.toLocaleString()} paid</div>
                    )}
                  </td>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8', fontSize:13 }}>{d.hours.toFixed(1)}h</td>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8', fontSize:13 }}>R {d.revenue.toLocaleString()}</td>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8', fontSize:13 }}>R {d.cost.toLocaleString()}</td>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8', fontSize:13, fontWeight:600, color:d.margin>=0?'#059669':'#dc2626' }}>
                    R {d.margin.toLocaleString()}
                  </td>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8', fontSize:13 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:80, height:6, background:'#f0f2f8', borderRadius:3, overflow:'hidden' }}>
                        <div style={{ width:Math.max(0,Math.min(100,d.marginPct))+'%', height:'100%', borderRadius:3,
                          background: d.marginPct>=50?'#059669':d.marginPct>=0?'#d97706':'#dc2626' }} />
                      </div>
                      <span style={{ fontSize:12, color:'#6b7280' }}>{d.marginPct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', borderBottom:'1px solid #f0f2f8' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:100,
                      background: d.marginPct>=50?'#d1fae5':d.marginPct>=20?'#fef3c7':d.marginPct>=0?'#fee2e2':'#fee2e2',
                      color: d.marginPct>=50?'#059669':d.marginPct>=20?'#d97706':'#dc2626' }}>
                      {d.marginPct>=50?'Healthy':d.marginPct>=20?'Moderate':d.marginPct>=0?'Low':'Loss'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div style={{ marginTop:12, fontSize:12, color:'#9ca3af' }}>
        Actual mode: uses paid invoice amounts as revenue. Theoretical mode: hours × project rate. Cost always = hours × user hourly rate.
      </div>
    </div>
  )
}
