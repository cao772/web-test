import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, Line, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  CableTrays,
  FacilityShell,
  IncidentPath,
  InfrastructureAssets,
  NetworkFlow,
  ThermalPlume,
} from './sceneEnhancements'
import { CabinetDoor, DeviceFocusLabel, GpuServerBlade } from './rackDevices'

const STATUS = {
  healthy: { label: '正常', color: '#53f3c3' },
  warning: { label: '预警', color: '#ffc857' },
  critical: { label: '严重', color: '#ff5a73' },
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

function Metric({ label, value, hint, danger = false }) {
  return (
    <div className={`metric-card ${danger ? 'metric-card--danger' : ''}`}>
      <span>{label}</span><strong>{value}</strong><small>{hint}</small>
    </div>
  )
}

function PulseLight({ color, position = [0, 0, 0], scale = 1 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.material.emissiveIntensity = 1.7 * (0.72 + Math.sin(clock.elapsedTime * 3.2) * 0.28)
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[0.055, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} toneMapped={false} />
    </mesh>
  )
}

function Rack({ rack, selected, selectedDevice, onSelect, onDeviceSelect, heatmap }) {
  const [hovered, setHovered] = useState(false)
  const group = useRef()
  const statusColor = STATUS[rack.status].color
  const deviceOpen = selected && Boolean(selectedDevice)

  useFrame(({ clock }) => {
    if (!group.current) return
    if (rack.status === 'critical') group.current.position.y = Math.sin(clock.elapsedTime * 3.4) * 0.018
    else group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.12)
  })

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default'
    return () => { document.body.style.cursor = 'default' }
  }, [hovered])

  const frameColor = selected ? '#88e9ff' : hovered ? '#4fd2e8' : '#243946'

  return (
    <group
      ref={group}
      position={[rack.x, 0, rack.z]}
      onClick={(event) => { event.stopPropagation(); onSelect(rack.id) }}
      onPointerOver={(event) => { event.stopPropagation(); setHovered(true) }}
      onPointerOut={() => setHovered(false)}
    >
      {heatmap && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.42, 40]} />
          <meshBasicMaterial
            color={rack.temp > 35 ? '#ff355f' : rack.temp > 28 ? '#ff9f43' : '#21d4b2'}
            transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false}
          />
        </mesh>
      )}

      <RoundedBox args={[1.55, 4.2, 1.45]} radius={0.07} smoothness={3} position={[0, 2.12, 0]} castShadow>
        <meshStandardMaterial color="#071219" metalness={0.74} roughness={0.34} />
      </RoundedBox>

      <mesh position={[0, 2.12, 0.735]} castShadow>
        <boxGeometry args={[1.63, 4.28, 0.035]} />
        <meshStandardMaterial color={frameColor} emissive={frameColor} emissiveIntensity={selected ? 0.5 : 0.08} toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.27, 0]}>
        <boxGeometry args={[1.72, 0.08, 1.58]} />
        <meshStandardMaterial color="#315466" metalness={0.62} roughness={0.25} />
      </mesh>
      <mesh position={[-0.72, 2.12, 0.77]}><boxGeometry args={[0.055, 3.78, 0.045]} /><meshStandardMaterial color="#385565" metalness={0.7} roughness={0.28} /></mesh>
      <mesh position={[0.72, 2.12, 0.77]}><boxGeometry args={[0.055, 3.78, 0.045]} /><meshStandardMaterial color="#385565" metalness={0.7} roughness={0.28} /></mesh>

      {Array.from({ length: 8 }, (_, row) => {
        const deviceId = `${rack.id}/NODE-${String(row + 1).padStart(2, '0')}`
        return (
          <GpuServerBlade
            key={deviceId}
            rack={rack}
            row={row}
            y={0.69 + row * 0.44}
            selected={deviceId === selectedDevice}
            onSelect={onDeviceSelect}
          />
        )
      })}

      <CabinetDoor open={deviceOpen} />
      <PulseLight color={statusColor} position={[0.56, 4.02, 0.82]} scale={1.15} />

      <Text position={[0, 4.72, 0]} fontSize={0.28} color={selected ? '#d9fbff' : '#82a9b8'} anchorX="center" anchorY="middle">
        {rack.id}
      </Text>
      <Text position={[0, 4.42, 0]} fontSize={0.16} color={statusColor} anchorX="center" anchorY="middle">
        {rack.temp.toFixed(1)}°C · GPU {Math.round(rack.gpu)}%
      </Text>
      {selected && <DeviceFocusLabel rack={{ ...rack, x: 0, z: 0 }} deviceId={selectedDevice} />}
    </group>
  )
}

