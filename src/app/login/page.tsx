'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Mode = 'login' | 'signup' | 'forgot'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<Mode>('login')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const inp: React.CSSProperties = {
    fontFamily:'inherit',
    fontSize:13,
    padding:'10px 12px',
    border:'1px solid #333',
    borderRadius:8,
    background:'#1f1f1f',
    color:'#fff',
    width:'100%',
    outline:'none'
  }

  const lbl: React.CSSProperties = {
    fontSize:12,
    fontWeight:600,
    color:'#9ca3af',
    display:'block',
    marginBottom:6
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setSuccess('')
    setPassword('')
  }

  async function handleForgotPassword() {
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }

    setLoading(true)

    try {
      const redirectTo =
        `${window.location.origin}/auth/callback?next=/reset-password`

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          { redirectTo }
        )

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(
        'Password reset email sent. Please check your inbox and follow the link.'
      )
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit() {
    if (mode === 'forgot') {
      await handleForgotPassword()
      return
    }

    setError('')
    setSuccess('')

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)

    try {
      if (mode === 'login') {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          })

        if (error || !data.session) {
          await supabase.auth.signOut()
          setError('Wrong email or password. Please try again.')
          return
        }

        router.push('/dashboard/time')
        router.refresh()
        return
      }

      if (!name.trim()) {
        setError('Please enter your name.')
        return
      }

      const { data, error } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
        })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        const { data: existing } =
          await supabase
            .from('profiles')
            .select('id')
            .eq('id', data.user.id)
            .single()

        if (!existing) {
          const { error: profileError } =
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                name: name.trim(),
                role: 'Employee',
                team: 'PR Department',
                hourly_rate: 0,
                leave_allowance: 21,
              })

          if (profileError) {
            setError(profileError.message)
            return
          }
        }

        router.push('/dashboard/time')
        router.refresh()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight:'100vh',
        background:'#0d0d0d',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        position:'relative',
        overflow:'hidden'
      }}
    >
      <div
        style={{
          position:'absolute',
          inset:0,
          backgroundImage:
            'linear-gradient(rgba(180,185,90,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(180,185,90,0.04) 1px, transparent 1px)',
          backgroundSize:'40px 40px',
          pointerEvents:'none'
        }}
      />

      <div
        style={{
          position:'absolute',
          top:'30%',
          left:'50%',
          transform:'translate(-50%,-50%)',
          width:500,
          height:500,
          background:
            'radial-gradient(circle, rgba(180,185,60,0.08) 0%, transparent 70%)',
          pointerEvents:'none'
        }}
      />

      <div
        style={{
          width:460,
          maxWidth:'95vw',
          position:'relative'
        }}
      >
        <div
          style={{
            background:'#1a1a1a',
            border:'1px solid #2a2a2a',
            borderRadius:'16px 16px 0 0',
            padding:'32px 40px 24px',
            display:'flex',
            flexDirection:'column',
            alignItems:'center',
            borderBottom:'1px solid #2a2a2a'
          }}
        >
          <img
            src="/cms-logo.png"
            alt="CM Solutions"
            style={{
              width:140,
              objectFit:'contain',
              marginBottom:16
            }}
          />

          <div
            style={{
              fontSize:11,
              fontWeight:700,
              letterSpacing:'0.2em',
              textTransform:'uppercase',
              color:'#6b7280'
            }}
          >
            PR Work Intelligence
          </div>
        </div>

        <div
          style={{
            background:'#141414',
            border:'1px solid #2a2a2a',
            borderTop:'none',
            borderRadius:'0 0 16px 16px',
            padding:'28px 40px 32px'
          }}
        >
          <div style={{ marginBottom:24 }}>
            <div
              style={{
                fontWeight:800,
                fontSize:22,
                letterSpacing:-0.5,
                color:'#fff',
                marginBottom:4
              }}
            >
              Work
              <span style={{ color:'#b4b93c' }}>
                IQ
              </span>
            </div>

            <div
              style={{
                color:'#6b7280',
                fontSize:13
              }}
            >
              {mode === 'login'
                ? 'Sign in to the PR workspace'
                : mode === 'signup'
                  ? 'Create your PR Department account'
                  : 'Reset your WorkIQ password'}
            </div>
          </div>

          {mode === 'signup' && (
            <div style={{ marginBottom:14 }}>
              <label style={lbl}>Full Name</label>

              <input
                style={inp}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Email</label>

            <input
              style={inp}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@cm-solutions.co.za"
              onKeyDown={e => {
                if (e.key === 'Enter') handleSubmit()
              }}
            />
          </div>

          {mode !== 'forgot' && (
            <div style={{ marginBottom:12 }}>
              <label style={lbl}>Password</label>

              <input
                style={inp}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSubmit()
                }}
              />
            </div>
          )}

          {mode === 'login' && (
            <div
              style={{
                textAlign:'right',
                marginBottom:18
              }}
            >
              <span
                onClick={() => switchMode('forgot')}
                style={{
                  color:'#b4b93c',
                  cursor:'pointer',
                  fontSize:12,
                  fontWeight:700
                }}
              >
                Forgot password?
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                color:'#f87171',
                fontSize:13,
                marginBottom:16,
                padding:'10px 14px',
                background:'rgba(248,113,113,0.1)',
                borderRadius:8,
                border:'1px solid rgba(248,113,113,0.2)'
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                color:'#86efac',
                fontSize:13,
                marginBottom:16,
                padding:'10px 14px',
                background:'rgba(34,197,94,0.1)',
                borderRadius:8,
                border:'1px solid rgba(34,197,94,0.2)'
              }}
            >
              {success}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width:'100%',
              padding:'12px',
              background:
                'linear-gradient(135deg, #b4b93c, #8a8e2a)',
              color:'#000',
              border:'none',
              borderRadius:8,
              fontSize:14,
              fontWeight:800,
              cursor:loading ? 'not-allowed' : 'pointer',
              opacity:loading ? 0.8 : 1,
              letterSpacing:'0.02em',
              boxShadow:'0 4px 14px rgba(180,185,60,0.3)'
            }}
          >
            {loading
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign In'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Link'}
          </button>

          {mode === 'forgot' ? (
            <div
              style={{
                textAlign:'center',
                marginTop:18,
                fontSize:13,
                color:'#6b7280'
              }}
            >
              Remember your password?{' '}

              <span
                onClick={() => switchMode('login')}
                style={{
                  color:'#b4b93c',
                  cursor:'pointer',
                  fontWeight:700
                }}
              >
                Sign in
              </span>
            </div>
          ) : (
            <div
              style={{
                textAlign:'center',
                marginTop:18,
                fontSize:13,
                color:'#6b7280'
              }}
            >
              {mode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}

              <span
                onClick={() =>
                  switchMode(
                    mode === 'login'
                      ? 'signup'
                      : 'login'
                  )
                }
                style={{
                  color:'#b4b93c',
                  cursor:'pointer',
                  fontWeight:700
                }}
              >
                {mode === 'login'
                  ? 'Sign up'
                  : 'Sign in'}
              </span>
            </div>
          )}

          <div
            style={{
              marginTop:24,
              paddingTop:20,
              borderTop:'1px solid #2a2a2a',
              textAlign:'center'
            }}
          >
            <div
              style={{
                fontSize:10,
                fontWeight:700,
                letterSpacing:'0.12em',
                textTransform:'uppercase',
                color:'#3a3a3a'
              }}
            >
              CM Solutions | Metallurgical Consultancy and Laboratories | Est. 2003
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
