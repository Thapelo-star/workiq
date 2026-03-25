'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TEAMS = [
  'Analytical Department',
  'Lab Management Department',
  'Metallurgical Department',
  'Consulting Department',
  'Admin Department',
  'Management',
  'PR Department',
]

const ROLES = ['Employee', 'Project Lead', 'Manager', 'Executive', 'Admin']

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('Employee')
  const [team, setTeam] = useState('Analytical Department')
  const [mode, setMode] = useState<'login'|'signup'>('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const inp: React.CSSProperties = {
    fontFamily:'inherit', fontSize:13, padding:'10px 12px',
    border:'1px solid #333', borderRadius:8, background:'#1f1f1f',
    color:'#fff', width:'100%', outline:'none'
  }
  const lbl: React.CSSProperties = {
    fontSize:12, fontWeight:600, color:'#9ca3af', display:'block', marginBottom:6
  }

  async function handleSubmit() {
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) { setError(signInError.message); return }
        router.push('/dashboard'); router.refresh()
      } else {
        if (!name.trim()) { setError('Please enter your full name.'); return }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, role, team } }
        })

        if (signUpError) { setError(signUpError.message); return }

        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            role: role,
            team: team,
            hourly_rate: 0,
            leave_allowance: 21,
          }, { onConflict: 'id' })

          if (profileError) {
            setError('Account created but profile failed: ' + profileError.message)
            return
          }

          if (data.session) {
            router.push('/dashboard'); router.refresh()
          } else {
            setSuccess('Account created successfully! You can now sign in.')
            setMode('login')
            setName(''); setPassword('')
          }
        }
      }
    } catch (e: any) {
      setError('Unexpected error: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0d0d0d', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(180,185,90,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(180,185,90,0.04) 1px, transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }} />
      <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:500, height:500, background:'radial-gradient(circle, rgba(180,185,60,0.08) 0%, transparent 70%)', pointerEvents:'none' }} />

      <div style={{ width:460, maxWidth:'95vw', position:'relative' }}>
        <div style={{ background:'#1a1a1a', border:'1px solid #2a2a2a', borderRadius:'16px 16px 0 0', padding:'24px 40px 20px', display:'flex', flexDirection:'column', alignItems:'center', borderBottom:'1px solid #2a2a2a' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#b4b93c', letterSpacing:2, marginBottom:4 }}>CMS</div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', textTransform:'uppercase', color:'#6b7280' }}>Work Intelligence System</div>
        </div>

        <div style={{ background:'#141414', border:'1px solid #2a2a2a', borderTop:'none', borderRadius:'0 0 16px 16px', padding:'28px 40px 32px' }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontWeight:800, fontSize:22, letterSpacing:-0.5, color:'#fff', marginBottom:4 }}>
              Work<span style={{ color:'#b4b93c' }}>IQ</span>
            </div>
            <div style={{ color:'#6b7280', fontSize:13 }}>
              {mode==='login' ? 'Sign in to your workspace' : 'Create your account'}
            </div>
          </div>

          {success && (
            <div style={{ color:'#34d399', fontSize:13, marginBottom:16, padding:'10px 14px', background:'rgba(52,211,153,0.1)', borderRadius:8, border:'1px solid rgba(52,211,153,0.2)', fontWeight:500 }}>
              {success}
            </div>
          )}

          {mode==='signup' && (
            <>
              <div style={{ marginBottom:14 }}>
                <label style={lbl}>Full Name *</label>
                <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14 }}>
                <div>
                  <label style={lbl}>Role *</label>
                  <select style={inp} value={role} onChange={e=>setRole(e.target.value)}>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Department *</label>
                  <select style={inp} value={team} onChange={e=>setTeam(e.target.value)}>
                    {TEAMS.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:14, padding:'8px 12px', background:'rgba(180,185,60,0.08)', borderRadius:6, border:'1px solid rgba(180,185,60,0.2)' }}>
                <div style={{ fontSize:11, color:'#b4b93c', fontWeight:600 }}>
                  Signing up as: {role} ? {team}
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Email *</label>
            <input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@cmsolutions.co.za" onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
          </div>
          <div style={{ marginBottom:22 }}>
            <label style={lbl}>Password *</label>
            <input style={inp} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" onKeyDown={e=>e.key==='Enter'&&handleSubmit()} />
          </div>

          {error && (
            <div style={{ color:'#f87171', fontSize:13, marginBottom:16, padding:'10px 14px', background:'rgba(248,113,113,0.1)', borderRadius:8, border:'1px solid rgba(248,113,113,0.2)' }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg, #b4b93c, #8a8e2a)', color:'#000', border:'none', borderRadius:8, fontSize:14, fontWeight:800, cursor:loading?'not-allowed':'pointer', opacity:loading?0.8:1, letterSpacing:'0.02em', boxShadow:'0 4px 14px rgba(180,185,60,0.3)' }}>
            {loading ? 'Please wait...' : mode==='login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ textAlign:'center', marginTop:18, fontSize:13, color:'#6b7280' }}>
            {mode==='login' ? "Don't have an account? " : 'Already have an account? '}
            <span onClick={()=>{setMode(mode==='login'?'signup':'login');setError('');setSuccess('')}} style={{ color:'#b4b93c', cursor:'pointer', fontWeight:700 }}>
              {mode==='login' ? 'Sign up' : 'Sign in'}
            </span>
          </div>

          <div style={{ marginTop:24, paddingTop:20, borderTop:'1px solid #2a2a2a', textAlign:'center' }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'#3a3a3a' }}>
              CM Solutions ? Metallurgical Consultancy and Laboratories ? Est. 2003
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
