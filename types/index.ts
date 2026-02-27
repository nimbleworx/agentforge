export type BusinessType = 'ecommerce' | 'consulting' | 'saas' | 'creative' | 'health' | 'food' | 'education' | 'other'
export type BusinessStage = 'idea' | 'early' | 'growing' | 'established'
export type AgentTone = 'professional' | 'friendly' | 'expert' | 'casual'
export type AgentRole = 'support' | 'sales' | 'finance' | 'marketing' | 'ops'
export type AgentStatus = 'active' | 'paused'

export interface Profile {
  id: string
  email: string
  business_name: string | null
  business_type: BusinessType | null
  business_stage: BusinessStage | null
  tone: AgentTone | null
  goals: string[]
  integrations: string[]
  onboarding_complete: boolean
  created_at: string
  // Identity fields
  mission: string | null
  vision: string | null
  values_statement: string | null
  ethics_statement: string | null
  products: string | null
  brand_voice: string | null
  brand_keywords: string[]
  brand_avoid: string[]
}

export interface Agent {
  id: string
  user_id: string
  name: string
  role: AgentRole
  icon: string
  color: string
  description: string
  system_prompt: string
  tone: AgentTone
  status: AgentStatus
  created_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface OnboardingData {
  // Identity (step 0)
  mission: string
  vision: string
  valuesStatement: string
  ethicsStatement: string
  products: string
  brandVoice: string
  brandKeywords: string[]
  brandAvoid: string[]
  // Basics (step 1)
  businessName: string
  businessType: BusinessType | ''
  stage: BusinessStage | ''
  // Goals (step 2)
  goals: string[]
  // Tone (step 3)
  tone: AgentTone | ''
  // Integrations (step 4)
  integrations: string[]
}

export const AGENT_ROLES: Record<string, {
  id: AgentRole
  name: string
  icon: string
  color: string
  description: string
  goals: string[]
}> = {
  support: {
    id: 'support',
    name: 'Support Agent',
    icon: '🎧',
    color: '#38BDF8',
    description: 'Answers customer questions, handles complaints, and resolves issues 24/7.',
    goals: ['support'],
  },
  sales: {
    id: 'sales',
    name: 'Sales Agent',
    icon: '📈',
    color: '#34D399',
    description: 'Qualifies leads, follows up prospects, and helps close deals.',
    goals: ['sales'],
  },
  finance: {
    id: 'finance',
    name: 'Finance Agent',
    icon: '💰',
    color: '#FBBF24',
    description: 'Tracks expenses, flags anomalies, and generates financial summaries.',
    goals: ['finance'],
  },
  marketing: {
    id: 'marketing',
    name: 'Marketing Agent',
    icon: '📣',
    color: '#F472B6',
    description: 'Drafts content, writes copy, and helps plan campaigns.',
    goals: ['marketing'],
  },
  ops: {
    id: 'ops',
    name: 'Operations Agent',
    icon: '⚙️',
    color: '#A78BFA',
    description: 'Handles scheduling, follow-ups, and keeps operations smooth.',
    goals: ['admin', 'ops'],
  },
}
