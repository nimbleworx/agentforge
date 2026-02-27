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

const STEPS = ['identity', 'basics', 'goals', 'tone', 'integrations'] as const
type Step = typeof STEPS[number]

const STEP_LABELS: Record<Step, string> = {
  identity: 'Business Identity',
  basics: 'Basics',
  goals: 'Goals',
  tone: 'Tone',
  integrations: 'Integrations',
}

// ── Shared components ─────────────────────────────────────────────────────────

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

function TextArea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder: string; rows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: '100%', background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
        padding: '13px 16px', color: '#fff', fontSize: 14,
        outline: 'none', resize: 'vertical', lineHeight: 1.6,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    />
  )
}

function TagInput({ values, onChange, placeholder }: {
  values: string[]; onChange: (v: string[]) => void; placeholder: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput('')
  }

  function remove(tag: string) {
    onChange(values.filter(v => v !== tag))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: values.length ? 10 : 0 }}>
        {values.map(tag => (
          <div key={tag} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(232,255,107,0.08)', border: '1px solid rgba(232,255,107,0.2)',
            borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#E8FF6B',
          }}>
            {tag}
            <button onClick={() => remove(tag)} style={{ background: 'none', border: 'none', color: '#E8FF6B', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none',
            fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          }}
        />
        <button onClick={add} style={{
          padding: '10px 16px', borderRadius: 10, background: 'rgba(232,255,107,0.1)',
          border: '1px solid rgba(232,255,107,0.2)', color: '#E8FF6B',
          cursor: 'pointer', fontSize: 13, fontWeight: 700,
        }}>Add</button>
      </div>
      <div style={{ fontSize: 10, color: '#444', marginTop: 6 }}>Press Enter or click Add after each one</div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const EMPTY_DATA: OnboardingData = {
  mission: '', vision: '', valuesStatement: '', ethicsStatement: '',
  products: '', brandVoice: '', brandKeywords: [], brandAvoid: [],
  businessName: '', businessType: '', stage: '',
  goals: [], tone: '', integrations: [],
}

export default function OnboardingPage() {
  const router = useRouter()
  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<OnboardingData>(EMPTY_DATA)

  const step = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  function set<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData(d => ({ ...d, [key]: value }))
  }

  function canProceed() {
    if (step === 'identity') return !!(data.mission.trim() && data.valuesStatement.trim() && data.products.trim())
    if (step === 'basics') return !!(data.businessName.trim() && data.businessType && data.stage)
    if (step === 'goals') return data.goals.length > 0
    if (step === 'tone') return !!data.tone
    return true
  }

  const recommendedAgents = [...new Set(
    data.goals.flatMap(g =>
      Object.values(AGENT_ROLES).filter(r => r.goals.includes(g)).map(r => r.id)
    )
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
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              <div style={{
                width: 28, height: 4, borderRadius: 4,
                background: i <= stepIndex ? '#E8FF6B' : 'rgba(255,255,255,0.08)',
                transition: 'background 0.3s',
              }} />
              <div style={{ fontSize: 8, color: i <= stepIndex ? '#E8FF6B' : '#333', letterSpacing: 0.5 }}>{STEP_LABELS[s]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: '#444' }}>Step {stepIndex + 1} of {STEPS.length}</div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '96px 32px 80px' }}>
        <div className="fade-up">

          {/* ── STEP 0: Identity ── */}
          {step === 'identity' && (
            <>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,255,107,0.08)', border: '1px solid rgba(232,255,107,0.2)', borderRadius: 20, padding: '5px 14px', marginBottom: 20 }}>
                <span style={{ fontSize: 14 }}>◈</span>
                <span style={{ fontSize: 11, color: '#E8FF6B', fontWeight: 700, letterSpacing: 1 }}>BUSINESS IDENTITY</span>
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Let&apos;s build your business DNA</h2>
              <p style={{ color: '#aaa', fontSize: 15, marginBottom: 32, lineHeight: 1.7 }}>
                This is committed to memory across every agent — your support, sales, and marketing agents will all know your mission, values, and voice. SAGE and EMBER will use your ethics and values to review every response.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                <div>
                  <label style={labelStyle}>Mission <span style={{ color: '#E8FF6B' }}>*</span></label>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Why does your business exist? What problem are you solving?</div>
                  <TextArea value={data.mission} onChange={v => set('mission', v)} placeholder="e.g. We exist to make sustainable fashion accessible to everyday people, not just those who can afford premium prices." />
                </div>

                <div>
                  <label style={labelStyle}>Vision</label>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Where are you going? What does success look like in 5–10 years?</div>
                  <TextArea value={data.vision} onChange={v => set('vision', v)} placeholder="e.g. A world where every wardrobe is built to last, and fast fashion is the exception not the rule." />
                </div>

                <div>
                  <label style={labelStyle}>Products & Services <span style={{ color: '#E8FF6B' }}>*</span></label>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>What do you sell or offer? Be specific — your agents need to know this.</div>
                  <TextArea value={data.products} onChange={v => set('products', v)} placeholder="e.g. We sell ethically-made clothing including shirts, jackets, and accessories. We also offer a repair service and a buy-back scheme for old garments." rows={4} />
                </div>

                <div>
                  <label style={labelStyle}>Core Values <span style={{ color: '#E8FF6B' }}>*</span></label>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>What principles guide every decision you make?</div>
                  <TextArea value={data.valuesStatement} onChange={v => set('valuesStatement', v)} placeholder="e.g. Sustainability first — we never compromise on environmental impact. Radical transparency — we share our supply chain openly. Community over profit — we reinvest in the makers behind our products." rows={4} />
                </div>

                <div>
                  <label style={labelStyle}>Ethics Commitments</label>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>What lines will you never cross? SAGE will enforce these in every agent response.</div>
                  <TextArea value={data.ethicsStatement} onChange={v => set('ethicsStatement', v)} placeholder="e.g. We never use manipulative sales tactics or false scarcity. We never make environmental claims we cannot back up with data. We treat every customer with dignity regardless of their spending." rows={4} />
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24 }}>
                  <div style={{ fontSize: 11, color: '#E8FF6B', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>Brand Voice</div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Brand Voice Description</label>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>How does your brand sound? EMBER will use this to review every response.</div>
                    <TextArea value={data.brandVoice} onChange={v => set('brandVoice', v)} placeholder="e.g. We sound like a knowledgeable friend — warm, honest, and never condescending. We use plain language, avoid jargon, and always lead with empathy." />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Words & phrases to use</label>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Add words that feel on-brand for you.</div>
                    <TagInput values={data.brandKeywords} onChange={v => set('brandKeywords', v)} placeholder="e.g. sustainable, crafted, community..." />
                  </div>

                  <div>
                    <label style={labelStyle}>Words & phrases to avoid</label>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>Add anything that feels off-brand or against your values.</div>
                    <TagInput values={data.brandAvoid} onChange={v => set('brandAvoid', v)} placeholder="e.g. cheap, deal, limited time only..." />
                  </div>
                </div>

              </div>
            </>
          )}

          {/* ── STEP 1: Basics ── */}
          {step === 'basics' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Tell us about your business</h2>
              <p style={{ color: '#aaa', fontSize: 15, marginBottom: 32 }}>Just the basics — we&apos;ll personalise everything from here.</p>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>Business name</label>
                <input value={data.businessName} onChange={e => setData(d => ({ ...d, businessName: e.target.value }))}
                  placeholder="e.g. Bloom Studio, TechFlow, Maya's Bakery..."
                  autoFocus style={inputStyle} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>What kind of business?</label>
                <ChoiceGrid items={BUSINESS_TYPES} selected={data.businessType} onSelect={(v: BusinessType) => setData(d => ({ ...d, businessType: v }))} cols={4} />
              </div>
              <div>
                <label style={labelStyle}>Where are you at?</label>
                <ChoiceGrid items={BUSINESS_STAGES} selected={data.stage} onSelect={(v: BusinessStage) => setData(d => ({ ...d, stage: v }))} cols={2} />
              </div>
            </>
          )}

          {/* ── STEP 2: Goals ── */}
          {step === 'goals' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
                What does {data.businessName || 'your business'} need most?
              </h2>
              <p style={{ color: '#aaa', fontSize: 15, marginBottom: 32 }}>Pick everything that applies — we&apos;ll build agents to match.</p>
              <ChoiceGrid items={GOALS} selected={data.goals} multi onSelect={(v: string[]) => setData(d => ({ ...d, goals: v }))} cols={3} />
              {recommendedAgents.length > 0 && (
                <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(232,255,107,0.05)', border: '1px solid rgba(232,255,107,0.15)', borderRadius: 12 }}>
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

          {/* ── STEP 3: Tone ── */}
          {step === 'tone' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>How should your AI sound?</h2>
              <p style={{ color: '#aaa', fontSize: 15, marginBottom: 32 }}>Your agents will match this tone in every interaction.</p>
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
                    <div style={{ fontSize: 12, color: '#555', fontStyle: 'italic' }}>&ldquo;{t.example}&rdquo;</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* ── STEP 4: Integrations ── */}
          {step === 'integrations' && (
            <>
              <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Any tools to connect?</h2>
              <p style={{ color: '#aaa', fontSize: 15, marginBottom: 32 }}>We&apos;ll link your agents to tools you already use. You can always add more later.</p>
              <ChoiceGrid items={INTEGRATIONS} selected={data.integrations} multi onSelect={(v: string[]) => setData(d => ({ ...d, integrations: v }))} cols={4} />

              {/* Identity summary */}
              <div style={{ marginTop: 32, background: 'rgba(232,255,107,0.04)', border: '1px solid rgba(232,255,107,0.1)', borderRadius: 14, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, color: '#E8FF6B', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 }}>Business Identity Summary</div>
                {[
                  { label: 'Mission', value: data.mission },
                  { label: 'Values', value: data.valuesStatement },
                  { label: 'Products', value: data.products },
                  { label: 'Brand Voice', value: data.brandVoice },
                ].map(row => row.value ? (
                  <div key={row.label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.6 }}>{row.value.length > 120 ? row.value.slice(0, 120) + '…' : row.value}</div>
                  </div>
                ) : null)}
                {data.brandKeywords.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Brand Keywords</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {data.brandKeywords.map(k => (
                        <span key={k} style={{ fontSize: 11, background: 'rgba(232,255,107,0.08)', border: '1px solid rgba(232,255,107,0.15)', borderRadius: 10, padding: '2px 10px', color: '#E8FF6B' }}>{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

        </div>

        {error && (
          <div style={{ margin: '20px 0', padding: '12px 16px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171', fontSize: 13 }}>{error}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => stepIndex > 0 ? setStepIndex(i => i - 1) : router.push('/')} style={{ padding: '12px 24px', borderRadius: 12, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#555', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>← Back</button>
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
            {saving ? 'Building your system...' : step === 'integrations' ? 'Build my system →' : 'Continue →'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.35s ease-out both; }
        textarea::placeholder, input::placeholder { color: #333; }
        textarea:focus, input:focus { border-color: rgba(232,255,107,0.3) !important; }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#aaa',
  fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
  padding: '13px 16px', color: '#fff', fontSize: 16, outline: 'none', marginBottom: 4,
}
