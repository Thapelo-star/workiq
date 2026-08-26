'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  async function updatePassword() {
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const { error } =
      await supabase.auth.updateUser({
        password
      })

    if (error) {
      setLoading(false)
      setError(
        'The reset link may have expired. Please request a new one.'
      )
      return
    }

    await supabase.auth.signOut()

    router.push('/login')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight:'100vh',
        background:'#0d0d0d',
        display:'flex',
        alignItems:'center',
        justifyContent:'center',
        padding:20
      }}
    >
      <div
        style={{
          width:440,
          maxWidth:'95vw',
          background:'#141414',
          border:'1px solid #2a2a2a',
          borderRadius:16,
          padding:'32px 40px'
        }}
      >
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <img
            src="/cms-logo.png"
            alt="CM Solutions"
            style={{
              width:130,
              objectFit:'contain',
              marginBottom:16
            }}
          />

          <div
            style={{
              color:'#fff',
              fontSize:22,
              fontWeight:800
            }}
          >
            Set New Password
          </div>

          <div
            style={{
              color:'#6b7280',
              fontSize:13,
              marginTop:5
            }}
          >
            Choose a new password for your WorkIQ account.
          </div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label
            style={{
              fontSize:12,
              fontWeight:600,
              color:'#9ca3af',
              display:'block',
              marginBottom:6
            }}
          >
            New Password
          </label>

          <input
            style={inp}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <label
            style={{
              fontSize:12,
              fontWeight:600,
              color:'#9ca3af',
              display:'block',
              marginBottom:6
            }}
          >
            Confirm New Password
          </label>

          <input
            style={inp}
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />
        </div>

        {error && (
          <div
            style={{
              color:'#f87171',
              fontSize:13,
              marginBottom:16,
              padding:'10px 14px',
              background:'rgba(248,113,113,0.1)',
              borderRadius:8
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={updatePassword}
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
            cursor:loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading
            ? 'Updating...'
            : 'Update Password'}
        </button>
      </div>
    </div>
  )
}
