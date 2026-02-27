'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingData, BusinessType, BusinessStage, AgentTone, AGENT_ROLES } from '@/types'

// ── Data ──────────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { id: 'ecommerce', label: 'E-commerce', icon: '🛍️' },
  { id: 'consulting', label: 'Consulting', icon: '💼' },
  { id: 'saas', label: 'SaaS / Tech', icon: '💻' },
  { id: 'creative', label: 'Creative / Agency', icon: '🎨' },
  { id: 'health', label: 'Health & Wellness', icon: '🌿' },
  { id: 'food', label: 'Food & Hospitality', icon: '🍽️' },
  { id: 'education', label: 'Education', icon: '📚' },
  { id: 'other', label: 'Something else', icon: '✨' },
]

const BUSINESS_STAGES = [
  { id: 'idea', label: 'Just an idea', sub: 'Pre-revenue, still planning' },
  { id: 'early', label: 'Early days', sub: 'First customers, finding my feet' },
  { id: 'growing', label: 'Growing', sub: 'Consistent revenue, scaling up' },
  { id: 'established', label: 'Established', sub: 'Running well, optimising' },
]

const GOALS = [
  { id: 'support', label: 'Handle customer questions', icon: '💬' },
  { id: 'sales', label: 'Convert more leads', icon: '📈' },
  { id: 'admin', label: 'Cut admin & paperwork', icon: '📋' },
  { id: 'marketing', label: 'Create content & campaigns', icon: '📣' },
  { id: 'finance', label: 'Track money & reports', icon: '💰' },
  { id: 'ops', label: 'Keep operations smooth', icon: '⚙️' },
]

const TONES: { id: AgentTone; label: string; desc: string; example: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Clear, authoritative, trustworthy', example: 'Thank you for reaching out. I\'d be happy to assist you with that.' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm, approachable, personable', example: 'Hey! Great to hear from you — let\'s sort this out together.' },
  { id: 'expert', label: 'Expert', desc: 'Knowledgeable, precise, confident', example: 'Based on current data, the optimal approach here would be...' },
  { id: 'casual', label: 'Casual', desc: 'Relaxed, conversational, human', example: 'Sure thing! Here\'s what I\'d suggest...' },
]

const INTEGRATIONS = [
  { id: 'email', label: 'Email', icon: '✉️', desc: 'Gmail or Outlook' },
  { id: 'slack', label: 'Slack', icon: '💬', desc: 'Team messaging' },
  { id: 'calendar', label: 'Calendar', icon: '📅', desc: 'Google or Outlook' },
  { id: 'crm', label: 'CRM', icon: '🗂️', desc: 'HubSpot, Salesforce' },
  { id: 'shopify', label: 'Shopify', icon: '🛒', desc: 'E-commerce store' },
  { id: 'stripe', label: 'Stripe', icon: '💳', desc: 'Payments & billing' },
  { id: 'notion', label: 'Notion', icon: '📓', desc: 'Docs & knowledge base' },
  { id: 'none', label: 'Not yet', icon: '⏳', desc: 'Set up later' },
]

const STEPS = ['basics', 'goals', 'tone', 'integrations'] as const
type Step = typeof STEPS[number]

// ── Components ────────────────────────────────────────────────────────────────

