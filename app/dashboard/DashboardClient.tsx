'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Agent, Profile } from '@/types'

const GOV_ROLES = [
  { id: 'ceo', name: 'APEX', title: 'CEO', tier: 'executive', color: '#E8C547', icon: '◈', mandate: 'Overall strategic oversight and final decision authority across all agents.', policies: ['All agents must align with company mission', 'Escalate ethical conflicts immediately', 'Maintain transparency in all reporting'] },
  { id: 'sage', name: 'SAGE', title: 'Ethics & Compliance', tier: 'manager', color: '#F87171', icon: '⬡', mandate: 'Reviews every agent response for ethical compliance before delivery. Can trigger rework or escalate to human queue.', policies: ['Zero tolerance for bias or discriminatory outputs', 'No false urgency or high-pressure tactics', 'All agent responses audited in real time', 'Override authority over all worker agents'] },
  { id: 'ember', name: 'EMBER', title: 'Culture & Values', tier: 'manager', color: '#FB923C', icon: '⬡', mandate: 'Ensures all agent responses reflect company culture, tone of voice, and brand values.', policies: ['Tone must match brand voice at all times', 'Agents must show genuine warmth and care', 'Responses must be clear and jargon-free', 'Quarterly culture alignment reviews'] },
  { id: 'coo', name: 'NOVA', title: 'COO', tier: 'manager', color: '#4FC3F7', icon: '⬡', mandate: 'Oversees all operational agents. Ensures workflow efficiency and SLA adherence.', policies: ['Operational agents must respond within SLA', 'Flag capacity issues proactively'] },
  { id: 'cfo', name: 'VERA', title: 'CFO', tier: 'manager', color: '#A78BFA', icon: '⬡', mandate: 'Governs all finance agents. Sets reporting standards and monitors for anomalies.', policies: ['All financial outputs require verification', 'Flag anomalies immediately'] },
  { id: 'cio', name: 'ORYN', title: 'CIO', tier: 'manager', color: '#34D399', icon: '⬡', mandate: 'Oversees data strategy, security posture, and tech integrations.', policies: ['No agent may access data outside its scope', 'All integrations must be approved'] },
]

function MiniPip({ label, status }: { label: string; status: string }) {
  const cfg: Record<string, { bg: string; text: string; icon: string }> = {
    pass:      { bg: '#34D39911', text: '#34D399', icon: '✓' },
    rework:    { bg: '#F8717111', text: '#F87171', icon: '↩' },
    pending:   { bg: 'rgba(255,255,255,0.04)', text: '#444', icon: '·' },
    human:     { bg: '#FB923C11', text: '#FB923C', icon: '👤' },
    reviewing: { bg: '#E8C54711', text: '#E8C547', icon: '…' },
  }
  const c = cfg[status] || cfg.pending
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', background: c.bg, border: `1px solid ${c.text}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: c.text }}>{c.icon}</div>
      <span style={{ fontSize: 11, color: '#aaa', letterSpacing: 0.5 }}>{label}</span>
    </div>
  )
}

