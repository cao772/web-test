import { AGENT_TOOLS, planAgentTools } from './agentRuntime'

const VALID_TOOL_NAMES = new Set(AGENT_TOOLS.map((tool) => tool.name))

function sanitizeToolCalls(rawCalls) {
  if (!Array.isArray(rawCalls)) return []
  return rawCalls
    .filter((call) => call && VALID_TOOL_NAMES.has(call.name))
    .map((call) => ({ name: call.name, arguments: call.arguments || {} }))
}

export async function planWithModel(command, context = {}) {
  const endpoint = import.meta.env.VITE_AGENT_ENDPOINT

  if (!endpoint) {
    return {
      source: 'local',
      toolCalls: planAgentTools(command),
      reasoningSummary: '未配置模型规划接口，已使用本地场景工具规划。',
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command,
        tools: AGENT_TOOLS,
        context,
      }),
    })

    if (!response.ok) throw new Error(`planner returned ${response.status}`)
    const payload = await response.json()
    const toolCalls = sanitizeToolCalls(payload.tool_calls || payload.toolCalls)
    if (!toolCalls.length) throw new Error('planner returned no valid tool calls')

    return {
      source: 'model',
      toolCalls,
      reasoningSummary: payload.summary || payload.message || '模型已完成场景工具规划。',
    }
  } catch (error) {
    return {
      source: 'fallback',
      toolCalls: planAgentTools(command),
      reasoningSummary: `模型规划不可用，已回退本地规划：${error.message}`,
    }
  }
}
