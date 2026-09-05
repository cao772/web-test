import { useEffect, useMemo, useState } from 'react'
import { DigitalTwinScene } from './stage4Scene'
import { AGENT_TOOLS, planAgentTools, summarizeToolCalls } from './agentRuntime'

const STATUS = {
  healthy: { label: '正常' },
  warning: { label: '预警' },
  critical: { label: '严重' },
}

const rackSeed = [
  ['RACK-01', -8, -3, 62, 23.8, 8.2, 8],
  ['RACK-02', -4, -3, 71, 25.1, 9.4, 8],
  ['RACK-03', 0, -3, 54, 22.9, 7.8, 8],
  ['RACK-04', 4, -3, 83, 27.4, 10.7, 8],
  ['RACK-05', 8, -3, 68, 24.8, 9.1, 8],
  ['RACK-06', -8, 3, 77, 26.7, 10.1, 8],
  ['RACK-07', -4, 3, 89, 31.6, 11.8, 8],
  ['RACK-08', 0, 3, 58, 23.6, 8.4, 8],
  ['RACK-09', 4, 3, 64, 24.4, 8.8, 8],
  ['RACK-10', 8, 3, 73, 25.8, 9.7, 8],
]

function makeInitialRacks() {
  return rackSeed.map(([id, x, z, gpu, temp, power, nodes], index) => ({
    id, x, z, gpu, temp, power, nodes,
    status: id === 'RACK-07' ? 'warning' : 'healthy',
    network: Math.round(38 + index * 4.6),
    fan: Math.round(42 + gpu * 0.41),
    vram: Math.round(gpu * 0.79),
  }))
}

function parseNode(deviceId) {
  const match = deviceId?.match(/NODE-(\d+)/)
  return match ? Math.max(1, Math.min(8, Number(match[1]))) : null
}

