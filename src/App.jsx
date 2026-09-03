import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, Line, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

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
    id,
    x,
    z,
    gpu,
    temp,
    power,
    nodes,
    status: id === 'RACK-07' ? 'warning' : 'healthy',
    network: Math.round(38 + index * 4.6),
    fan: Math.round(42 + gpu * 0.41),
    vram: Math.round(gpu * 0.79),
  }))
}

function Metric({ label, value, hint, danger = false }) {
  return (
    <div className={`metric-card ${danger ? 'metric-card--danger' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function PulseLight({ color, position = [0, 0, 0], scale = 1 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const pulse = 0.72 + Math.sin(clock.elapsedTime * 3.2) * 0.28
    ref.current.material.emissiveIntensity = 1.7 * pulse
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[0.055, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} />
    </mesh>
  )
}

function Rack({ rack, selected, onSelect, heatmap }) {
  const [hovered, setHovered] = useState(false)
  const group = useRef()
  const statusColor = STATUS[rack.status].color

  useFrame(({ clock }) => {
    if (!group.current) return
    if (rack.status === 'critical') {
      group.current.position.y = Math.sin(clock.elapsedTime * 3.4) * 0.018
    } else {
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, 0, 0.12)
    }
  })

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'default'
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [hovered])

  const serverRows = useMemo(() => Array.from({ length: 12 }, (_, i) => i), [])
  const frameColor = selected ? '#88e9ff' : hovered ? '#4fd2e8' : '#243946'

  return (
    <group
      ref={group}
      position={[rack.x, 0, rack.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(rack.id)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      {heatmap && (
        <mesh position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.42, 40]} />
          <meshBasicMaterial
            color={rack.temp > 35 ? '#ff355f' : rack.temp > 28 ? '#ff9f43' : '#21d4b2'}
            transparent
            opacity={0.18}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      <RoundedBox args={[1.55, 4.2, 1.45]} radius={0.07} smoothness={3} position={[0, 2.12, 0]}>
        <meshStandardMaterial color="#071219" metalness={0.72} roughness={0.38} />
      </RoundedBox>

      <mesh position={[0, 2.12, 0.735]}>
        <boxGeometry args={[1.63, 4.28, 0.035]} />
        <meshStandardMaterial color={frameColor} emissive={frameColor} emissiveIntensity={selected ? 0.42 : 0.08} />
      </mesh>

      <mesh position={[0, 4.27, 0]}>
        <boxGeometry args={[1.72, 0.08, 1.58]} />
        <meshStandardMaterial color="#315466" metalness={0.55} roughness={0.28} />
      </mesh>

      {serverRows.map((row) => {
        const y = 0.42 + row * 0.295
        const isHot = rack.status !== 'healthy' && row > 7
        return (
          <group key={row} position={[0, y, 0.77]}>
            <mesh>
              <boxGeometry args={[1.32, 0.215, 0.08]} />
              <meshStandardMaterial color={row % 3 === 0 ? '#152934' : '#10202a'} metalness={0.65} roughness={0.45} />
            </mesh>
            <mesh position={[-0.45, 0, 0.052]}>
              <boxGeometry args={[0.28, 0.075, 0.02]} />
              <meshStandardMaterial color="#203a47" />
            </mesh>
            <PulseLight color={isHot ? statusColor : row % 4 === 0 ? '#65d9ff' : '#53f3c3'} position={[0.49, 0, 0.065]} scale={0.62} />
          </group>
        )
      })}

      <PulseLight color={statusColor} position={[0.56, 4.02, 0.78]} scale={1.15} />

      <Text
        position={[0, 4.72, 0]}
        fontSize={0.28}
        color={selected ? '#d9fbff' : '#82a9b8'}
        anchorX="center"
        anchorY="middle"
      >
        {rack.id}
      </Text>
      <Text position={[0, 4.42, 0]} fontSize={0.16} color={statusColor} anchorX="center" anchorY="middle">
        {rack.temp.toFixed(1)}°C · GPU {Math.round(rack.gpu)}%
      </Text>
    </group>
  )
}

function NetworkLinks({ racks, visible }) {
  if (!visible) return null
  return (
    <group>
      <Line points={[[-9.4, 4.8, 0], [9.4, 4.8, 0]]} color="#3ec9ff" lineWidth={1.6} transparent opacity={0.5} />
      {racks.map((rack) => (
        <Line
          key={rack.id}
          points={[[rack.x, 4.35, rack.z], [rack.x, 4.8, 0]]}
          color={rack.status === 'critical' ? '#ff5a73' : '#53f3c3'}
          lineWidth={1.1}
          transparent
          opacity={0.5}
        />
      ))}
    </group>
  )
}

function CoolingAirflow({ visible }) {
  if (!visible) return null
  const particles = Array.from({ length: 18 }, (_, i) => i)
  return (
    <group>
      {particles.map((i) => (
        <AirParticle key={i} index={i} />
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
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 10, 10]} />
      <meshBasicMaterial color="#5fdcff" transparent opacity={0.62} />
    </mesh>
  )
}

function CameraRig({ selectedRack, racks, tour }) {
  const { camera } = useThree()
  const controls = useRef()
  const focus = useRef(new THREE.Vector3(0, 1.8, 0))
  const targetCamera = useRef(new THREE.Vector3(12, 8.2, 15))
  const tourIndex = useRef(0)
  const lastTourSwitch = useRef(0)

  useEffect(() => {
    const rack = racks.find((item) => item.id === selectedRack)
    if (!rack) {
      focus.current.set(0, 1.8, 0)
      targetCamera.current.set(12, 8.2, 15)
      return
    }
    focus.current.set(rack.x, 2, rack.z)
    targetCamera.current.set(rack.x + 4.8, 4.8, rack.z + (rack.z > 0 ? 6.3 : -6.3))
  }, [selectedRack, racks])

  useFrame(({ clock }) => {
    if (tour && clock.elapsedTime - lastTourSwitch.current > 4.5) {
      tourIndex.current = (tourIndex.current + 1) % racks.length
      const rack = racks[tourIndex.current]
      focus.current.set(rack.x, 2, rack.z)
      targetCamera.current.set(rack.x + 4.8, 4.7, rack.z + (rack.z > 0 ? 6.4 : -6.4))
      lastTourSwitch.current = clock.elapsedTime
    }

    camera.position.lerp(targetCamera.current, tour ? 0.018 : 0.065)
    if (controls.current) {
      controls.current.target.lerp(focus.current, tour ? 0.025 : 0.085)
      controls.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.07}
      minDistance={4}
      maxDistance={30}
      maxPolarAngle={Math.PI / 2.04}
    />
  )
}

function DataCenterScene({ racks, selectedRack, onSelect, heatmap, links, airflow, tour }) {
  return (
    <>
      <color attach="background" args={['#050a0f']} />
      <fog attach="fog" args={['#050a0f', 16, 37]} />
      <ambientLight intensity={0.62} color="#9bd9ff" />
      <directionalLight position={[6, 12, 8]} intensity={1.45} color="#d8f5ff" />
      <pointLight position={[0, 3.5, 0]} intensity={15} distance={16} color="#1f88b4" />
      <pointLight position={[-10, 2, -5]} intensity={8} distance={10} color="#21d4b2" />
      <pointLight position={[10, 2, 5]} intensity={8} distance={10} color="#3a7bff" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={() => onSelect(null)}>
        <planeGeometry args={[31, 19]} />
        <meshStandardMaterial color="#071016" metalness={0.22} roughness={0.78} />
      </mesh>

      <Grid
        position={[0, 0.012, 0]}
        args={[31, 19]}
        cellSize={0.8}
        cellThickness={0.55}
        cellColor="#183643"
        sectionSize={4}
        sectionThickness={0.85}
        sectionColor="#24556a"
        fadeDistance={23}
        fadeStrength={1.4}
        infiniteGrid={false}
      />

      <mesh position={[0, 0.055, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 2.15]} />
        <meshStandardMaterial color="#0d2932" emissive="#0b6b82" emissiveIntensity={0.14} />
      </mesh>

      <Text position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.42} color="#5bbbd2">
        COLD AISLE · A1
      </Text>

      {racks.map((rack) => (
        <Rack
          key={rack.id}
          rack={rack}
          selected={rack.id === selectedRack}
          onSelect={onSelect}
          heatmap={heatmap}
        />
      ))}

      <NetworkLinks racks={racks} visible={links} />
      <CoolingAirflow visible={airflow} />
      <CameraRig selectedRack={selectedRack} racks={racks} tour={tour} />
    </>
  )
}

function ToggleButton({ active, children, onClick }) {
  return (
    <button className={`control-button ${active ? 'is-active' : ''}`} onClick={onClick}>
      <span className="control-dot" />
      {children}
    </button>
  )
}

function App() {
  const [racks, setRacks] = useState(makeInitialRacks)
  const [selectedRack, setSelectedRack] = useState('RACK-07')
  const [heatmap, setHeatmap] = useState(false)
  const [links, setLinks] = useState(true)
  const [airflow, setAirflow] = useState(true)
  const [tour, setTour] = useState(false)
  const [incident, setIncident] = useState(false)
  const [clock, setClock] = useState(new Date())
  const [events, setEvents] = useState([
    { time: '14:31:22', level: 'warning', text: 'RACK-07 入口温度超过预警阈值 30°C' },
    { time: '14:28:09', level: 'info', text: 'CRAC-02 风量自动调节至 78%' },
    { time: '14:24:46', level: 'info', text: '数据中心数字孪生同步完成' },
  ])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date())
      setRacks((current) =>
        current.map((rack) => {
          if (incident && rack.id === 'RACK-07') {
            const temp = Math.min(43.8, rack.temp + 0.38)
            return {
              ...rack,
              temp,
              gpu: Math.min(99, rack.gpu + 0.55),
              fan: Math.min(100, rack.fan + 0.8),
              power: Math.min(14.6, rack.power + 0.12),
              status: temp > 36 ? 'critical' : 'warning',
            }
          }
          const tempDrift = (Math.random() - 0.5) * 0.32
          const gpuDrift = (Math.random() - 0.5) * 2.2
          return {
            ...rack,
            temp: Math.max(21.5, rack.temp + tempDrift),
            gpu: Math.min(96, Math.max(41, rack.gpu + gpuDrift)),
            network: Math.max(18, rack.network + Math.round((Math.random() - 0.5) * 5)),
          }
        }),
      )
    }, 1400)
    return () => window.clearInterval(timer)
  }, [incident])

  const selected = racks.find((rack) => rack.id === selectedRack) || racks[0]
  const totals = useMemo(() => {
    const avgGpu = racks.reduce((sum, rack) => sum + rack.gpu, 0) / racks.length
    const totalPower = racks.reduce((sum, rack) => sum + rack.power, 0)
    const hottest = Math.max(...racks.map((rack) => rack.temp))
    const alerts = racks.filter((rack) => rack.status !== 'healthy').length
    return { avgGpu, totalPower, hottest, alerts }
  }, [racks])

  const injectIncident = () => {
    setIncident((value) => {
      const next = !value
      const now = new Date().toLocaleTimeString('zh-CN', { hour12: false })
      setEvents((items) => [
        {
          time: now,
          level: next ? 'critical' : 'info',
          text: next ? '已注入 RACK-07 冷却异常，正在模拟局部热点' : 'RACK-07 故障模拟已解除，进入恢复阶段',
        },
        ...items,
      ].slice(0, 5))
      if (!next) {
        setRacks((current) => current.map((rack) => rack.id === 'RACK-07' ? { ...rack, temp: 30.8, gpu: 86, fan: 77, power: 11.4, status: 'warning' } : rack))
      }
      return next
    })
  }

  const resetView = () => {
    setSelectedRack(null)
    setTour(false)
  }

  return (
    <main className="app-shell">
      <div className="scene-layer">
        <Canvas camera={{ position: [12, 8.2, 15], fov: 46 }} dpr={[1, 1.75]} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <DataCenterScene
              racks={racks}
              selectedRack={selectedRack}
              onSelect={setSelectedRack}
              heatmap={heatmap}
              links={links}
              airflow={airflow}
              tour={tour}
            />
          </Suspense>
        </Canvas>
      </div>

      <header className="topbar glass-panel">
        <div className="brand-block">
          <div className="brand-mark"><span /></div>
          <div>
            <p>DIGITAL TWIN / LIVE</p>
            <h1>AI 数据中心数字孪生</h1>
          </div>
        </div>
        <div className="sync-state">
          <span className="live-dot" />
          <div>
            <strong>实时同步</strong>
            <small>{clock.toLocaleTimeString('zh-CN', { hour12: false })} · 1.4s</small>
          </div>
        </div>
      </header>

      <section className="metrics-row">
        <Metric label="GPU 平均利用率" value={`${totals.avgGpu.toFixed(1)}%`} hint="80 × GPU ONLINE" />
        <Metric label="IT 实时功率" value={`${totals.totalPower.toFixed(1)} kW`} hint="PUE 1.27" />
        <Metric label="最高入口温度" value={`${totals.hottest.toFixed(1)}°C`} hint="阈值 30°C" danger={totals.hottest > 35} />
        <Metric label="活动告警" value={totals.alerts} hint="10 个机柜 · 80 节点" danger={totals.alerts > 1} />
      </section>

      <aside className="left-panel glass-panel">
        <div className="panel-kicker">VIEW CONTROL</div>
        <h2>场景视图</h2>
        <div className="controls-stack">
          <ToggleButton active={heatmap} onClick={() => setHeatmap((v) => !v)}>温度热力图</ToggleButton>
          <ToggleButton active={links} onClick={() => setLinks((v) => !v)}>网络拓扑</ToggleButton>
          <ToggleButton active={airflow} onClick={() => setAirflow((v) => !v)}>冷通道气流</ToggleButton>
          <ToggleButton active={tour} onClick={() => setTour((v) => !v)}>自动巡航</ToggleButton>
        </div>
        <div className="left-divider" />
        <button className="ghost-button" onClick={resetView}>返回全景</button>
        <button className={`incident-button ${incident ? 'is-running' : ''}`} onClick={injectIncident}>
          {incident ? '解除故障模拟' : '注入冷却故障'}
        </button>
        <p className="interaction-tip">鼠标左键旋转 · 滚轮缩放 · 点击机柜查看详情</p>
      </aside>

      <aside className="detail-panel glass-panel">
        <div className="detail-head">
          <div>
            <div className="panel-kicker">ASSET INSPECTOR</div>
            <h2>{selected?.id || '选择设备'}</h2>
          </div>
          {selected && <span className={`status-pill status-${selected.status}`}>{STATUS[selected.status].label}</span>}
        </div>

        {selected && (
          <>
            <div className="asset-hero">
              <div className="asset-ring">
                <div><strong>{Math.round(selected.gpu)}</strong><span>%</span></div>
              </div>
              <div>
                <span>GPU LOAD</span>
                <strong>8 × H100 SXM</strong>
                <small>Compute Node / {selected.id}</small>
              </div>
            </div>

            <div className="detail-grid">
              <div><span>入口温度</span><strong>{selected.temp.toFixed(1)}°C</strong></div>
              <div><span>实时功率</span><strong>{selected.power.toFixed(1)} kW</strong></div>
              <div><span>显存占用</span><strong>{selected.vram}%</strong></div>
              <div><span>风扇转速</span><strong>{selected.fan}%</strong></div>
              <div><span>网络吞吐</span><strong>{selected.network} Gb/s</strong></div>
              <div><span>在线节点</span><strong>{selected.nodes} / {selected.nodes}</strong></div>
            </div>

            <div className="load-section">
              <div className="section-title"><span>负载分布</span><small>GPU 0—7</small></div>
              {Array.from({ length: 8 }, (_, i) => {
                const value = Math.min(100, Math.max(20, selected.gpu + ((i * 7) % 17) - 8))
                return (
                  <div className="load-bar" key={i}>
                    <span>G{i}</span>
                    <div><i style={{ width: `${value}%` }} /></div>
                    <b>{Math.round(value)}%</b>
                  </div>
                )
              })}
            </div>

            <div className={`ai-card ${selected.status === 'critical' ? 'ai-card--critical' : ''}`}>
              <div className="ai-badge">AI</div>
              <div>
                <strong>{selected.status === 'critical' ? '检测到局部热点正在扩大' : '运行状态可控'}</strong>
                <p>{selected.status === 'critical' ? '建议检查 CRAC-02 风量，并将本机柜 GPU 负载临时降低至 70% 以下。' : '当前主要关注入口温度与 GPU 峰值负载，未检测到需要立即处置的问题。'}</p>
              </div>
            </div>
          </>
        )}
      </aside>

      <section className="event-panel glass-panel">
        <div className="event-head">
          <div><span className="panel-kicker">EVENT STREAM</span><strong>实时事件</strong></div>
          <span>{events.length} 条</span>
        </div>
        <div className="events-list">
          {events.slice(0, 3).map((event, index) => (
            <div className="event-row" key={`${event.time}-${index}`}>
              <span className={`event-level event-${event.level}`} />
              <time>{event.time}</time>
              <p>{event.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="corner-label">DC-01 · ROOM A · DIGITAL TWIN 0.1</div>
    </main>
  )
}

export default App
