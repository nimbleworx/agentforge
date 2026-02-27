import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_name, tone, mission, vision, values_statement, ethics_statement, products, brand_voice, brand_keywords, brand_avoid')
      .eq('id', user.id)
      .single()

    const businessName = profile?.business_name || 'this business'
    const context = `Business: ${businessName}. Agent role: ${agent.role}. Tone: ${profile?.tone || 'professional'}.`

    const sagePrompt = `You are SAGE, an AI Ethics & Compliance reviewer for ${businessName}.

Review the agent response and approve it unless it clearly violates one of these rules:
${profile?.ethics_statement ? `Business ethics commitments: ${profile.ethics_statement}` : ''}
- Contains false urgency or manipulative sales tactics
- Makes claims that are clearly misleading or untrue
- Contains discriminatory or offensive language
- Asks for unnecessary private information
- Gives specific legal or medical advice

Be lenient — only reject responses that clearly break a rule. Approve anything reasonable.

Respond in JSON only: { "approved": true/false, "reason": "brief reason if rejected" }`

    const emberPrompt = `You are EMBER, an AI Culture & Values reviewer for ${businessName}.

Review the agent response and approve it unless it clearly violates the brand voice.
${profile?.mission ? `Business mission: ${profile.mission}` : ''}
${profile?.values_statement ? `Business values: ${profile.values_statement}` : ''}
${profile?.brand_voice ? `Brand voice: ${profile.brand_voice}` : ''}
${profile?.brand_avoid?.length ? `Never use: ${profile.brand_avoid.join(', ')}` : ''}

Be lenient — only reject responses that clearly use banned language or badly contradict the brand voice. Approve anything reasonable.

Respond in JSON only: { "approved": true/false, "reason": "brief reason if rejected" }`

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

      // Stage 1 — SAGE ethics review
      const sageResult = await reviewResponse(sagePrompt, candidate, context)
      pipelineStatus.sage = sageResult.approved ? 'pass' : 'rework'
      pipelineStatus.sageNote = sageResult.reason

      if (!sageResult.approved) {
        sageNote = sageResult.reason
        emberNote = ''
        pipelineStatus.attempts = attempts
        continue
      }

      // Stage 2 — EMBER culture review
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