function NetworkLinks({ racks, visible }) {
  if (!visible) return null
  return (
    <group>
      <Line points={[[-9.4, 4.8, 0], [9.4, 4.8, 0]]} color="#3ec9ff" lineWidth={1.6} transparent opacity={0.5} />
      {racks.map((rack) => (
        <Line key={rack.id} points={[[rack.x, 4.35, rack.z], [rack.x, 4.8, 0]]}
          color={rack.status === 'critical' ? '#ff5a73' : '#53f3c3'} lineWidth={1.1} transparent opacity={0.5} />
      ))}
    </group>
  )
}

function AirParticle({ index }) {
  const ref = useRef()
  const lane = index % 2 === 0 ? -1 : 1
  const baseX = -8.5 + (index % 9) * 2.1
  const speed = 0.45 + (index % 5) * 0.04
  useFrame(({ clock }) => {
    if (!ref.current) return
    const z = ((clock.elapsedTime * speed + index * 0.73) % 6.2) - 3.1
    ref.current.position.set(baseX, 0.2 + ((index * 0.17) % 0.4), lane * z * 0.38)
  })
  return <mesh ref={ref}><sphereGeometry args={[0.055, 10, 10]} /><meshBasicMaterial color="#5fdcff" transparent opacity={0.62} toneMapped={false} /></mesh>
}

function CoolingAirflow({ visible }) {
  if (!visible) return null
  return <group>{Array.from({ length: 18 }, (_, i) => <AirParticle key={i} index={i} />)}</group>
}

function parseDeviceRow(deviceId) {
  const match = deviceId?.match(/NODE-(\d+)/)
  return match ? Math.max(0, Math.min(7, Number(match[1]) - 1)) : null
}

function CameraRig({ selectedRack, selectedDevice, racks, tour }) {
  const { camera } = useThree()
  const controls = useRef()
  const focus = useRef(new THREE.Vector3(0, 1.8, 0))
  const targetCamera = useRef(new THREE.Vector3(12, 8.2, 15))
  const targetFov = useRef(46)
  const tourIndex = useRef(0)
  const lastTourSwitch = useRef(0)

  useEffect(() => {
    const rack = racks.find((item) => item.id === selectedRack)
    if (!rack) {
      focus.current.set(0, 1.8, 0)
      targetCamera.current.set(12, 8.2, 15)
      targetFov.current = 46
      return
    }
    const row = parseDeviceRow(selectedDevice)
    if (row !== null) {
      const y = 0.69 + row * 0.44
      focus.current.set(rack.x, y, rack.z + 0.92)
      targetCamera.current.set(rack.x + 2.15, y + 0.88, rack.z + 4.15)
      targetFov.current = 31
    } else {
      focus.current.set(rack.x, 2, rack.z + 0.2)
      targetCamera.current.set(rack.x + 4.4, 4.6, rack.z + 6.0)
      targetFov.current = 39
    }
  }, [selectedRack, selectedDevice, racks])

  useFrame(({ clock }) => {
    if (tour && clock.elapsedTime - lastTourSwitch.current > 4.5) {
      tourIndex.current = (tourIndex.current + 1) % racks.length
      const rack = racks[tourIndex.current]
      focus.current.set(rack.x, 2, rack.z)
      targetCamera.current.set(rack.x + 4.8, 4.7, rack.z + 6.2)
      targetFov.current = 40
      lastTourSwitch.current = clock.elapsedTime
    }
    camera.position.lerp(targetCamera.current, tour ? 0.018 : selectedDevice ? 0.052 : 0.065)
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, 0.06)
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.lerp(focus.current, tour ? 0.025 : selectedDevice ? 0.07 : 0.085)
      controls.current.update()
    }
  })

  return (
    <OrbitControls ref={controls} enableDamping dampingFactor={0.07} minDistance={2.2} maxDistance={32} maxPolarAngle={Math.PI / 2.04} />
  )
}

