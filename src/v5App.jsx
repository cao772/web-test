import { useEffect, useMemo, useRef, useState } from 'react'
import { DigitalTwinScene } from './stage4Scene'
import { AGENT_TOOLS, summarizeToolCalls } from './agentRuntime'
import { AUTO_DEMO_STEPS, captureRackSnapshot } from './demoRuntime'
import { planWithModel } from './modelAdapter'

const STATUS = {
  healthy: { label: '正常' },
  warning: { label: '预警' },
  critical: { label: '严重' },
}

const rackSeed = [
  ['RACK-01', -8, -3, 62, 23.8, 8.2, 8], ['RACK-02', -4, -3, 71, 25.1, 9.4, 8],
  ['RACK-03', 0, -3, 54, 22.9, 7.8, 8], ['RACK-04', 4, -3, 83, 27.4, 10.7, 8],
  ['RACK-05', 8, -3, 68, 24.8, 9.1, 8], ['RACK-06', -8, 3, 77, 26.7, 10.1, 8],
  ['RACK-07', -4, 3, 89, 31.6, 11.8, 8], ['RACK-08', 0, 3, 58, 23.6, 8.4, 8],
  ['RACK-09', 4, 3, 64, 24.4, 8.8, 8], ['RACK-10', 8, 3, 73, 25.8, 9.7, 8],
]

function makeInitialRacks() {
  return rackSeed.map(([id, x, z, gpu, temp, power, nodes], index) => ({
    id, x, z, gpu, temp, power, nodes,
    status: id === 'RACK-07' ? 'warning' : 'healthy',
    network: Math.round(38 + index * 4.6), fan: Math.round(42 + gpu * 0.41), vram: Math.round(gpu * 0.79),
  }))
}

function parseNode(deviceId) {
  const match = deviceId?.match(/NODE-(\d+)/)
  return match ? Math.max(1, Math.min(8, Number(match[1]))) : null
}

