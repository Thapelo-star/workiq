'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Goal, Profile } from '@/lib/types'
import { computeKpis } from '@/lib/kpi'
import { Card, CardTitle, PageHeader, Btn, FormGroup, inputStyle } from '@/components/ui'

export default function GoalsPage() {
  const supabase = createClient()
  const [me, setMe] = useState<Profile|null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [progress, setProgress] = useState<Record<string,{ hours:number; billablePct:number }>>({})
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [msg, setMsg] = useState('')
  const isElevated = me && ['Manager','Executive','Admin'].includes(me.role)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setMe(prof)
    const elevated = prof && ['Manager','Executive','Admin'].includes(prof.role)
    const { data: profs } = await supabase.from('profiles').select('*').order('name')
    setProfiles(profs || [])
    let gq = supabase.from('goals').select('*, profiles(name)').eq('month', month)
    if (!elevated) gq = gq.eq('user_id', user.id)
    const { data: g } = await gq; setGoals(g || [])
    const from = month + '-01'
    const to = new Date(month+'-01'); to.setMonth(to.getMonth()+1); to.setDate(to.getDate()-1)
    const toStr = to.toISOString().slice(0,10)
    let lq = supabase.from('time_logs').select('*').gte('date',from).lte('date',toStr)
    if (!elevated) lq = lq.eq('user_id', user.id)
    const { data: logs } = await lq
    const byUser: Record<string,any[]> = {}
    ;(logs||[]).forEach((l:any) => { if(!byUser[l.user_id])byUser[l.user_id]=[]; byUser[l.user_id].push(l) })
    const prog: Record<string,{hours:number;billablePct:number}> = {}
    Object.entries(byUser).forEach(([uid,ulogs]) => {
      const k = computeKpis(ulogs as any)
      prog[uid] = { hours:k.totalHours, billablePct:k.billablePct }
    })
    setProgress(prog)
  }, [month])

  useEffect(() => { load() }, [month])

  async function setGoal(userId:string, targetHours:number, targetBillablePct:number) {
    const { data: { user } } = await supabase.auth.getUser()
    const existing = goals.find(g=>g.user_id===userId)
    if (existing) {
      await supabase.from('goals').update({ target_hours:targetHours, target_billable_pct:targetBillablePct, set_by:user?.id }).eq('id', existing.id)
    } else {
      await supabase.from('goals').insert({ user_id:userId, month, target_hours:targetHours, target_billable_pct:targetBillablePct, set_by:user?.id })
    }
    load(); setMsg('Goal saved.'); setTimeout(()=>setMsg(''),3000)
  }

  const displayProfiles = isElevated ? profiles : profiles.filter(p=>me&&p.id===me.id)

  return (
    <div>
      <PageHeader title="Goals & Targets" subtitle="Monthly hour targets and billable % goals per team member." />
      {msg && <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'#d1fae5', color:'#059669', fontSize:13 }}>{msg}</div>}

      <div style={{ display:'flex', gap:12, marginBottom:24, alignItems:'flex-end' }}>
        <FormGroup label="Month">
          <input style={{ ...inputStyle, width:180 }} type="month" value={month} onChange={e=>setMonth(e.target.value)} />
        </FormGroup>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:20 }}>
        {displayProfiles.map(p => {
          const goal = goals.find(g=>g.user_id===p.id)
          const prog = progress[p.id]
          const hours = prog?.hours || 0
          const billPct = prog?.billablePct || 0
          const targetH = goal?.target_hours || 160
          const targetB = goal?.target_billable_pct || 70
          const hoursPct = Math.min(100, Math.round((hours/targetH)*100))
          const hoursOk = hours >= targetH
          const billOk = billPct >= targetB
          return (
            <GoalCard key={p.id} profile={p} goal={goal}
              hours={hours} billPct={billPct} hoursPct={hoursPct}
              targetH={targetH} targetB={targetB} hoursOk={hoursOk} billOk={billOk}
              canEdit={!!isElevated} onSave={setGoal} />
          )
        })}
      </div>
    </div>
  )
}

function GoalCard({ profile, goal, hours, billPct, hoursPct, targetH, targetB, hoursOk, billOk, canEdit, onSave }: any) {
  const [editing, setEditing] = useState(false)
  const [th, setTh] = useState(String(targetH))
  const [tb, setTb] = useState(String(targetB))

  return (
    <Card>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>{profile.name}</div>
          <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>{profile.role} · {profile.team}</div>
        </div>
        {canEdit && <Btn small onClick={()=>setEditing(!editing)}>{editing?'Cancel':'Set Target'}</Btn>}
      </div>

      {editing && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16, padding:'14px', background:'#f9fafb', borderRadius:8 }}>
          <FormGroup label="Hour Target"><input style={inputStyle} type="number" value={th} onChange={e=>setTh(e.target.value)} placeholder="160" /></FormGroup>
          <FormGroup label="Billable % Target"><input style={inputStyle} type="number" value={tb} onChange={e=>setTb(e.target.value)} placeholder="70" /></FormGroup>
          <div style={{ gridColumn:'1/-1' }}><Btn primary small onClick={()=>{onSave(profile.id,parseFloat(th)||160,parseInt(tb)||70);setEditing(false)}}>Save Goal</Btn></div>
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
          <span style={{ color:'#6b7280', fontWeight:500 }}>Hours</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color: hoursOk?'#059669':'#111827' }}>{hours.toFixed(1)} / {targetH}h</span>
        </div>
        <div style={{ height:8, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:hoursPct+'%', height:'100%', background: hoursOk?'#059669':'#6366f1', borderRadius:4, transition:'width 0.3s' }} />
        </div>
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>{hoursPct}% complete</div>
      </div>

      <div>
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:6 }}>
          <span style={{ color:'#6b7280', fontWeight:500 }}>Billable %</span>
          <span style={{ fontFamily:'DM Mono,monospace', fontWeight:600, color: billOk?'#059669':'#d97706' }}>{billPct}% / {targetB}%</span>
        </div>
        <div style={{ height:8, background:'#f3f4f6', borderRadius:4, overflow:'hidden' }}>
          <div style={{ width:Math.min(100,billPct)+'%', height:'100%', background: billOk?'#059669':'#d97706', borderRadius:4 }} />
        </div>
      </div>

      <div style={{ marginTop:14, display:'flex', gap:8 }}>
        <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:100, background: hoursOk?'#d1fae5':'#fef3c7', color: hoursOk?'#059669':'#d97706' }}>
          {hoursOk ? 'Hours On Track' : 'Hours Behind'}
        </span>
        <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:100, background: billOk?'#d1fae5':'#fef3c7', color: billOk?'#059669':'#d97706' }}>
          {billOk ? 'Billable On Track' : 'Billable Behind'}
        </span>
      </div>
    </Card>
  )
}