function DataCenterScene({ racks, selectedRack, selectedDevice, onSelect, onDeviceSelect, heatmap, links, airflow, tour, incident }) {
  return (
    <>
      <color attach="background" args={['#04080c']} />
      <fog attach="fog" args={['#04080c', 18, 41]} />
      <ambientLight intensity={0.38} color="#9bd9ff" />
      <directionalLight position={[6, 12, 8]} intensity={1.7} color="#d8f5ff" castShadow />
      <pointLight position={[0, 3.5, 0]} intensity={13} distance={16} color="#1f88b4" />
      <pointLight position={[-10, 2, -5]} intensity={7} distance={10} color="#21d4b2" />
      <pointLight position={[10, 2, 5]} intensity={7} distance={10} color="#3a7bff" />

      <FacilityShell /><CableTrays /><InfrastructureAssets incident={incident} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={() => onSelect(null)}>
        <planeGeometry args={[31, 19]} /><meshStandardMaterial color="#071016" metalness={0.22} roughness={0.78} />
      </mesh>
      <Grid position={[0, 0.012, 0]} args={[31, 19]} cellSize={0.8} cellThickness={0.5} cellColor="#15303b"
        sectionSize={4} sectionThickness={0.8} sectionColor="#24556a" fadeDistance={26} fadeStrength={1.6} infiniteGrid={false} />
      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 2.15]} /><meshStandardMaterial color="#0d2932" emissive="#0b6b82" emissiveIntensity={0.14} />
      </mesh>
      <Text position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.42} color="#5bbbd2">COLD AISLE · A1</Text>

      {racks.map((rack) => (
        <Rack key={rack.id} rack={rack} selected={rack.id === selectedRack}
          selectedDevice={rack.id === selectedRack ? selectedDevice : null}
          onSelect={onSelect} onDeviceSelect={onDeviceSelect} heatmap={heatmap} />
      ))}

      <NetworkLinks racks={racks} visible={links} /><NetworkFlow visible={links} /><CoolingAirflow visible={airflow} />
      <IncidentPath active={incident} /><ThermalPlume active={incident} />
      <CameraRig selectedRack={selectedRack} selectedDevice={selectedDevice} racks={racks} tour={tour} />
      <EffectComposer multisampling={2}>
        <Bloom mipmapBlur luminanceThreshold={0.45} luminanceSmoothing={0.22} intensity={0.75} />
        <Vignette eskil={false} offset={0.16} darkness={0.72} />
      </EffectComposer>
    </>
  )
}

function ToggleButton({ active, children, onClick }) {
  return <button className={`control-button ${active ? 'is-active' : ''}`} onClick={onClick}><span className="control-dot" />{children}</button>
}

