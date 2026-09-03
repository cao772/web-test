export const AUTO_DEMO_STEPS = [
  {
    id: 'baseline',
    label: '建立正常基线',
    duration: 2600,
    message: '采集正常运行基线，确认机房整体状态和冷通道供风。',
    calls: [
      { name: 'reset_view', arguments: {} },
      { name: 'set_network', arguments: { enabled: true } },
      { name: 'set_airflow', arguments: { enabled: true } },
      { name: 'set_heatmap', arguments: { enabled: false } },
    ],
  },
  {
    id: 'incident',
    label: '异常出现',
    duration: 3200,
    message: 'CRAC-02 风量异常，RACK-07 入口温度开始上升。',
    calls: [{ name: 'set_incident', arguments: { enabled: true } }],
  },
  {
    id: 'root-cause',
    label: '根因定位',
    duration: 3200,
    message: 'Agent 对比温度、气流与制冷状态，锁定 CRAC-02 → RACK-07 故障链。',
    calls: [
      { name: 'focus_hottest', arguments: {} },
      { name: 'set_heatmap', arguments: { enabled: true } },
    ],
  },
  {
    id: 'inspect',
    label: '设备检查',
    duration: 3600,
    message: '进入 RACK-07，自动开门并拉出热点计算节点 NODE-06。',
    calls: [{ name: 'inspect_node', arguments: { rack_id: 'RACK-07', node: 6 } }],
  },
  {
    id: 'mitigate',
    label: '执行临时处置',
    duration: 3600,
    message: '先将 RACK-07 GPU 负载降至 68%，同时提高风扇转速，抑制热点继续扩大。',
    calls: [{ name: 'mitigate_incident', arguments: { rack_id: 'RACK-07', target_gpu: 68 } }],
  },
  {
    id: 'recover',
    label: '恢复制冷',
    duration: 3600,
    message: 'CRAC-02 制冷恢复，入口温度开始回落，故障链解除。',
    calls: [{ name: 'set_incident', arguments: { enabled: false } }],
  },
  {
    id: 'compare',
    label: '前后对比',
    duration: 4200,
    message: '生成处置前后状态对比，确认温度、GPU 负载和告警状态恢复。',
    calls: [
      { name: 'focus_rack', arguments: { rack_id: 'RACK-07' } },
      { name: 'set_heatmap', arguments: { enabled: true } },
    ],
  },
]

export function captureRackSnapshot(rack) {
  if (!rack) return null
  return {
    at: new Date().toISOString(),
    rackId: rack.id,
    temp: Number(rack.temp.toFixed(1)),
    gpu: Math.round(rack.gpu),
    power: Number(rack.power.toFixed(1)),
    fan: Math.round(rack.fan),
    status: rack.status,
  }
}
