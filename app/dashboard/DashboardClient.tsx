'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Agent, Profile, Message } from '@/types'

// ── Chat ──────────────────────────────────────────────────────────────────────

function AgentChat({ agent, profile }: { agent: Agent; profile: Profile }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: `Hi there! I'm your ${agent.name} for ${profile.business_name}. How can I help you today?` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function getOrCreateConversation() {
    if (conversationId) return conversationId
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('conversations')
      .insert({ user_id: user!.id, agent_id: agent.id })
      .select('id').single()
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
        body: JSON.stringify({
          agentId: agent.id,
          conversationId: convId,
          messages: newMessages.slice(1), // exclude initial greeting
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: '#0D0F14',
      border: `1px solid ${agent.color}33`,
      borderRadius: 16, display: 'flex', flexDirection: 'column', height: 400,
    }}>
      {/* Header */}
      <div style={{
        padding: '13px 18px', borderBottom: `1px solid ${agent.color}18`,
        background: `${agent.color}08`, display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${agent.color}22`, border: `1px solid ${agent.color}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>{agent.icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{agent.name}</div>
          <div style={{ fontSize: 10, color: '#555' }}>{agent.role} · online</div>
        </div>
        <div style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px #34D399' }} />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6, color: '#ddd',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user' ? `${agent.color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${msg.role === 'user' ? agent.color + '33' : 'rgba(255,255,255,0.06)'}`,
            }}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '6px 12px' }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: '50%', background: agent.color,
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
              }} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Ask ${agent.name}...`}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10,
            padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none',
          }}
        />
        <button onClick={send} disabled={!input.trim() || loading} style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 16,
          background: input.trim() ? `${agent.color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${input.trim() ? agent.color + '44' : 'rgba(255,255,255,0.06)'}`,
          color: input.trim() ? agent.color : '#333',
          cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.2s',
        }}>↑</button>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardClient({ profile, agents }: { profile: Profile; agents: Agent[] }) {
  const [activeChat, setActiveChat] = useState<Agent | null>(null)
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

      {/* Nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 56,
        background: 'rgba(10,11,15,0.96)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px', zIndex: 40,
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 2, color: '#E8FF6B' }}>◈ AGENTFORGE</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontSize: 13, color: '#555' }}>{profile.business_name}</div>
          <button onClick={signOut} style={{
            background: 'none', border: '1px solid rgba(255,255,255,0.08)',
            color: '#555', padding: '6px 14px', borderRadius: 8,
            cursor: 'pointer', fontSize: 12,
          }}>Sign out</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '80px 32px 60px' }}>

        {/* Hero */}
        <div className="fade-up" style={{
          background: 'linear-gradient(135deg, rgba(232,255,107,0.06), rgba(56,189,248,0.03))',
          border: '1px solid rgba(232,255,107,0.12)',
          borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 11, color: '#E8FF6B', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            🎉 Your system is live
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 6, letterSpacing: -0.5 }}>
            Welcome, {profile.business_name}
          </h1>
          <p style={{ color: '#555', fontSize: 14 }}>
            {agents.length} AI agent{agents.length !== 1 ? 's' : ''} ready to work. Click any agent below to start chatting.
          </p>
        </div>

        {/* Stats */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Agents Active', value: agents.length, color: '#34D399' },
            { label: 'Brand Tone', value: profile.tone ? profile.tone.charAt(0).toUpperCase() + profile.tone.slice(1) : '—', color: '#E8FF6B' },
            { label: 'Integrations', value: profile.integrations?.filter((i: string) => i !== 'none').length || 0, color: '#38BDF8' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 14, padding: '18px 20px',
            }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Agents */}
        <div className="fade-up" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, fontWeight: 700 }}>
            Your AI Agents
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: agents.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {agents.map(agent => (
              <div
                key={agent.id}
                onClick={() => setActiveChat(activeChat?.id === agent.id ? null : agent)}
                style={{
                  background: activeChat?.id === agent.id ? `${agent.color}0d` : 'rgba(255,255,255,0.02)',
                  border: `1.5px solid ${activeChat?.id === agent.id ? agent.color + '44' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 16, padding: '20px 22px', cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: `${agent.color}18`, border: `1px solid ${agent.color}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    }}>{agent.icon}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{agent.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399' }} />
                        <span style={{ fontSize: 10, color: '#34D399' }}>Active</span>
                      </div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, color: agent.color, fontWeight: 700,
                    background: `${agent.color}15`, border: `1px solid ${agent.color}33`,
                    padding: '4px 10px', borderRadius: 20,
                  }}>
                    {activeChat?.id === agent.id ? 'Close ↑' : 'Chat →'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.6 }}>{agent.description}</div>
              </div>
            ))}
          </div>

          {/* Live chat */}
          {activeChat && (
            <div className="fade-up">
              <div style={{ fontSize: 11, color: '#444', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
                Live Chat · {activeChat.name}
              </div>
              <AgentChat agent={activeChat} profile={profile} />
            </div>
          )}
        </div>

        {/* Share / next steps */}
        <div style={{
          marginTop: 32, background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
          padding: '22px 26px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>What&apos;s next?</div>
          <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7 }}>
            Your agents are running. As your business grows you can add more agents,
            connect integrations, and enable governance controls (ethics & culture review)
            from your settings.
          </div>
        </div>
      </div>
    </div>
  )
}
