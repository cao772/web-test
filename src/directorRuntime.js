export const DIRECTOR_META = [
  {
    id: 'baseline',
    eyebrow: 'SCENE 01 · BASELINE',
    title: '建立正常运行基线',
    subtitle: '采集机房温度、GPU 负载、功率与冷通道供风，确认系统处于稳定状态。',
    shot: '全景建立镜头',
    hud: 'baseline',
  },
  {
    id: 'incident',
    eyebrow: 'SCENE 02 · INCIDENT',
    title: 'CRAC-02 冷却异常出现',
    subtitle: '制冷风量下降，RACK-07 入口温度持续上升，数字孪生开始标记异常传播路径。',
    shot: '故障触发镜头',
    hud: 'incident',
  },
  {
    id: 'root-cause',
    eyebrow: 'SCENE 03 · ROOT CAUSE',
    title: 'Agent 锁定故障传播链',
    subtitle: '对比温度、气流与制冷状态，根因路径收敛为 CRAC-02 → RACK-07。',
    shot: '热力定位镜头',
    hud: 'root-cause',
  },
  {
    id: 'inspect',
    eyebrow: 'SCENE 04 · INSPECTION',
    title: '进入热点节点检查',
    subtitle: '镜头推进至 RACK-07，自动开门并拉出 NODE-06，进入设备级检查视角。',
    shot: '设备特写镜头',
    hud: 'inspection',
  },
  {
    id: 'mitigate',
    eyebrow: 'SCENE 05 · MITIGATION',
    title: '执行临时降载处置',
    subtitle: '将 RACK-07 GPU 负载目标调整至 68%，同步提高风扇转速，抑制热点扩大。',
    shot: '处置执行镜头',
    hud: 'mitigation',
  },
  {
    id: 'recover',
    eyebrow: 'SCENE 06 · RECOVERY',
    title: '恢复制冷并解除故障链',
    subtitle: 'CRAC-02 恢复供冷，入口温度开始回落，告警等级逐步下降。',
    shot: '恢复跟踪镜头',
    hud: 'recovery',
  },
  {
    id: 'compare',
    eyebrow: 'SCENE 07 · VALIDATION',
    title: '验证处置效果',
    subtitle: '回到 RACK-07 机柜视角，对比处置前后的温度、负载、功率和运行状态。',
    shot: '结果验证镜头',
    hud: 'validation',
  },
]

export const DIRECTOR_INTRO = {
  eyebrow: 'AI DATA CENTER · DIGITAL TWIN',
  title: '智能故障处置演示',
  subtitle: '从异常发现、根因定位到设备处置与恢复验证，完整演示 Agent 与 3D 数字孪生联动。',
}

export function getDirectorMeta(index) {
  return DIRECTOR_META[index] || DIRECTOR_META[DIRECTOR_META.length - 1]
}

export function buildDirectorSummary(before, after) {
  if (!before || !after) return null
  const tempDrop = Number((before.temp - after.temp).toFixed(1))
  const gpuDrop = Math.round(before.gpu - after.gpu)
  const powerDrop = Number((before.power - after.power).toFixed(1))
  return {
    rackId: after.rackId,
    tempDrop,
    gpuDrop,
    powerDrop,
    beforeStatus: before.status,
    afterStatus: after.status,
    conclusion: after.status === 'healthy'
      ? '热点已得到控制，机柜恢复正常运行区间。'
      : after.status === 'warning'
        ? '热点明显收敛，机柜已回落至预警区间。'
        : '处置已执行，但仍需继续观察温度回落。',
  }
}