function ChoiceGrid({ items, selected, onSelect, multi = false, cols = 4 }: {
  items: { id: string; label: string; icon?: string; sub?: string; desc?: string }[]
  selected: string | string[]
  onSelect: (v: any) => void
  multi?: boolean
  cols?: number
}) {
  function isSelected(id: string) {
    return multi ? (selected as string[]).includes(id) : selected === id
  }
  function toggle(id: string) {
    if (!multi) { onSelect(id); return }
    if (id === 'none') { onSelect(['none']); return }
    const cur = (selected as string[]).filter(x => x !== 'none')
    onSelect(cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id])
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10 }}>
      {items.map(item => (
        <button key={item.id} onClick={() => toggle(item.id)} style={{
          padding: '16px 14px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
          border: `1.5px solid ${isSelected(item.id) ? '#E8FF6B' : 'rgba(255,255,255,0.07)'}`,
          background: isSelected(item.id) ? 'rgba(232,255,107,0.07)' : 'rgba(255,255,255,0.02)',
          color: isSelected(item.id) ? '#fff' : '#777', transition: 'all 0.15s',
        }}>
          {item.icon && <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>}
          <div style={{ fontSize: 13, fontWeight: 700 }}>{item.label}</div>
          {(item.sub || item.desc) && <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{item.sub || item.desc}</div>}
        </button>
      ))}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>({
    businessName: '', businessType: '', stage: '',
    goals: [], tone: '', integrations: [],
  })

  const step = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  function canProceed() {
    if (step === 'basics') return !!(data.businessName.trim() && data.businessType && data.stage)
    if (step === 'goals') return data.goals.length > 0
    if (step === 'tone') return !!data.tone
    return true // integrations always optional
  }

  // Get recommended agents for preview
  const recommendedAgents = [...new Set(
    data.goals
      .flatMap(g => Object.values(AGENT_ROLES).filter(r => r.goals.includes(g)).map(r => r.id))
  )].map(id => AGENT_ROLES[id])

  async function finish() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/agents/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Setup failed. Please try again.')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0B0F', color: '#fff', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Progress bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.04)', zIndex: 50 }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#E8FF6B', transition: 'width 0.4s ease', borderRadius: '0 4px 4px 0' }} />
      </div>

      {/* Nav */}
      <div style={{
        position: 'fixed', top: 3, left: 0, right: 0, height: 52,
        background: 'rgba(10,11,15,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', zIndex: 40,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: '#E8FF6B' }}>◈ AGENTFORGE</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              width: 28, height: 4, borderRadius: 4,
              background: i <= stepIndex ? '#E8FF6B' : 'rgba(255,255,255,0.08)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#444' }}>Step {stepIndex + 1} of {STEPS.length}</div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '96px 32px 80px' }}>
        <div className="fade-up">

          {step === 'basics' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Tell us about your business</h2>
              <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>Just the basics — we'll personalise everything from here.</p>
              <div style={{ marginBottom: 24 }}>
                <label style={label}>Business name</label>
                <input value={data.businessName} onChange={e => setData(d => ({ ...d, businessName: e.target.value }))}
                  placeholder="e.g. Bloom Studio, TechFlow, Maya's Bakery..."
                  autoFocus style={input} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={label}>What kind of business?</label>
                <ChoiceGrid items={BUSINESS_TYPES} selected={data.businessType}
                  onSelect={(v: BusinessType) => setData(d => ({ ...d, businessType: v }))} cols={4} />
              </div>
              <div>
                <label style={label}>Where are you at?</label>
                <ChoiceGrid items={BUSINESS_STAGES} selected={data.stage}
                  onSelect={(v: BusinessStage) => setData(d => ({ ...d, stage: v }))} cols={2} />
              </div>
            </>
          )}

          {step === 'goals' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                What does {data.businessName || 'your business'} need most?
              </h2>
              <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>Pick everything that applies — we'll build agents to match.</p>
              <ChoiceGrid items={GOALS} selected={data.goals} multi
                onSelect={(v: string[]) => setData(d => ({ ...d, goals: v }))} cols={3} />
              {recommendedAgents.length > 0 && (
                <div style={{
                  marginTop: 20, padding: '14px 18px',
                  background: 'rgba(232,255,107,0.05)', border: '1px solid rgba(232,255,107,0.15)', borderRadius: 12,
                }}>
                  <div style={{ fontSize: 12, color: '#E8FF6B', fontWeight: 700, marginBottom: 6 }}>
                    We&apos;ll create {recommendedAgents.length} agent{recommendedAgents.length !== 1 ? 's' : ''} for you:
                  </div>
                  <div style={{ fontSize: 12, color: '#888' }}>
                    {recommendedAgents.map(r => `${r.icon} ${r.name}`).join('  ·  ')}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'tone' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>How should your AI sound?</h2>
              <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>Your agents will match this tone in every interaction.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {TONES.map(t => (
                  <button key={t.id} onClick={() => setData(d => ({ ...d, tone: t.id }))} style={{
                    padding: '18px 22px', borderRadius: 14, textAlign: 'left', cursor: 'pointer',
                    border: `1.5px solid ${data.tone === t.id ? '#E8FF6B' : 'rgba(255,255,255,0.07)'}`,
                    background: data.tone === t.id ? 'rgba(232,255,107,0.06)' : 'rgba(255,255,255,0.02)',
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: data.tone === t.id ? '#fff' : '#aaa' }}>{t.label}</span>
                      <span style={{ fontSize: 11, color: '#555' }}>{t.desc}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>"{t.example}"</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'integrations' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Any tools to connect?</h2>
              <p style={{ color: '#555', fontSize: 15, marginBottom: 32 }}>We'll link your agents to tools you already use. You can always add more later.</p>
              <ChoiceGrid items={INTEGRATIONS} selected={data.integrations} multi
                onSelect={(v: string[]) => setData(d => ({ ...d, integrations: v }))} cols={4} />
            </>
          )}

        </div>

        {/* Error */}
        {error && (
          <div style={{
            margin: '20px 0', padding: '12px 16px', borderRadius: 10,
            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)',
            color: '#F87171', fontSize: 13,
          }}>{error}</div>
        )}

        {/* Nav buttons */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 40,
          paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <button onClick={() => stepIndex > 0 ? setStepIndex(i => i - 1) : router.push('/')} style={{
            padding: '12px 24px', borderRadius: 12,
            background: 'none', border: '1px solid rgba(255,255,255,0.08)',
            color: '#555', cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}>← Back</button>

          <button
            onClick={step === 'integrations' ? finish : () => setStepIndex(i => i + 1)}
            disabled={!canProceed() || saving}
            style={{
              padding: '12px 36px', borderRadius: 12,
              background: canProceed() && !saving ? '#E8FF6B' : 'rgba(255,255,255,0.04)',
              border: 'none',
              color: canProceed() && !saving ? '#0A0B0F' : '#333',
              cursor: canProceed() && !saving ? 'pointer' : 'default',
              fontSize: 14, fontWeight: 900, transition: 'all 0.2s',
              boxShadow: canProceed() ? '0 0 24px rgba(232,255,107,0.15)' : 'none',
            }}>
            {saving ? 'Setting up your agents...' : step === 'integrations' ? 'Build my system →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}

const label: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#555',
  fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10,
}
const input: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
  padding: '13px 16px', color: '#fff', fontSize: 16, outline: 'none', marginBottom: 4,
}
