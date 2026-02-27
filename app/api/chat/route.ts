import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { buildSagePrompt, buildEmberPrompt } from '@/lib/prompts'
import { OnboardingData } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_ATTEMPTS = 3

async function reviewResponse(
  reviewerPrompt: string,
  agentResponse: string,
  context: string
): Promise<{ approved: boolean; reason: string }> {
  try {
    const result = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: reviewerPrompt,
      messages: [{
        role: 'user',
        content: `Agent response to review:\n\n"${agentResponse}"\n\nContext: ${context}`
      }]
    })
    const text = result.content[0].type === 'text' ? result.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return { approved: !!parsed.approved, reason: parsed.reason || '' }
  } catch {
    return { approved: true, reason: '' }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { agentId, conversationId, messages } = await request.json()

    const { data: agent, error: agentError } = await supabase
      .from('agents').select('*').eq('id', agentId).eq('user_id', user.id).single()
    if (agentError || !agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 })

    // Fetch full profile to build identity-aware reviewer prompts
    const { data: profile } = await supabase
      .from('profiles')
      .select('business_name, tone, mission, vision, values_statement, ethics_statement, products, brand_voice, brand_keywords, brand_avoid')
      .eq('id', user.id)
      .single()

    // Build identity data for reviewer prompts
    const identityData = {
      businessName: profile?.business_name || '',
      mission: profile?.mission || '',
      vision: profile?.vision || '',
      valuesStatement: profile?.values_statement || '',
      ethicsStatement: profile?.ethics_statement || '',
      products: profile?.products || '',
      brandVoice: profile?.brand_voice || '',
      brandKeywords: profile?.brand_keywords || [],
      brandAvoid: profile?.brand_avoid || [],
    } as Partial<OnboardingData>

    const sagePrompt = buildSagePrompt(identityData as OnboardingData)
    const emberPrompt = buildEmberPrompt(identityData as OnboardingData)
    const context = `Business: ${profile?.business_name}. Agent role: ${agent.role}. Tone: ${profile?.tone || 'professional'}.`
    const lastUserMessage = messages[messages.length - 1]

    let finalMessage = ''
    let attempts = 0
    let sageNote = ''
    let emberNote = ''
    const pipelineStatus = {
      sage: 'pending', ember: 'pending',
      attempts: 0, humanQueue: false,
      sageNote: '', emberNote: '',
    }

    while (attempts < MAX_ATTEMPTS) {
      attempts++
      let reworkInstruction = ''
      if (sageNote) reworkInstruction += `\n\nEthics reviewer feedback: ${sageNote}. Please address this.`
      if (emberNote) reworkInstruction += `\n\nCulture reviewer feedback: ${emberNote}. Please address this.`

      const agentResult = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: agent.system_prompt + reworkInstruction,
        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
      })

      const candidate = agentResult.content[0].type === 'text'
        ? agentResult.content[0].text : 'Sorry, I could not process that.'

      // Stage 1 — SAGE ethics review using business ethics commitments
      const sageResult = await reviewResponse(sagePrompt, candidate, context)
      pipelineStatus.sage = sageResult.approved ? 'pass' : 'rework'
      pipelineStatus.sageNote = sageResult.reason

      if (!sageResult.approved) {
        sageNote = sageResult.reason
        emberNote = ''
        pipelineStatus.attempts = attempts
        continue
      }

      // Stage 2 — EMBER culture review using business values and brand voice
      const emberResult = await reviewResponse(emberPrompt, candidate, context)
      pipelineStatus.ember = emberResult.approved ? 'pass' : 'rework'
      pipelineStatus.emberNote = emberResult.reason

      if (!emberResult.approved) {
        emberNote = emberResult.reason
        pipelineStatus.attempts = attempts
        continue
      }

      finalMessage = candidate
      pipelineStatus.attempts = attempts
      break
    }

    // Deadlock — escalate to human queue
    if (!finalMessage) {
      pipelineStatus.humanQueue = true
      pipelineStatus.attempts = MAX_ATTEMPTS
      finalMessage = `I'm sorry, I wasn't able to provide a complete response right now. A member of our team has been notified and will follow up with you shortly.`
    }

    await supabase.from('messages').insert([
      { conversation_id: conversationId, role: 'user', content: lastUserMessage.content },
      { conversation_id: conversationId, role: 'assistant', content: finalMessage },
    ])

    return NextResponse.json({ message: finalMessage, pipeline: pipelineStatus })

  } catch (err: any) {
    console.error('Chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
