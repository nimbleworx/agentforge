import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getAgentsForGoals, buildAgentPayload } from '@/lib/agents'
import { OnboardingData } from '@/types'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: OnboardingData = await request.json()

    // 1. Save full profile including identity fields
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        business_name: body.businessName,
        business_type: body.businessType,
        business_stage: body.stage,
        tone: body.tone,
        goals: body.goals,
        integrations: body.integrations,
        mission: body.mission,
        vision: body.vision,
        values_statement: body.valuesStatement,
        ethics_statement: body.ethicsStatement,
        products: body.products,
        brand_voice: body.brandVoice,
        brand_keywords: body.brandKeywords,
        brand_avoid: body.brandAvoid,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) throw profileError

    // 2. Determine which agents to create
    const roleIds = getAgentsForGoals(body.goals)

    // 3. Build and insert agents with identity-aware prompts
    const agentPayloads = roleIds.map(roleId =>
      buildAgentPayload(roleId, body, user.id)
    )

    const { error: agentsError } = await supabase
      .from('agents')
      .insert(agentPayloads)

    if (agentsError) throw agentsError

    return NextResponse.json({ success: true, agentsCreated: agentPayloads.length })
  } catch (err: any) {
    console.error('Onboarding error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
