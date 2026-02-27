import { OnboardingData, AGENT_ROLES, AgentRole } from '@/types'
import { buildSystemPrompt } from './prompts'

export function getAgentsForGoals(goals: string[]): AgentRole[] {
  const roles = new Set<AgentRole>()
  for (const goal of goals) {
    for (const roleConfig of Object.values(AGENT_ROLES)) {
      if (roleConfig.goals.includes(goal)) {
        roles.add(roleConfig.id)
      }
    }
  }
  return Array.from(roles)
}

export function buildAgentPayload(
  roleId: AgentRole,
  data: OnboardingData,
  userId: string
) {
  const roleConfig = AGENT_ROLES[roleId]
  const tone = (data.tone || 'professional') as any

  const agentShell = {
    user_id: userId,
    name: roleConfig.name,
    role: roleConfig.id,
    icon: roleConfig.icon,
    color: roleConfig.color,
    description: roleConfig.description,
    tone,
    status: 'active' as const,
    system_prompt: '',
  }

  const system_prompt = buildSystemPrompt(agentShell as any, data)

  return { ...agentShell, system_prompt }
}