function PipelineBadge({ pipeline }: { pipeline: any }) {
  if (!pipeline) return null
  const isHuman = pipeline.humanQueue
  const allPass = pipeline.sage === 'pass' && pipeline.ember === 'pass'
  return (
    <div style={{ marginTop: 6, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <MiniPip label="SAGE" status={pipeline.sage} />
      <div style={{ width: 10, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <MiniPip label="EMBER" status={pipeline.ember} />
      <div style={{ width: 10, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <MiniPip label={isHuman ? 'HUMAN' : 'SENT'} status={isHuman ? 'human' : allPass ? 'pass' : 'pending'} />
      {pipeline.attempts > 1 && <span style={{ fontSize: 11, color: '#aaa', marginLeft: 4 }}>{pipeline.attempts} attempts</span>}
      {pipeline.sageNote && <div style={{ width: '100%', fontSize: 10, color: '#F87171', marginTop: 2 }}>SAGE: {pipeline.sageNote}</div>}
      {pipeline.emberNote && <div style={{ width: '100%', fontSize: 10, color: '#FB923C', marginTop: 2 }}>EMBER: {pipeline.emberNote}</div>}
    </div>
  )
}

function AgentChat({ agent, profile }: { agent: Agent; profile: Profile }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; pipeline?: any }[]>([
    { role: 'assistant', content: `Hi there! I am your ${agent.name} for ${profile.business_name}. How can I help you today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showPipeline, setShowPipeline] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function getOrCreateConversation() {
    if (conversationId) return conversationId
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('conversations').insert({ user_id: user!.id, agent_id: agent.id }).select('id').single()
    setConversationId(data!.id)
    return data!.id
  }

  async function send() {
    if (!input.trim() || loading) return
    const userContent = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user' as const, content: userContent }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const convId = await getOrCreateConversation()
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, conversationId: convId, messages: newMessages.slice(1).map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, pipeline: data.pipeline }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ background: '#0D0F14', border: `1px solid ${agent.color}33`, borderRadius: 16, display: 'flex', flexDirection: 'column', height: 440 }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${agent.color}18`, background: `${agent.color}08`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${agent.color}22`, border: `1px solid ${agent.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{agent.icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: '#aaa' }}>{agent.role} · online</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowPipeline(p => !p)} style={{ fontSize: 9, background: showPipeline ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${showPipeline ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.08)'}`, color: showPipeline ? '#F87171' : '#555', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>
            {showPipeline ? 'GOVERNANCE ON' : 'GOVERNANCE OFF'}
          </button>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%' }}>
              <div style={{ padding: '10px 14px', fontSize: 13, lineHeight: 1.6, color: '#ddd', borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: msg.role === 'user' ? `${agent.color}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${msg.role === 'user' ? agent.color + '33' : 'rgba(255,255,255,0.06)'}` }}>{msg.content}</div>
              {showPipeline && msg.role === 'assistant' && msg.pipeline && <PipelineBadge pipeline={msg.pipeline} />}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, padding: '6px 12px' }}>
              {[0, 1, 2].map(i => (<div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: agent.color, animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />))}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', paddingLeft: 12 }}>SAGE then EMBER reviewing...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={`Ask ${agent.name}...`} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
        <button onClick={send} disabled={!input.trim() || loading} style={{ padding: '10px 14px', borderRadius: 10, fontSize: 16, background: input.trim() ? `${agent.color}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${input.trim() ? agent.color + '44' : 'rgba(255,255,255,0.06)'}`, color: input.trim() ? agent.color : '#333', cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}>↑</button>
      </div>
    </div>
  )
}

function OrgNode({ role, onSelect, selected }: { role: any; onSelect: (r: any) => void; selected: any }) {
  const isSel = selected?.id === role.id
  const isExec = role.tier === 'executive'
  const size = isExec ? 72 : 56
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => onSelect(isSel ? null : role)}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: isSel ? `radial-gradient(circle at 35% 35%, ${role.color}bb, ${role.color}55)` : `radial-gradient(circle at 35% 35%, ${role.color}33, ${role.color}11)`, border: `${isSel ? 2 : 1.5}px solid ${isSel ? role.color : role.color + '55'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isExec ? 24 : 18, color: isSel ? '#fff' : role.color, transition: 'all 0.2s', boxShadow: isSel ? `0 0 24px ${role.color}44` : 'none' }}>{role.icon}</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: isExec ? 11 : 10, fontWeight: 800, color: isSel ? role.color : '#fff', letterSpacing: 1, fontFamily: 'monospace' }}>{role.name}</div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{role.title}</div>
      </div>
    </div>
  )
}

function OrgChart({ agents }: { agents: Agent[] }) {
  const [selected, setSelected] = useState<any>(null)
  const ceo = GOV_ROLES.find(r => r.id === 'ceo')!
  const managers = GOV_ROLES.filter(r => r.tier === 'manager')
  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 300px' : '1fr', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><OrgNode role={ceo} onSelect={setSelected} selected={selected} /></div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><div style={{ width: 1, height: 24, background: 'rgba(232,197,71,0.3)' }} /></div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '0 8%', marginBottom: 8 }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 24 }}>
          {managers.map(r => (
            <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 1, height: 20, background: `${r.color}33` }} />
              <OrgNode role={r} onSelect={setSelected} selected={selected} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.06)' }} /></div>
        <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center', marginBottom: 16 }}>Your Worker Agents</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
          {agents.map(a => (
            <div key={a.id} onClick={() => setSelected(selected?.id === a.id ? null : { ...a, tier: 'worker', mandate: a.description, policies: [] })} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${a.color}22`, border: `1.5px solid ${a.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{a.icon}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>{a.role}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '12px 24px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10, maxWidth: 480, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>Cross-Cutting Authority</div>
          <div style={{ fontSize: 12, color: '#aaa', lineHeight: 1.6 }}><span style={{ color: '#F87171' }}>SAGE</span> and <span style={{ color: '#FB923C' }}>EMBER</span> review every response before it reaches you — regardless of which agent sent it.</div>
        </div>
      </div>
      {selected && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${selected.color}22`, borderRadius: 16, padding: '22px', animation: 'fadeUp 0.2s ease-out' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${selected.color}22`, border: `1px solid ${selected.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: selected.color }}>{selected.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{selected.name}</div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{selected.title}</div>
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>Mandate</div>
          <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7, marginBottom: selected.policies?.length ? 16 : 0 }}>{selected.mandate}</p>
          {selected.policies?.length > 0 && (
            <>
              <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Policies</div>
              {selected.policies.map((p: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 12px', marginBottom: 6 }}>
                  <span style={{ color: selected.color, fontSize: 10, marginTop: 1 }}>▸</span>
                  <span style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function GovernancePage() {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20, fontWeight: 700 }}>Active Governance Agents</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
        {GOV_ROLES.filter(r => r.id === 'sage' || r.id === 'ember').map(r => (
          <div key={r.id} style={{ background: `${r.color}06`, border: `1px solid ${r.color}22`, borderRadius: 16, padding: '22px 24px' }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `${r.color}22`, border: `1px solid ${r.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: r.color }}>{r.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>{r.title}</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 5px #34D399' }} />
                <span style={{ fontSize: 10, color: '#34D399' }}>Active</span>
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#aaa', lineHeight: 1.7, marginBottom: 14 }}>{r.mandate}</p>
            <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Policies</div>
            {r.policies.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                <span style={{ color: r.color, fontSize: 10, marginTop: 2 }}>▸</span>
                <span style={{ fontSize: 11, color: '#888', lineHeight: 1.6 }}>{p}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, fontWeight: 700 }}>How It Works</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '24px 28px', overflowX: 'auto' }}>
        {[
          { icon: '🤖', label: 'Worker Agent', sub: 'generates response', color: '#aaa', arrow: false },
          { icon: '', label: '', sub: '', color: '', arrow: true, arrowLabel: 'output' },
          { icon: '⬡', label: 'SAGE', sub: 'ethics review', color: '#F87171', arrow: false },
          { icon: '', label: '', sub: '', color: '', arrow: true, arrowLabel: 'pass / rework x3' },
          { icon: '⬡', label: 'EMBER', sub: 'culture review', color: '#FB923C', arrow: false },
          { icon: '', label: '', sub: '', color: '', arrow: true, arrowLabel: 'pass / rework x3' },
          { icon: '✓', label: 'You', sub: 'delivered', color: '#34D399', arrow: false },
        ].map((item, i) => (
          item.arrow ? (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 70, gap: 4 }}>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.15)' }}>→</div>
              <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>{item.arrowLabel}</div>
            </div>
          ) : (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 80 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${item.color}22`, border: `1.5px solid ${item.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: item.color }}>{item.icon}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{item.sub}</div>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  )
}

export default function DashboardClient({ profile, agents }: { profile: Profile; agents: Agent[] }) {
  const [activeChat, setActiveChat] = useState<Agent | null>(null)
  const [tab, setTab] = useState<'agents' | 'org' | 'governance'>('agents')
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0B0F', color: '#fff', fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes bounce { 0%,100% { transform:translateY(0); opacity:0.4; } 50% { transform:translateY(-5px); opacity:1; } }
        .fade-up { animation: fadeUp 0.35s ease-out both; }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 56, background: 'rgba(10,11,15,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 36px', zIndex: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: '#E8FF6B' }}>◈ AGENTFORGE</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[{ id: 'agents', label: 'My Agents' }, { id: 'org', label: 'Org Chart' }, { id: 'governance', label: 'Governance' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as any)} style={{ padding: '5px 14px', borderRadius: 6, background: tab === t.id ? 'rgba(255,255,255,0.08)' : 'none', border: 'none', color: tab === t.id ? '#fff' : '#444', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>{t.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 13, color: '#aaa' }}>{profile.business_name}</div>
          <button onClick={signOut} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>Sign out</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px 60px' }}>

        {tab === 'agents' && (
          <div className="fade-up">
            <div style={{ background: 'linear-gradient(135deg, rgba(232,255,107,0.06), rgba(56,189,248,0.03))', border: '1px solid rgba(232,255,107,0.12)', borderRadius: 20, padding: '28px 32px', marginBottom: 28 }}>
              <div style={{ fontSize: 11, color: '#E8FF6B', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Your system is live</div>
              <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6, letterSpacing: -0.5 }}>Welcome, {profile.business_name}</h1>
              <p style={{ color: '#aaa', fontSize: 14 }}>{agents.length} AI agent{agents.length !== 1 ? 's' : ''} ready — all responses reviewed by SAGE and EMBER before delivery.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Agents Active', value: agents.length, color: '#34D399' },
                { label: 'Brand Tone', value: profile.tone ? profile.tone.charAt(0).toUpperCase() + profile.tone.slice(1) : '—', color: '#E8FF6B' },
                { label: 'Governance', value: 'ON', color: '#F87171' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, fontWeight: 700 }}>Your AI Agents</div>
            <div style={{ display: 'grid', gridTemplateColumns: agents.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
              {agents.map(agent => (
                <div key={agent.id} onClick={() => setActiveChat(activeChat?.id === agent.id ? null : agent)} style={{ background: activeChat?.id === agent.id ? `${agent.color}0d` : 'rgba(255,255,255,0.02)', border: `1.5px solid ${activeChat?.id === agent.id ? agent.color + '44' : 'rgba(255,255,255,0.07)'}`, borderRadius: 16, padding: '20px 22px', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${agent.color}18`, border: `1px solid ${agent.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{agent.icon}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{agent.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399' }} />
                          <span style={{ fontSize: 10, color: '#34D399' }}>Active</span>
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: agent.color, fontWeight: 700, background: `${agent.color}15`, border: `1px solid ${agent.color}33`, padding: '4px 10px', borderRadius: 20 }}>{activeChat?.id === agent.id ? 'Close' : 'Chat'}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{agent.description}</div>
                </div>
              ))}
            </div>
            {activeChat && (
              <div className="fade-up">
                <div style={{ fontSize: 11, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>Live Chat · {activeChat.name}</div>
                <AgentChat agent={activeChat} profile={profile} />
              </div>
            )}
            <div style={{ marginTop: 32, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 26px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>What&apos;s next?</div>
              <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.7 }}>Your agents are running with full governance. View the Org Chart to see your hierarchy, or visit Governance to review SAGE and EMBER policies.</div>
            </div>
          </div>
        )}

        {tab === 'org' && (
          <div className="fade-up">
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>Organisation Chart</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>Your full AI hierarchy — click any node to see details.</div>
            </div>
            <OrgChart agents={agents} />
          </div>
        )}

        {tab === 'governance' && (
          <div className="fade-up">
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 6 }}>Governance</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>SAGE and EMBER review every response before it reaches you.</div>
            </div>
            <GovernancePage />
          </div>
        )}

      </div>
    </div>
  )
}