function App() {
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
  const [agentMessage, setAgentMessage] = useState('已接管 3D 场景，可直接下达定位、故障链和设备检查指令。')
  const [events, setEvents] = useState([
    { time: '14:31:22', level: 'warning', text: 'RACK-07 入口温度超过预警阈值 30°C' },
    { time: '14:28:09', level: 'info', text: 'CRAC-02 风量自动调节至 78%' },
    { time: '14:24:46', level: 'info', text: '数据中心数字孪生同步完成' },
  ])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
      setRacks((current) => current.map((rack) => {
        if (incident && rack.id === 'RACK-07') {
          const temp = Math.min(43.8, rack.temp + 0.38)
          return { ...rack, temp, gpu: Math.min(99, rack.gpu + 0.55), fan: Math.min(100, rack.fan + 0.8),
            power: Math.min(14.6, rack.power + 0.12), status: temp > 36 ? 'critical' : 'warning' }
        }
        return { ...rack,
          temp: Math.max(21.5, rack.temp + (Math.random() - 0.5) * 0.32),
          gpu: Math.min(96, Math.max(41, rack.gpu + (Math.random() - 0.5) * 2.2)),
          network: Math.max(18, rack.network + Math.round((Math.random() - 0.5) * 5)) }
      }))
    }, 1400)
    return () => window.clearInterval(timer)
  }, [incident])

  const selected = racks.find((rack) => rack.id === selectedRack) || racks[0]
  const selectedRow = parseDeviceRow(selectedDevice)
  const deviceLoad = selectedRow === null ? null : Math.min(100, Math.max(20, selected.gpu + ((selectedRow * 7) % 17) - 7))
  const deviceTemp = selectedRow === null ? null : selected.temp + selectedRow * 0.18
  const deviceName = selectedDevice?.split('/')[1] || null

  const totals = useMemo(() => {
    const avgGpu = racks.reduce((sum, rack) => sum + rack.gpu, 0) / racks.length
    return {
      avgGpu,
      totalPower: racks.reduce((sum, rack) => sum + rack.power, 0),
      hottest: Math.max(...racks.map((rack) => rack.temp)),
      alerts: racks.filter((rack) => rack.status !== 'healthy').length,
    }
  }, [racks])

  const pushEvent = (level, text) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setEvents((items) => [{ time, level, text }, ...items].slice(0, 6))
  }

  const setIncidentMode = (next, source = 'manual') => {
    if (next === incident) return
    setIncident(next)
    pushEvent(next ? 'critical' : 'info', next ? `CRAC-02 冷却异常已${source === 'agent' ? '由 Agent 激活' : '注入'}，故障链路指向 RACK-07` : 'CRAC-02 故障模拟已解除，RACK-07 进入恢复阶段')
    if (!next) {
      setRacks((current) => current.map((rack) => rack.id === 'RACK-07'
        ? { ...rack, temp: 30.8, gpu: 86, fan: 77, power: 11.4, status: 'warning' } : rack))
    }
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
    setSelectedRack(null); setSelectedDevice(null); setTour(false)
  }

  const runAgentCommand = (rawCommand) => {
    const command = rawCommand.trim()
    if (!command) return
    const normalized = command.toUpperCase()
    setAgentInput('')

    if (command.includes('全景') || normalized.includes('RESET')) {
      resetView(); setAgentMessage('已退出设备聚焦，恢复机房全景。'); pushEvent('info', `Agent 执行：${command}`); return
    }
    if (command.includes('最热') || command.includes('最高温')) {
      const hottest = racks.reduce((a, b) => a.temp > b.temp ? a : b)
      selectRack(hottest.id); setHeatmap(true)
      setAgentMessage(`已定位当前最高温机柜 ${hottest.id}，入口温度 ${hottest.temp.toFixed(1)}°C，并开启热力图。`)
      pushEvent('warning', `Agent 定位最高温设备：${hottest.id}`); return
    }
    if (command.includes('故障链') || command.includes('冷却异常')) {
      setIncidentMode(true, 'agent'); setLinks(true); setAirflow(true); selectRack('RACK-07')
      setAgentMessage('已高亮 CRAC-02 → RACK-07 冷却故障传播路径，并同步打开网络与气流视图。'); return
    }

    const rackMatch = normalized.match(/RACK[-\s]?0?(\d{1,2})/)
    if (rackMatch) {
      const rackId = `RACK-${String(Math.min(10, Math.max(1, Number(rackMatch[1])))).padStart(2, '0')}`
      const nodeMatch = normalized.match(/(?:NODE|GPU)[-\s]?0?(\d{1,2})/)
      if (nodeMatch) {
        const node = Math.min(8, Math.max(1, Number(nodeMatch[1])))
        const deviceId = `${rackId}/NODE-${String(node).padStart(2, '0')}`
        selectDevice(rackId, deviceId)
        setAgentMessage(`已飞行定位到 ${deviceId}，机柜门已自动打开并拉出目标计算节点。`)
      } else {
        selectRack(rackId); setAgentMessage(`已定位 ${rackId}，镜头进入机柜检查视角。`); pushEvent('info', `Agent 定位：${rackId}`)
      }
      return
    }
    setAgentMessage('没有识别到目标。可尝试“定位最热设备”“检查 RACK-07 GPU-6”“显示故障链”或“恢复全景”。')
  }

  return (
    <main className="app-shell">
      <div className="scene-layer">
        <Canvas shadows camera={{ position: [12, 8.2, 15], fov: 46 }} dpr={[1, 1.75]} gl={{ antialias: true }}
          onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.08 }}>
          <Suspense fallback={null}>
            <DataCenterScene racks={racks} selectedRack={selectedRack} selectedDevice={selectedDevice}
              onSelect={selectRack} onDeviceSelect={selectDevice} heatmap={heatmap} links={links} airflow={airflow} tour={tour} incident={incident} />
          </Suspense>
        </Canvas>
      </div>

      <header className="topbar glass-panel">
        <div className="brand-block"><div className="brand-mark"><span /></div><div><p>DIGITAL TWIN / LIVE</p><h1>AI 数据中心数字孪生</h1></div></div>
        <div className="sync-state"><span className="live-dot" /><div><strong>实时同步</strong><small>{clock.toLocaleTimeString('zh-CN', { hour12: false })} · 1.4s</small></div></div>
      </header>

      <section className="metrics-row">
        <Metric label="GPU 平均利用率" value={`${totals.avgGpu.toFixed(1)}%`} hint="640 × H100 ONLINE" />
        <Metric label="IT 实时功率" value={`${totals.totalPower.toFixed(1)} kW`} hint="PUE 1.27" />
        <Metric label="最高入口温度" value={`${totals.hottest.toFixed(1)}°C`} hint="阈值 30°C" danger={totals.hottest > 35} />
        <Metric label="活动告警" value={totals.alerts} hint="10 机柜 · 80 计算节点" danger={totals.alerts > 1} />
      </section>

      <aside className="left-panel glass-panel">
        <div className="panel-kicker">VIEW CONTROL</div><h2>场景视图</h2>
        <div className="controls-stack">
          <ToggleButton active={heatmap} onClick={() => setHeatmap((v) => !v)}>温度热力图</ToggleButton>
          <ToggleButton active={links} onClick={() => setLinks((v) => !v)}>网络拓扑</ToggleButton>
          <ToggleButton active={airflow} onClick={() => setAirflow((v) => !v)}>冷通道气流</ToggleButton>
          <ToggleButton active={tour} onClick={() => { setTour((v) => !v); setSelectedDevice(null) }}>自动巡航</ToggleButton>
        </div>
        <div className="left-divider" />
        <button className="ghost-button" onClick={resetView}>返回全景</button>
        <button className={`incident-button ${incident ? 'is-running' : ''}`} onClick={() => setIncidentMode(!incident)}>{incident ? '解除故障模拟' : '注入冷却故障'}</button>
        <p className="interaction-tip">点击机柜进入近景 · 再点击服务器进入设备级视图 · 滚轮缩放</p>
      </aside>

      <aside className="detail-panel glass-panel">
        <div className="detail-head">
          <div><div className="panel-kicker">ASSET INSPECTOR</div><h2>{deviceName || selected?.id || '选择设备'}</h2></div>
          {selected && <span className={`status-pill status-${selected.status}`}>{STATUS[selected.status].label}</span>}
        </div>
        {selectedDevice && <button className="rack-back-button" onClick={() => setSelectedDevice(null)}>← 返回 {selected.id} 机柜</button>}

        {selected && (
          <>
            <div className="asset-hero">
              <div className="asset-ring"><div><strong>{Math.round(deviceLoad ?? selected.gpu)}</strong><span>%</span></div></div>
              <div><span>{selectedDevice ? 'NODE GPU LOAD' : 'RACK GPU LOAD'}</span><strong>{selectedDevice ? '8 × H100 SXM' : '8 计算节点 · 64 × H100'}</strong><small>{selectedDevice || `Compute Rack / ${selected.id}`}</small></div>
            </div>

            <div className="detail-grid">
              <div><span>入口温度</span><strong>{(deviceTemp ?? selected.temp).toFixed(1)}°C</strong></div>
              <div><span>实时功率</span><strong>{selectedDevice ? `${(selected.power / 8).toFixed(2)} kW` : `${selected.power.toFixed(1)} kW`}</strong></div>
              <div><span>显存占用</span><strong>{Math.min(99, selected.vram + (selectedRow ?? 0))}%</strong></div>
              <div><span>风扇转速</span><strong>{selected.fan}%</strong></div>
              <div><span>网络吞吐</span><strong>{selectedDevice ? `${Math.max(6, Math.round(selected.network / 5))} Gb/s` : `${selected.network} Gb/s`}</strong></div>
              <div><span>{selectedDevice ? 'GPU 状态' : '在线节点'}</span><strong>{selectedDevice ? '8 / 8' : `${selected.nodes} / ${selected.nodes}`}</strong></div>
            </div>

            <div className="load-section">
              <div className="section-title"><span>{selectedDevice ? '节点 GPU 分布' : '机柜节点负载'}</span><small>{selectedDevice ? 'GPU 0—7' : 'NODE 01—08'}</small></div>
              {Array.from({ length: 8 }, (_, i) => {
                const base = deviceLoad ?? selected.gpu
                const value = Math.min(100, Math.max(20, base + ((i * 7) % 17) - 8))
                return <div className="load-bar" key={i}><span>{selectedDevice ? `G${i}` : `N${i + 1}`}</span><div><i style={{ width: `${value}%` }} /></div><b>{Math.round(value)}%</b></div>
              })}
            </div>

            <div className={`ai-card ${selected.status === 'critical' ? 'ai-card--critical' : ''}`}>
              <div className="ai-badge">AI</div><div>
                <strong>{selected.status === 'critical' ? '检测到 CRAC-02 → RACK-07 局部热点链路' : selectedDevice ? `${deviceName} 设备级诊断完成` : '运行状态可控'}</strong>
                <p>{selected.status === 'critical' ? 'CRAC-02 风量下降导致冷量不足，建议降低目标节点 GPU 负载并检查制冷单元；3D 场景已高亮故障传播路径。' : selectedDevice ? '当前节点 8 张 H100 状态一致，未发现单卡掉线；可继续由 Agent 执行定位和故障推演。' : '当前主要关注入口温度与 GPU 峰值负载，未检测到需要立即处置的问题。'}</p>
              </div>
            </div>
          </>
        )}
      </aside>

      <section className="agent-command-panel glass-panel">
        <div className="agent-command-head"><div><span className="agent-live-dot" />AI 场景控制器</div><small>自然语言 → 镜头 / 设备 / 故障链</small></div>
        <p className="agent-response">{agentMessage}</p>
        <form onSubmit={(event) => { event.preventDefault(); runAgentCommand(agentInput) }} className="agent-input-row">
          <input value={agentInput} onChange={(event) => setAgentInput(event.target.value)} placeholder="例如：检查 RACK-07 GPU-6" />
          <button type="submit">执行</button>
        </form>
        <div className="agent-quick-row">
          {['定位最热设备', '检查 RACK-07 GPU-6', '显示故障链', '恢复全景'].map((command) => <button key={command} onClick={() => runAgentCommand(command)}>{command}</button>)}
        </div>
      </section>

      <section className="event-panel glass-panel">
        <div className="event-head"><div><span className="panel-kicker">EVENT STREAM</span><strong>实时事件</strong></div><span>{events.length} 条</span></div>
        <div className="events-list">{events.slice(0, 3).map((event, index) => <div className="event-row" key={`${event.time}-${index}`}><span className={`event-level event-${event.level}`} /><time>{event.time}</time><p>{event.text}</p></div>)}</div>
      </section>

      <div className="corner-label">DC-01 · ROOM A · DIGITAL TWIN 0.3 · AGENT CONTROL</div>
    </main>
  )
}

export default App
