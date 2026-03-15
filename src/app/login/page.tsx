'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Employee')
  const [team, setTeam] = useState('')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const inp: React.CSSProperties = { fontFamily:'inherit', fontSize:13, padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8, background:'#f9fafb', color:'#111827', width:'100%', outline:'none' }
  const lbl: React.CSSProperties = { fontSize:12, fontWeight:600, color:'#6b7280', display:'block', marginBottom:6 }

  async function handleSubmit() {
    setError(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        router.push('/dashboard'); router.refresh()
      } else {
        if (!name.trim()) { setError('Please enter your name.'); return }
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); return }
        if (data.user) {
          const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).single()
          if (!existing) {
            const { error: pe } = await supabase.from('profiles').insert({
              id: data.user.id,
              name: name.trim(),
              role,
              team: team.trim() || 'General',
              hourly_rate: 0,
              leave_allowance: 21,
            })
            if (pe) { setError(pe.message); return }
          }
          router.push('/dashboard'); router.refresh()
        }
      }
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f0f2f5', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(circle at 30% 20%, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(14,165,233,0.06) 0%, transparent 50%)', pointerEvents:'none' }} />
      <div style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:40, width:440, maxWidth:'95vw', boxShadow:'0 8px 40px rgba(0,0,0,0.1)', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:40, right:40, height:2, background:'linear-gradient(90deg, #6366f1, #0ea5e9)', borderRadius:'0 0 4px 4px' }} />

        <div style={{ marginBottom:32 }}>
          <div style={{ fontWeight:800, fontSize:26, letterSpacing:-0.5, color:'#111827', marginBottom:4 }}>
            Work<span style={{ color:'#6366f1' }}>IQ</span>
          </div>
          <div style={{ color:'#6b7280', fontSize:14 }}>{mode==='login' ? 'Sign in to your workspace' : 'Create your account'}</div>
        </div>

        {mode==='signup' && (
          <>
            <div style={{ marginBottom:16 }}>
              <label style={lbl}>Full Name</label>
              <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={lbl}>Role</label>
                <select style={inp} value={role} onChange={e=>setRole(e.target.value)}>
                  <option>Employee</option><option>Project Lead</option><option>Manager</option><option>Executive</option><option>Admin</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Team</label>
                <input style={inp} value={team} onChange={e=>setTeam(e.target.value)} placeholder="e.g. Team A" />
              </div>
            </div>
          </>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Email</label>
          <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
        </div>
        <div style={{ marginBottom:22 }}>
          <label style={lbl}>Password</label>
          <input style={inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="????????" onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
        </div>

        {error && (
          <div style={{ color:'#dc2626', fontSize:13, marginBottom:18, padding:'10px 14px', background:'#fee2e2', borderRadius:8, border:'1px solid rgba(220,38,38,0.2)' }}>{error}</div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg, #6366f1, #0ea5e9)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading?0.8:1, letterSpacing:'0.01em', boxShadow:'0 4px 14px rgba(99,102,241,0.35)' }}>
          {loading ? 'Please wait...' : mode==='login' ? 'Sign In' : 'Create Account'}
        </button>

        <div style={{ textAlign:'center', marginTop:20, fontSize:13, color:'#9ca3af' }}>
          {mode==='login' ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={()=>{setMode(mode==='login'?'signup':'login');setError('')}} style={{ color:'#6366f1', cursor:'pointer', fontWeight:700 }}>
            {mode==='login' ? 'Sign up' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  )
}
