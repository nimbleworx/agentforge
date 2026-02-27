'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const params = useSearchParams()
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>(
    params.get('mode') === 'signin' ? 'signin' : 'signup'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setSent(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
      router.refresh()
    }
    setLoading(false)
  }

  if (sent) return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>📬</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Check your email</h2>
      <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>
        We sent a confirmation link to <strong style={{ color: '#fff' }}>{email}</strong>.<br />
        Click it to activate your account.
      </p>
    </div>
  )

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 3, color: '#E8FF6B', marginBottom: 20 }}>◈ AGENTFORGE</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ color: '#555', fontSize: 14 }}>
          {mode === 'signup' ? 'Free to start. No credit card needed.' : 'Sign in to your workspace.'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Email</label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Password</label>
          <input
            type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            style={inputStyle}
          />
        </div>

        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#F87171', fontSize: 13,
          }}>{error}</div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: loading ? 'rgba(232,255,107,0.5)' : '#E8FF6B',
          border: 'none', color: '#0A0B0F',
          fontWeight: 900, fontSize: 15, cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create account →' : 'Sign in →'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError('') }}
          style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13 }}>
          {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0A0B0F',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20, padding: '40px 36px',
      }}>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#555',
  fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
  padding: '12px 16px', color: '#fff', fontSize: 15, outline: 'none',
}
