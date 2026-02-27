import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column',
      padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden',
      background: '#0A0B0F',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500, pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(232,255,107,0.05) 0%, transparent 70%)',
      }} />

      <div className="fade-up" style={{ fontSize: 11, color: '#E8FF6B', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 24, fontWeight: 700 }}>
        ◈ AgentForge
      </div>

      <h1 className="fade-up" style={{
        fontSize: 'clamp(36px, 7vw, 58px)', fontWeight: 900,
        color: '#fff', margin: '0 0 20px', letterSpacing: -2,
        lineHeight: 1.1, maxWidth: 620,
      }}>
        Your AI team,{' '}
        <span style={{ color: '#E8FF6B' }}>ready in minutes.</span>
      </h1>

      <p className="fade-up" style={{
        color: '#555', fontSize: 17, maxWidth: 440,
        lineHeight: 1.75, margin: '0 0 48px',
      }}>
        Answer a few quick questions and we'll build a personalised AI support
        system for your business — no tech skills needed.
      </p>

      <div className="fade-up" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link href="/login" style={{
          padding: '16px 40px', borderRadius: 14,
          background: '#E8FF6B', color: '#0A0B0F',
          fontWeight: 900, fontSize: 16, textDecoration: 'none',
          boxShadow: '0 0 40px rgba(232,255,107,0.2)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}>
          Get started — it&apos;s free →
        </Link>
        <Link href="/login?mode=signin" style={{
          padding: '16px 28px', borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#777', fontWeight: 600, fontSize: 15, textDecoration: 'none',
        }}>
          Sign in
        </Link>
      </div>

      <p className="fade-up" style={{ marginTop: 20, fontSize: 12, color: '#333' }}>
        Takes about 3 minutes · No credit card required
      </p>

      {/* Social proof tags */}
      <div style={{
        position: 'absolute', bottom: 36,
        display: 'flex', gap: 28, flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {['🛍️ E-commerce', '💼 Consultants', '💻 SaaS founders', '🎨 Creatives'].map(l => (
          <span key={l} style={{ fontSize: 12, color: '#2a2a2a' }}>{l}</span>
        ))}
      </div>
    </main>
  )
}
