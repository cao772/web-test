export const AGENT_TOOLS = [
  {
    name: 'focus_hottest',
    description: '定位当前入口温度最高的机柜，并进入机柜视图',
    parameters: {},
  },
  {
    name: 'focus_rack',
    description: '聚焦指定机柜',
    parameters: { rack_id: 'RACK-01..RACK-10' },
  },
  {
    name: 'inspect_node',
    description: '打开机柜并检查指定计算节点',
    parameters: { rack_id: 'RACK-01..RACK-10', node: '1..8' },
  },
  {
    name: 'set_heatmap',
    description: '打开或关闭温度热力图',
    parameters: { enabled: 'boolean' },
  },
  {
    name: 'set_network',
    description: '打开或关闭网络拓扑与数据流',
    parameters: { enabled: 'boolean' },
  },
  {
    name: 'set_airflow',
    description: '打开或关闭冷通道气流',
    parameters: { enabled: 'boolean' },
  },
  {
    name: 'set_incident',
    description: '注入或解除 CRAC-02 到 RACK-07 的冷却故障',
    parameters: { enabled: 'boolean' },
  },
  {
    name: 'mitigate_incident',
    description: '对指定机柜执行临时降载处置，降低 GPU 负载并提高风扇转速',
    parameters: { rack_id: 'RACK-01..RACK-10', target_gpu: '40..85' },
  },
  {
    name: 'reset_view',
    description: '退出设备聚焦并恢复机房全景',
    parameters: {},
  },
]

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function normalizeRackId(value) {
  const match = String(value || '').toUpperCase().match(/RACK[-\s]?0?(\d{1,2})/)
  if (!match) return null
  const index = clamp(Number(match[1]), 1, 10)
  return `RACK-${String(index).padStart(2, '0')}`
}

export function planAgentTools(rawCommand) {
  const command = String(rawCommand || '').trim()
  const upper = command.toUpperCase()
  const calls = []

  if (!command) return calls

  if (command.includes('全景') || command.includes('恢复视角') || upper.includes('RESET')) {
    return [{ name: 'reset_view', arguments: {} }]
  }

  if (command.includes('最热') || command.includes('最高温')) {
    return [
      { name: 'focus_hottest', arguments: {} },
      { name: 'set_heatmap', arguments: { enabled: true } },
    ]
  }

  if (command.includes('解除故障') || command.includes('恢复制冷')) {
    return [{ name: 'set_incident', arguments: { enabled: false } }]
  }

  if (command.includes('故障链') || command.includes('冷却异常')) {
    return [
      { name: 'set_incident', arguments: { enabled: true } },
      { name: 'set_network', arguments: { enabled: true } },
      { name: 'set_airflow', arguments: { enabled: true } },
      { name: 'focus_rack', arguments: { rack_id: 'RACK-07' } },
    ]
  }

  if (command.includes('处置') || command.includes('降载')) {
    const rackId = normalizeRackId(command) || 'RACK-07'
    const targetMatch = command.match(/(\d{2})\s*%/)
    return [{
      name: 'mitigate_incident',
      arguments: { rack_id: rackId, target_gpu: clamp(Number(targetMatch?.[1] || 68), 40, 85) },
    }]
  }

  if (command.includes('热力图')) {
    return [{ name: 'set_heatmap', arguments: { enabled: !command.includes('关') } }]
  }

  if (command.includes('网络')) {
    return [{ name: 'set_network', arguments: { enabled: !command.includes('关') } }]
  }

  if (command.includes('气流')) {
    return [{ name: 'set_airflow', arguments: { enabled: !command.includes('关') } }]
  }

  const rackId = normalizeRackId(command)
  if (rackId) {
    const nodeMatch = upper.match(/(?:NODE|GPU|节点)[-\s]?0?(\d{1,2})/)
    if (nodeMatch) {
      calls.push({
        name: 'inspect_node',
        arguments: { rack_id: rackId, node: clamp(Number(nodeMatch[1]), 1, 8) },
      })
    } else {
      calls.push({ name: 'focus_rack', arguments: { rack_id: rackId } })
    }
    return calls
  }

  return [{ name: 'unknown', arguments: { command } }]
}

export function summarizeToolCalls(calls) {
  return calls.map((call) => {
    switch (call.name) {
      case 'focus_hottest': return '定位最高温机柜'
      case 'focus_rack': return `聚焦 ${call.arguments.rack_id}`
      case 'inspect_node': return `检查 ${call.arguments.rack_id}/NODE-${String(call.arguments.node).padStart(2, '0')}`
      case 'set_heatmap': return `${call.arguments.enabled ? '开启' : '关闭'}热力图`
      case 'set_network': return `${call.arguments.enabled ? '开启' : '关闭'}网络拓扑`
      case 'set_airflow': return `${call.arguments.enabled ? '开启' : '关闭'}冷通道气流`
      case 'set_incident': return `${call.arguments.enabled ? '激活' : '解除'}冷却故障`
      case 'mitigate_incident': return `将 ${call.arguments.rack_id} GPU 降载至 ${call.arguments.target_gpu}%`
      case 'reset_view': return '恢复全景'
      default: return '未识别指令'
    }
  })
}