function Metric({ label, value, hint, danger }) {
  return (
    <div className={`metric-card ${danger ? 'metric-card--danger' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function Toggle({ active, children, onClick }) {
  return (
    <button className={`control-button ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="control-dot" />{children}
    </button>
  )
}

function ToolCallLog({ items }) {
  return (
    <div className="tool-call-log">
      <div className="tool-log-title">
        <span>工具调用</span>
        <small>{AGENT_TOOLS.length} 个场景工具已注册</small>
      </div>
      {items.length === 0 ? (
        <p className="tool-empty">执行 Agent 指令后，这里会显示实际调用的 3D 工具。</p>
      ) : (
        items.slice(0, 4).map((item, index) => (
          <div className="tool-log-row" key={`${item.at}-${index}`}>
            <span className={`tool-state ${item.ok ? 'ok' : 'bad'}`} />
            <code>{item.name}</code>
            <p>{item.summary}</p>
          </div>
        ))
      )}
    </div>
  )
}

export default function V4App() {
  const [racks, setRacks] = useState(makeInitialRacks)
  const [selectedRack, setSelectedRack] = useState('RACK-07')
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [heatmap, setHeatmap] = useState(false)
  const [links, setLinks] = useState(true)
  const [airflow, setAirflow] = useState(true)
  const [tour, setTour] = useState(false)
  const [incident, setIncident] = useState(false)
  const [clock, setClock] = useState(new Date())
  const [agentInput, setAgentInput] = useState('')
  const [agentMessage, setAgentMessage] = useState('场景工具已注册。可以直接让我定位机柜、检查节点、开启热力图或推演故障链。')
  const [toolCalls, setToolCalls] = useState([])
  const [events, setEvents] = useState([
    { time: '15:01:40', level: 'warning', text: 'RACK-07 入口温度达到预警区间' },
    { time: '15:00:18', level: 'info', text: '数字孪生场景 v0.4 同步完成' },
    { time: '14:59:52', level: 'info', text: 'CRAC / PDU / GPU 节点状态已刷新' },
  ])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
      setRacks((current) => current.map((rack) => {
        if (incident && rack.id === 'RACK-07') {
          const temp = Math.min(44.5, rack.temp + 0.34)
          return {
            ...rack,
            temp,
            gpu: Math.min(99, rack.gpu + 0.48),
            fan: Math.min(100, rack.fan + 0.72),
            power: Math.min(14.8, rack.power + 0.11),
            status: temp > 36 ? 'critical' : 'warning',
          }
        }
        return {
          ...rack,
          temp: Math.max(21.3, rack.temp + (Math.random() - 0.5) * 0.28),
          gpu: Math.min(97, Math.max(40, rack.gpu + (Math.random() - 0.5) * 1.9)),
          network: Math.max(16, rack.network + Math.round((Math.random() - 0.5) * 4)),
        }
      }))
    }, 1400)
    return () => window.clearInterval(timer)
  }, [incident])

  const selected = racks.find((rack) => rack.id === selectedRack) || racks[0]
  const selectedNode = parseNode(selectedDevice)
  const nodeLoad = selectedNode ? Math.min(100, Math.max(20, selected.gpu + ((selectedNode * 7) % 17) - 7)) : null
  const nodeTemp = selectedNode ? selected.temp + selectedNode * 0.19 : null
  const nodePower = selectedNode ? 1.05 + selectedNode * 0.06 + selected.gpu / 140 : null

  const totals = useMemo(() => ({
    avgGpu: racks.reduce((sum, rack) => sum + rack.gpu, 0) / racks.length,
    totalPower: racks.reduce((sum, rack) => sum + rack.power, 0),
    hottest: Math.max(...racks.map((rack) => rack.temp)),
    alerts: racks.filter((rack) => rack.status !== 'healthy').length,
  }), [racks])

  const pushEvent = (level, text) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setEvents((items) => [{ time, level, text }, ...items].slice(0, 7))
  }

  const selectRack = (rackId) => {
    setSelectedRack(rackId)
    setSelectedDevice(null)
    setTour(false)
  }

  const selectDevice = (rackId, deviceId) => {
    setSelectedRack(rackId)
    setSelectedDevice(deviceId)
    setTour(false)
    pushEvent('info', `进入设备级视图：${deviceId}`)
  }

  const resetView = () => {
    setSelectedRack(null)
    setSelectedDevice(null)
    setTour(false)
  }

  const setIncidentMode = (enabled, source = 'manual') => {
    setIncident(enabled)
    pushEvent(enabled ? 'critical' : 'info', enabled
      ? `${source === 'agent' ? 'Agent 激活' : '已注入'} CRAC-02 → RACK-07 冷却故障链`
      : 'CRAC-02 冷却故障已解除，RACK-07 进入恢复阶段')
    if (!enabled) {
      setRacks((current) => current.map((rack) => rack.id === 'RACK-07'
        ? { ...rack, temp: 30.8, gpu: 86, fan: 77, power: 11.4, status: 'warning' }
        : rack))
    }
  }

  const executeToolCalls = (calls, originalCommand) => {
    const summaries = summarizeToolCalls(calls)
    const logEntries = []
    let response = []

    calls.forEach((call, index) => {
      let ok = true
      switch (call.name) {
        case 'focus_hottest': {
          const hottest = racks.reduce((a, b) => a.temp > b.temp ? a : b)
          selectRack(hottest.id)
          response.push(`已定位 ${hottest.id}，入口温度 ${hottest.temp.toFixed(1)}°C`)
          pushEvent('warning', `Agent 定位当前最高温机柜：${hottest.id}`)
          break
        }
        case 'focus_rack':
          selectRack(call.arguments.rack_id)
          response.push(`已聚焦 ${call.arguments.rack_id}`)
          break
        case 'inspect_node': {
          const deviceId = `${call.arguments.rack_id}/NODE-${String(call.arguments.node).padStart(2, '0')}`
          selectDevice(call.arguments.rack_id, deviceId)
          response.push(`已打开机柜并拉出 ${deviceId}`)
          break
        }
        case 'set_heatmap':
          setHeatmap(call.arguments.enabled)
          response.push(call.arguments.enabled ? '已开启温度热力图' : '已关闭温度热力图')
          break
        case 'set_network':
          setLinks(call.arguments.enabled)
          break
        case 'set_airflow':
          setAirflow(call.arguments.enabled)
          break
        case 'set_incident':
          setIncidentMode(call.arguments.enabled, 'agent')
          response.push(call.arguments.enabled ? '已高亮冷却故障传播链' : '已解除冷却故障')
          break
        case 'reset_view':
          resetView()
          response.push('已恢复机房全景')
          break
        default:
          ok = false
          response.push('没有识别到可执行的场景目标')
      }
      logEntries.push({ at: Date.now() + index, name: call.name, summary: summaries[index], ok })
    })

    setToolCalls((history) => [...logEntries.reverse(), ...history].slice(0, 12))
    setAgentMessage(response.join('；') || `已处理：${originalCommand}`)
  }

  const runAgent = (text = agentInput) => {
    const command = String(text || '').trim()
    if (!command) return
    const calls = planAgentTools(command)
    setAgentInput('')
    executeToolCalls(calls, command)
  }

  return (
    <main className="app-shell app-v4">
      <div className="scene-layer">
        <DigitalTwinScene
          racks={racks}
          selectedRack={selectedRack}
          selectedDevice={selectedDevice}
          onRackSelect={selectRack}
          onDeviceSelect={selectDevice}
          onClear={resetView}
          heatmap={heatmap}
          links={links}
          airflow={airflow}
          tour={tour}
          incident={incident}
        />
      </div>

      <header className="topbar glass-panel">
        <div className="brand-block">
          <div className="brand-mark"><span /></div>
          <div><p>DIGITAL TWIN / LIVE</p><h1>AI 数据中心数字孪生</h1></div>
        </div>
        <div className="v4-mode-badge"><span />实时仿真 · 场景工具模式</div>
        <div className="sync-state">
          <span className="live-dot" />
          <div><strong>实时同步</strong><small>{clock.toLocaleTimeString('zh-CN', { hour12: false })} · 1.4s</small></div>
        </div>
      </header>

      <section className="metrics-row">
        <Metric label="GPU 平均利用率" value={`${totals.avgGpu.toFixed(1)}%`} hint="640 × H100 ONLINE" />
        <Metric label="IT 实时功率" value={`${totals.totalPower.toFixed(1)} kW`} hint="PUE 1.27" />
        <Metric label="最高入口温度" value={`${totals.hottest.toFixed(1)}°C`} hint="阈值 30°C" danger={totals.hottest > 35} />
        <Metric label="活动告警" value={totals.alerts} hint="10 机柜 · 80 计算节点" danger={totals.alerts > 1} />
      </section>

      <aside className="left-panel glass-panel v4-left-panel">
        <div className="panel-kicker">场景控制</div>
        <h2>数字孪生视图</h2>
        <div className="controls-stack">
          <Toggle active={heatmap} onClick={() => setHeatmap((v) => !v)}>温度热力图</Toggle>
          <Toggle active={links} onClick={() => setLinks((v) => !v)}>网络数据流</Toggle>
          <Toggle active={airflow} onClick={() => setAirflow((v) => !v)}>冷通道气流</Toggle>
          <Toggle active={tour} onClick={() => { setTour((v) => !v); setSelectedDevice(null) }}>电影巡航</Toggle>
        </div>
        <div className="left-divider" />
        <button className="ghost-button" onClick={resetView}>返回全景</button>
        <button className={`incident-button ${incident ? 'is-running' : ''}`} onClick={() => setIncidentMode(!incident)}>
          {incident ? '解除冷却故障' : '注入冷却故障'}
        </button>
        <div className="aisle-legend">
          <span><i className="cold" />冷通道</span>
          <span><i className="hot" />热通道</span>
        </div>
        <p className="interaction-tip">点击机柜 → 点击节点 → 自动开门 / 拉出服务器 / 镜头推进</p>
      </aside>

      <aside className="detail-panel glass-panel v4-detail-panel">
        <div className="detail-head">
          <div><div className="panel-kicker">设备检查</div><h2>{selectedDevice?.split('/')[1] || selected?.id || '未选择设备'}</h2></div>
          {selected && <span className={`status-pill status-${selected.status}`}>{STATUS[selected.status].label}</span>}
        </div>

        {selectedDevice && <button className="rack-back-button" onClick={() => setSelectedDevice(null)}>← 返回 {selected.id} 机柜</button>}

        {selected && (
          <>
            <div className="asset-hero">
              <div className="asset-ring"><div><strong>{Math.round(nodeLoad ?? selected.gpu)}</strong><span>%</span></div></div>
              <div>
                <span>{selectedDevice ? 'NODE GPU LOAD' : 'RACK GPU LOAD'}</span>
                <strong>{selectedDevice ? '8 × H100 SXM' : '8 计算节点 · 64 × H100'}</strong>
                <small>{selectedDevice || `Compute Rack / ${selected.id}`}</small>
              </div>
            </div>

            <div className="detail-grid">
              <div><span>{selectedDevice ? '节点温度' : '入口温度'}</span><strong>{(nodeTemp ?? selected.temp).toFixed(1)}°C</strong></div>
              <div><span>{selectedDevice ? '节点功率' : '机柜功率'}</span><strong>{selectedDevice ? `${nodePower.toFixed(2)} kW` : `${selected.power.toFixed(1)} kW`}</strong></div>
              <div><span>显存占用</span><strong>{Math.min(99, selected.vram + (selectedNode || 0))}%</strong></div>
              <div><span>风扇转速</span><strong>{Math.min(100, selected.fan + (selectedNode || 0))}%</strong></div>
              <div><span>网络吞吐</span><strong>{selected.network} Gb/s</strong></div>
              <div><span>运行状态</span><strong>{STATUS[selected.status].label}</strong></div>
            </div>

            {selectedDevice && (
              <div className="gpu-board-grid">
                {Array.from({ length: 8 }, (_, index) => {
                  const value = Math.min(100, Math.max(22, (nodeLoad || selected.gpu) + ((index * 9) % 19) - 8))
                  return <div key={index}><span>GPU {index}</span><strong>{Math.round(value)}%</strong><i><b style={{ width: `${value}%` }} /></i></div>
                })}
              </div>
            )}

            <div className={`ai-card ${selected.status === 'critical' ? 'ai-card--critical' : ''}`}>
              <div className="ai-badge">AI</div>
              <div>
                <strong>{selected.status === 'critical' ? '冷却故障正在影响该计算区' : '当前运行状态可控'}</strong>
                <p>{selected.status === 'critical'
                  ? 'CRAC-02 风量下降，RACK-07 热点扩大。建议先降低计算负载，再检查制冷单元和冷通道供风。'
                  : '设备指标处于可控范围。可继续用 Agent 定位最热设备或检查具体 GPU 节点。'}</p>
              </div>
            </div>
          </>
        )}
      </aside>

      <section className="agent-console glass-panel">
        <div className="agent-console-head">
          <div><span className="agent-orb" /><div><strong>场景 Agent</strong><small>结构化工具调用已启用</small></div></div>
          <span className="agent-runtime-state">READY</span>
        </div>
        <p className="agent-response">{agentMessage}</p>
        <div className="agent-quick-row">
          {['定位最热设备', '检查 RACK-07 GPU-6', '显示故障链', '恢复全景'].map((text) => (
            <button key={text} onClick={() => runAgent(text)}>{text}</button>
          ))}
        </div>
        <form className="agent-input-row" onSubmit={(event) => { event.preventDefault(); runAgent() }}>
          <input value={agentInput} onChange={(event) => setAgentInput(event.target.value)} placeholder="例如：检查 RACK-04 GPU-3" />
          <button type="submit">执行</button>
        </form>
        <ToolCallLog items={toolCalls} />
      </section>

      <section className="event-panel glass-panel v4-event-panel">
        <div className="event-head"><div><span className="panel-kicker">实时事件</span><strong>运行日志</strong></div><span>{events.length} 条</span></div>
        <div className="events-list">
          {events.slice(0, 3).map((event, index) => (
            <div className="event-row" key={`${event.time}-${index}`}>
              <span className={`event-level event-${event.level}`} /><time>{event.time}</time><p>{event.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="corner-label">DC-01 · ROOM A · DIGITAL TWIN 0.4</div>
    </main>
  )
}