function Metric({ label, value, hint, danger }) {
  return <div className={`metric-card ${danger ? 'metric-card--danger' : ''}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
}

function Toggle({ active, children, onClick }) {
  return <button className={`control-button ${active ? 'is-active' : ''}`} onClick={onClick}><span className="control-dot" />{children}</button>
}

function ToolCallLog({ items }) {
  return (
    <div className="tool-call-log">
      <div className="tool-log-title"><span>工具调用</span><small>{AGENT_TOOLS.length} 个场景工具</small></div>
      {items.length === 0 ? <p className="tool-empty">执行指令或自动演示后，这里显示实际调用工具。</p> : items.slice(0, 4).map((item, index) => (
        <div className="tool-log-row" key={`${item.at}-${index}`}><span className={`tool-state ${item.ok ? 'ok' : 'bad'}`} /><code>{item.name}</code><p>{item.summary}</p></div>
      ))}
    </div>
  )
}

function DemoTimeline({ stepIndex, running }) {
  return (
    <div className="demo-timeline">
      {AUTO_DEMO_STEPS.map((step, index) => (
        <div key={step.id} className={`demo-step ${index < stepIndex ? 'done' : ''} ${index === stepIndex && running ? 'active' : ''}`}>
          <span>{index + 1}</span><div><strong>{step.label}</strong><small>{index === stepIndex && running ? '执行中' : index < stepIndex ? '已完成' : '等待'}</small></div>
        </div>
      ))}
    </div>
  )
}

function SnapshotCompare({ before, after }) {
  if (!before && !after) return null
  const rows = [
    ['入口温度', before?.temp, after?.temp, '°C'], ['GPU 负载', before?.gpu, after?.gpu, '%'],
    ['机柜功率', before?.power, after?.power, ' kW'], ['风扇转速', before?.fan, after?.fan, '%'],
  ]
  return (
    <div className="snapshot-compare">
      <div className="snapshot-title"><strong>处置前后对比</strong><span>{before?.rackId || after?.rackId}</span></div>
      {rows.map(([label, a, b, unit]) => <div className="compare-row" key={label}><span>{label}</span><b>{a ?? '--'}{a != null ? unit : ''}</b><i>→</i><strong>{b ?? '--'}{b != null ? unit : ''}</strong></div>)}
      <div className="compare-status"><span>状态</span><b>{before ? STATUS[before.status].label : '--'}</b><i>→</i><strong>{after ? STATUS[after.status].label : '--'}</strong></div>
    </div>
  )
}

export default function V5App() {
  const [racks, setRacks] = useState(makeInitialRacks)
  const [selectedRack, setSelectedRack] = useState('RACK-07')
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [heatmap, setHeatmap] = useState(false)
  const [links, setLinks] = useState(true)
  const [airflow, setAirflow] = useState(true)
  const [tour, setTour] = useState(false)
  const [incident, setIncident] = useState(false)
  const [mitigating, setMitigating] = useState(false)
  const [targetGpu, setTargetGpu] = useState(68)
  const [clock, setClock] = useState(new Date())
  const [agentInput, setAgentInput] = useState('')
  const [agentMessage, setAgentMessage] = useState('v0.5 已启用工具规划、自动根因分析与处置演示。')
  const [plannerSource, setPlannerSource] = useState('LOCAL')
  const [toolCalls, setToolCalls] = useState([])
  const [events, setEvents] = useState([
    { time: '15:31:20', level: 'info', text: '数字孪生 v0.5 自动处置演示就绪' },
    { time: '15:30:48', level: 'warning', text: 'RACK-07 温度处于预警区间' },
  ])
  const [demoRunning, setDemoRunning] = useState(false)
  const [demoStep, setDemoStep] = useState(0)
  const [demoMessage, setDemoMessage] = useState('点击“一键自动演示”开始完整故障处置链。')
  const [beforeSnapshot, setBeforeSnapshot] = useState(null)
  const [afterSnapshot, setAfterSnapshot] = useState(null)
  const demoTimer = useRef(null)
  const racksRef = useRef(racks)

  useEffect(() => { racksRef.current = racks }, [racks])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
      setRacks((current) => current.map((rack) => {
        if (rack.id !== 'RACK-07') {
          return { ...rack, temp: Math.max(21.3, rack.temp + (Math.random() - 0.5) * 0.24), gpu: Math.min(97, Math.max(40, rack.gpu + (Math.random() - 0.5) * 1.6)) }
        }
        if (incident && !mitigating) {
          const temp = Math.min(44.5, rack.temp + 0.38)
          return { ...rack, temp, gpu: Math.min(99, rack.gpu + 0.5), fan: Math.min(100, rack.fan + 0.65), power: Math.min(14.8, rack.power + 0.11), status: temp > 36 ? 'critical' : 'warning' }
        }
        if (mitigating) {
          const gpu = rack.gpu + (targetGpu - rack.gpu) * 0.28
          const temp = Math.max(29.2, rack.temp - (incident ? 0.22 : 0.48))
          return { ...rack, gpu, temp, fan: Math.min(96, rack.fan + 1.3), power: Math.max(9.4, rack.power - 0.16), status: temp > 35 ? 'critical' : temp > 30 ? 'warning' : 'healthy' }
        }
        if (!incident && rack.temp > 29.5) {
          const temp = Math.max(29.2, rack.temp - 0.35)
          return { ...rack, temp, gpu: Math.max(70, rack.gpu - 0.1), power: Math.max(9.8, rack.power - 0.08), status: temp > 30 ? 'warning' : 'healthy' }
        }
        return { ...rack, temp: Math.max(28.8, rack.temp + (Math.random() - 0.5) * 0.16) }
      }))
    }, 1200)
    return () => window.clearInterval(timer)
  }, [incident, mitigating, targetGpu])

  useEffect(() => () => window.clearTimeout(demoTimer.current), [])

  const selected = racks.find((rack) => rack.id === selectedRack) || racks[0]
  const selectedNode = parseNode(selectedDevice)
  const nodeLoad = selectedNode ? Math.min(100, Math.max(20, selected.gpu + ((selectedNode * 7) % 17) - 7)) : null
  const nodeTemp = selectedNode ? selected.temp + selectedNode * 0.19 : null
  const nodePower = selectedNode ? 1.05 + selectedNode * 0.06 + selected.gpu / 140 : null
  const totals = useMemo(() => ({
    avgGpu: racks.reduce((sum, rack) => sum + rack.gpu, 0) / racks.length,
    totalPower: racks.reduce((sum, rack) => sum + rack.power, 0),
    hottest: Math.max(...racks.map((rack) => rack.temp)), alerts: racks.filter((rack) => rack.status !== 'healthy').length,
  }), [racks])

  const pushEvent = (level, text) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setEvents((items) => [{ time, level, text }, ...items].slice(0, 8))
  }

  const selectRack = (rackId) => { setSelectedRack(rackId); setSelectedDevice(null); setTour(false) }
  const selectDevice = (rackId, deviceId) => { setSelectedRack(rackId); setSelectedDevice(deviceId); setTour(false); pushEvent('info', `进入设备级视图：${deviceId}`) }
  const resetView = () => { setSelectedRack(null); setSelectedDevice(null); setTour(false) }

  const setIncidentMode = (enabled, source = 'manual') => {
    setIncident(enabled)
    if (enabled) setMitigating(false)
    pushEvent(enabled ? 'critical' : 'info', enabled ? `${source === 'demo' ? '自动演示' : 'Agent'} 激活 CRAC-02 → RACK-07 冷却故障链` : 'CRAC-02 制冷恢复，故障链解除')
  }

  const executeToolCalls = (calls, originalCommand = '', source = 'agent') => {
    const summaries = summarizeToolCalls(calls)
    const logEntries = []
    const response = []
    calls.forEach((call, index) => {
      let ok = true
      switch (call.name) {
        case 'focus_hottest': {
          const latestRacks = racksRef.current
          const hottest = latestRacks.reduce((a, b) => a.temp > b.temp ? a : b)
          selectRack(hottest.id); response.push(`定位 ${hottest.id} ${hottest.temp.toFixed(1)}°C`); break
        }
        case 'focus_rack': selectRack(call.arguments.rack_id); response.push(`聚焦 ${call.arguments.rack_id}`); break
        case 'inspect_node': {
          const deviceId = `${call.arguments.rack_id}/NODE-${String(call.arguments.node).padStart(2, '0')}`
          selectDevice(call.arguments.rack_id, deviceId); response.push(`检查 ${deviceId}`); break
        }
        case 'set_heatmap': setHeatmap(Boolean(call.arguments.enabled)); break
        case 'set_network': setLinks(Boolean(call.arguments.enabled)); break
        case 'set_airflow': setAirflow(Boolean(call.arguments.enabled)); break
        case 'set_incident': setIncidentMode(Boolean(call.arguments.enabled), source); break
        case 'mitigate_incident': {
          setTargetGpu(Math.max(40, Math.min(85, Number(call.arguments.target_gpu || 68))))
          setMitigating(true); selectRack(call.arguments.rack_id); response.push(`执行 ${call.arguments.rack_id} 降载处置`); pushEvent('warning', `Agent 执行临时降载：${call.arguments.rack_id} → ${call.arguments.target_gpu || 68}%`); break
        }
        case 'reset_view': resetView(); break
        default: ok = false; response.push('存在未识别工具')
      }
      logEntries.push({ at: Date.now() + index, name: call.name, summary: summaries[index], ok })
    })
    setToolCalls((history) => [...logEntries.reverse(), ...history].slice(0, 16))
    if (originalCommand) setAgentMessage(response.join('；') || `已执行：${originalCommand}`)
  }

  const runAgent = async (text = agentInput) => {
    const command = String(text || '').trim()
    if (!command) return
    setAgentInput('')
    setAgentMessage('正在规划场景工具…')
    const latestRacks = racksRef.current
    const context = { racks: latestRacks.map(({ id, temp, gpu, power, status }) => ({ id, temp, gpu, power, status })), incident, selectedRack, selectedDevice }
    const result = await planWithModel(command, context)
    setPlannerSource(result.source === 'model' ? 'MODEL' : result.source === 'fallback' ? 'FALLBACK' : 'LOCAL')
    executeToolCalls(result.toolCalls, command, 'agent')
    if (result.reasoningSummary) setAgentMessage((current) => `${result.reasoningSummary} ${current}`)
  }

  const stopDemo = () => {
    window.clearTimeout(demoTimer.current)
    setDemoRunning(false)
    setDemoMessage('自动演示已停止，可手动继续操作场景。')
  }

  const executeDemoStep = (index) => {
    const step = AUTO_DEMO_STEPS[index]
    if (!step) {
      const rack = racksRef.current.find((item) => item.id === 'RACK-07')
      setAfterSnapshot(captureRackSnapshot(rack))
      setDemoRunning(false)
      setDemoStep(AUTO_DEMO_STEPS.length)
      setDemoMessage('自动演示完成：故障已定位、处置并进入恢复状态。')
      pushEvent('info', '自动演示完成，已生成处置前后对比')
      return
    }
    setDemoStep(index)
    setDemoMessage(step.message)
    pushEvent(index === 1 ? 'critical' : index >= 4 ? 'warning' : 'info', `演示步骤 ${index + 1}：${step.label}`)
    if (index === 1) {
      const rack = racksRef.current.find((item) => item.id === 'RACK-07')
      setBeforeSnapshot(captureRackSnapshot(rack))
      setAfterSnapshot(null)
    }
    executeToolCalls(step.calls, step.label, 'demo')
    if (index === AUTO_DEMO_STEPS.length - 1) {
      demoTimer.current = window.setTimeout(() => {
        const rack = racksRef.current.find((item) => item.id === 'RACK-07')
        setAfterSnapshot(captureRackSnapshot(rack))
        setDemoRunning(false); setDemoStep(AUTO_DEMO_STEPS.length); setDemoMessage('演示完成：故障定位、降载、恢复制冷和前后对比已完成。')
        pushEvent('info', '自动演示完成，已生成处置前后对比')
      }, step.duration)
    } else {
      demoTimer.current = window.setTimeout(() => executeDemoStep(index + 1), step.duration)
    }
  }

  const startDemo = () => {
    window.clearTimeout(demoTimer.current)
    setDemoRunning(true); setDemoStep(0); setMitigating(false); setIncident(false); setBeforeSnapshot(null); setAfterSnapshot(null)
    setAgentMessage('自动演示模式已接管场景。每一步都会经过真实场景工具执行层。')
    executeDemoStep(0)
  }

  return (
    <main className="app-shell app-v4 app-v5">
      <div className="scene-layer"><DigitalTwinScene racks={racks} selectedRack={selectedRack} selectedDevice={selectedDevice} onRackSelect={selectRack} onDeviceSelect={selectDevice} onClear={resetView} heatmap={heatmap} links={links} airflow={airflow} tour={tour} incident={incident} /></div>

      <header className="topbar glass-panel">
        <div className="brand-block"><div className="brand-mark"><span /></div><div><p>DIGITAL TWIN / LIVE</p><h1>AI 数据中心数字孪生</h1></div></div>
        <div className="v4-mode-badge v5-mode-badge"><span />v0.5 · Agent 自动处置演示</div>
        <div className="sync-state"><span className="live-dot" /><div><strong>实时同步</strong><small>{clock.toLocaleTimeString('zh-CN', { hour12: false })} · 1.2s</small></div></div>
      </header>

      <section className="metrics-row">
        <Metric label="GPU 平均利用率" value={`${totals.avgGpu.toFixed(1)}%`} hint="640 × H100 ONLINE" />
        <Metric label="IT 实时功率" value={`${totals.totalPower.toFixed(1)} kW`} hint="PUE 1.27" />
        <Metric label="最高入口温度" value={`${totals.hottest.toFixed(1)}°C`} hint="阈值 30°C" danger={totals.hottest > 35} />
        <Metric label="活动告警" value={totals.alerts} hint="10 机柜 · 80 计算节点" danger={totals.alerts > 1} />
      </section>

      <aside className="left-panel glass-panel v4-left-panel v5-left-panel">
        <div className="panel-kicker">自动演示</div><h2>Agent 故障处置链</h2>
        <button className={`demo-start-button ${demoRunning ? 'running' : ''}`} onClick={demoRunning ? stopDemo : startDemo}>{demoRunning ? '停止自动演示' : '▶ 一键自动演示'}</button>
        <p className="demo-message">{demoMessage}</p>
        <DemoTimeline stepIndex={demoStep} running={demoRunning} />
        <div className="left-divider" />
        <div className="controls-stack compact-controls">
          <Toggle active={heatmap} onClick={() => setHeatmap((v) => !v)}>热力图</Toggle><Toggle active={links} onClick={() => setLinks((v) => !v)}>网络流</Toggle><Toggle active={airflow} onClick={() => setAirflow((v) => !v)}>冷气流</Toggle>
        </div>
      </aside>

      <aside className="detail-panel glass-panel v4-detail-panel v5-detail-panel">
        <div className="detail-head"><div><div className="panel-kicker">设备检查</div><h2>{selectedDevice?.split('/')[1] || selected?.id || '未选择设备'}</h2></div>{selected && <span className={`status-pill status-${selected.status}`}>{STATUS[selected.status].label}</span>}</div>
        {selectedDevice && <button className="rack-back-button" onClick={() => setSelectedDevice(null)}>← 返回 {selected.id} 机柜</button>}
        {selected && <>
          <div className="asset-hero"><div className="asset-ring"><div><strong>{Math.round(nodeLoad ?? selected.gpu)}</strong><span>%</span></div></div><div><span>{selectedDevice ? 'NODE GPU LOAD' : 'RACK GPU LOAD'}</span><strong>{selectedDevice ? '8 × H100 SXM' : '8 计算节点 · 64 × H100'}</strong><small>{selectedDevice || selected.id}</small></div></div>
          <div className="detail-grid"><div><span>{selectedDevice ? '节点温度' : '入口温度'}</span><strong>{(nodeTemp ?? selected.temp).toFixed(1)}°C</strong></div><div><span>{selectedDevice ? '节点功率' : '机柜功率'}</span><strong>{selectedDevice ? `${nodePower.toFixed(2)} kW` : `${selected.power.toFixed(1)} kW`}</strong></div><div><span>显存占用</span><strong>{Math.min(99, selected.vram + (selectedNode || 0))}%</strong></div><div><span>风扇转速</span><strong>{Math.min(100, selected.fan + (selectedNode || 0))}%</strong></div></div>
          <div className={`ai-card ${selected.status === 'critical' ? 'ai-card--critical' : ''}`}><div className="ai-badge">AI</div><div><strong>{mitigating ? '正在执行降载处置' : selected.status === 'critical' ? '冷却故障影响扩大' : '状态可控'}</strong><p>{mitigating ? `目标 GPU 负载 ${targetGpu}%，风扇增速，等待温度回落。` : incident ? 'CRAC-02 风量异常，建议定位热点节点后执行临时降载。' : '当前可继续监视温度与计算负载。'}</p></div></div>
          <SnapshotCompare before={beforeSnapshot} after={afterSnapshot} />
        </>}
      </aside>

      <section className="agent-console glass-panel v5-agent-console">
        <div className="agent-console-head"><div><span className="agent-orb" /><div><strong>场景 Agent</strong><small>工具规划 · 根因分析 · 处置</small></div></div><span className={`agent-runtime-state source-${plannerSource.toLowerCase()}`}>{plannerSource}</span></div>
        <p className="agent-response">{agentMessage}</p>
        <div className="agent-quick-row">{['定位最热设备', '检查 RACK-07 GPU-6', '处置 RACK-07 降载到 68%', '恢复制冷'].map((text) => <button key={text} onClick={() => runAgent(text)} disabled={demoRunning}>{text}</button>)}</div>
        <form className="agent-input-row" onSubmit={(event) => { event.preventDefault(); runAgent() }}><input value={agentInput} onChange={(event) => setAgentInput(event.target.value)} disabled={demoRunning} placeholder="例如：处置 RACK-07 降载到 65%" /><button type="submit" disabled={demoRunning}>执行</button></form>
        <ToolCallLog items={toolCalls} />
      </section>

      <section className="event-panel glass-panel v4-event-panel v5-event-panel"><div className="event-head"><div><span className="panel-kicker">实时事件</span><strong>运行日志</strong></div><span>{events.length} 条</span></div><div className="events-list">{events.slice(0, 3).map((event, index) => <div className="event-row" key={`${event.time}-${index}`}><span className={`event-level event-${event.level}`} /><time>{event.time}</time><p>{event.text}</p></div>)}</div></section>
      <div className="corner-label">DC-01 · ROOM A · DIGITAL TWIN 0.5</div>
    </main>
  )
}
