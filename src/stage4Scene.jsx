import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

const STATUS_COLOR = {
  healthy: '#53f3c3',
  warning: '#ffc857',
  critical: '#ff5a73',
}

function HallShell() {
  return (
    <group>
      <mesh position={[0, 3.1, -9.2]} receiveShadow>
        <boxGeometry args={[30, 6.2, 0.18]} />
        <meshStandardMaterial color="#09151d" metalness={0.35} roughness={0.7} />
      </mesh>
      <mesh position={[-15.05, 3.1, 0]} receiveShadow>
        <boxGeometry args={[0.18, 6.2, 18.4]} />
        <meshStandardMaterial color="#08131a" metalness={0.3} roughness={0.72} />
      </mesh>
      <mesh position={[15.05, 3.1, 0]} receiveShadow>
        <boxGeometry args={[0.18, 6.2, 18.4]} />
        <meshStandardMaterial color="#08131a" metalness={0.3} roughness={0.72} />
      </mesh>
      {[-12, -6, 0, 6, 12].map((x) => (
        <mesh key={x} position={[x, 3, -8.8]} castShadow>
          <boxGeometry args={[0.24, 6, 0.34]} />
          <meshStandardMaterial color="#1b303c" metalness={0.65} roughness={0.38} />
        </mesh>
      ))}
      {[-10, -5, 0, 5, 10].flatMap((x) => [-5.8, 0, 5.8].map((z) => (
        <group key={`${x}-${z}`} position={[x, 6.0, z]}>
          <mesh>
            <boxGeometry args={[2.0, 0.08, 0.42]} />
            <meshStandardMaterial color="#cceef7" emissive="#79dff2" emissiveIntensity={1.3} />
          </mesh>
          <pointLight position={[0, -0.65, 0]} intensity={2.2} distance={5.5} color="#bdeeff" />
        </group>
      )))}
    </group>
  )
}

function RaisedFloor({ onClear }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClear}>
        <planeGeometry args={[31, 19]} />
        <meshStandardMaterial color="#08151b" metalness={0.46} roughness={0.48} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => -15 + i * 2).map((x) => (
        <mesh key={`x-${x}`} position={[x, 0.012, 0]}>
          <boxGeometry args={[0.018, 0.018, 18]} />
          <meshBasicMaterial color="#16313a" />
        </mesh>
      ))}
      {Array.from({ length: 10 }, (_, i) => -9 + i * 2).map((z) => (
        <mesh key={`z-${z}`} position={[0, 0.012, z]}>
          <boxGeometry args={[30, 0.018, 0.018]} />
          <meshBasicMaterial color="#16313a" />
        </mesh>
      ))}
      <mesh position={[0, 0.025, -0.92]}>
        <boxGeometry args={[22, 0.035, 0.05]} />
        <meshStandardMaterial color="#55ddff" emissive="#55ddff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.025, 0.92]}>
        <boxGeometry args={[22, 0.035, 0.05]} />
        <meshStandardMaterial color="#55ddff" emissive="#55ddff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
    </group>
  )
}

function HeatHalo({ rack }) {
  const color = rack.temp > 35 ? '#ff4568' : rack.temp > 28 ? '#ff9f4d' : '#36d8bd'
  return (
    <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.52, 1.42, 40]} />
      <meshBasicMaterial color={color} transparent opacity={0.22} depthWrite={false} />
    </mesh>
  )
}

function ServerBlade({ rack, row, selected, onSelect }) {
  const ref = useRef()
  const [hovered, setHovered] = useState(false)
  const deviceId = `${rack.id}/NODE-${String(row + 1).padStart(2, '0')}`
  const statusColor = rack.status === 'critical' && row >= 5 ? '#ff5a73' : '#53f3c3'

  useFrame(() => {
    if (!ref.current) return
    const target = selected ? 1.05 : hovered ? 0.91 : 0.82
    ref.current.position.z = THREE.MathUtils.lerp(ref.current.position.z, target, 0.12)
  })

  return (
    <group
      ref={ref}
      position={[0, 0.68 + row * 0.44, 0.82]}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(rack.id, deviceId)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <mesh castShadow>
        <boxGeometry args={[1.3, 0.31, 0.25]} />
        <meshStandardMaterial
          color={selected ? '#173844' : row % 2 ? '#0d1d25' : '#10242d'}
          metalness={0.7}
          roughness={0.34}
          emissive={selected ? '#2abed9' : '#000000'}
          emissiveIntensity={selected ? 0.25 : 0}
        />
      </mesh>
      {[-0.38, -0.16].map((x) => (
        <mesh key={x} position={[x, 0, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.015, 16]} />
          <meshStandardMaterial color="#233e49" metalness={0.75} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0.5, 0.055, 0.142]}>
        <sphereGeometry args={[0.028, 10, 10]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
    </group>
  )
}

function CabinetDoor({ open }) {
  const pivot = useRef()
  useFrame(() => {
    if (!pivot.current) return
    pivot.current.rotation.y = THREE.MathUtils.lerp(pivot.current.rotation.y, open ? -1.08 : 0, 0.08)
  })
  return (
    <group ref={pivot} position={[-0.79, 2.14, 0.79]}>
      <group position={[0.79, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.58, 4.12, 0.035]} />
          <meshStandardMaterial color="#304a55" metalness={0.72} roughness={0.3} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
          <boxGeometry args={[1.42, 3.8, 0.012]} />
          <meshStandardMaterial color="#0f242d" transparent opacity={0.16} roughness={0.12} />
        </mesh>
      </group>
    </group>
  )
}

function Rack({ rack, selected, selectedDevice, onRackSelect, onDeviceSelect, heatmap }) {
  const color = STATUS_COLOR[rack.status] || STATUS_COLOR.healthy
  const doorOpen = selected && Boolean(selectedDevice)
  return (
    <group
      position={[rack.x, 0, rack.z]}
      onClick={(event) => {
        event.stopPropagation()
        onRackSelect(rack.id)
      }}
    >
      {heatmap && <HeatHalo rack={rack} />}
      <mesh position={[0, 2.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.62, 4.28, 1.5]} />
        <meshStandardMaterial color="#071219" metalness={0.72} roughness={0.34} />
      </mesh>
      <mesh position={[0, 4.31, 0]}>
        <boxGeometry args={[1.72, 0.08, 1.6]} />
        <meshStandardMaterial color={selected ? '#315d6a' : '#263c47'} metalness={0.7} roughness={0.28} />
      </mesh>
      {Array.from({ length: 8 }, (_, row) => {
        const deviceId = `${rack.id}/NODE-${String(row + 1).padStart(2, '0')}`
        return (
          <ServerBlade
            key={deviceId}
            rack={rack}
            row={row}
            selected={selectedDevice === deviceId}
            onSelect={onDeviceSelect}
          />
        )
      })}
      <CabinetDoor open={doorOpen} />
      <mesh position={[0.58, 4.03, 0.82]}>
        <sphereGeometry args={[0.055, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {selected && <pointLight position={[0, 2.4, 1.4]} intensity={2.8} distance={4} color="#59e4ff" />}
    </group>
  )
}

function Infrastructure({ incident }) {
  const fault = incident ? '#ff4f6d' : '#45d8f6'
  return (
    <group>
      <group position={[-12.2, 0, 3]}>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[2.1, 3.8, 1.55]} />
          <meshStandardMaterial color={incident ? '#30151b' : '#0d2029'} metalness={0.55} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.3, 0.8]}>
          <boxGeometry args={[1.55, 1.8, 0.035]} />
          <meshStandardMaterial color={fault} emissive={fault} emissiveIntensity={incident ? 1.8 : 0.3} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 2.2, 1.3]} intensity={incident ? 6 : 2} distance={5} color={fault} />
      </group>
      <group position={[12.2, 0, -5.7]}>
        <mesh position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[2.1, 3.8, 1.55]} />
          <meshStandardMaterial color="#0d2029" metalness={0.55} roughness={0.4} />
        </mesh>
      </group>
      {incident && (
        <>
          <mesh position={[-8.2, 0.07, 3]}>
            <boxGeometry args={[7.2, 0.045, 0.1]} />
            <meshStandardMaterial color="#ff506b" emissive="#ff506b" emissiveIntensity={3} toneMapped={false} />
          </mesh>
          <pointLight position={[-4, 1.2, 3]} intensity={4.5} distance={7} color="#ff506b" />
        </>
      )}
    </group>
  )
}

function CameraRig({ racks, selectedRack, selectedDevice, tour }) {
  const { camera } = useThree()
  const controls = useRef()
  const focus = useRef(new THREE.Vector3(0, 1.8, 0))
  const targetCamera = useRef(new THREE.Vector3(12.5, 7.8, 15.5))
  const targetFov = useRef(45)
  const tourIndex = useRef(0)
  const lastTour = useRef(0)

  useEffect(() => {
    const rack = racks.find((item) => item.id === selectedRack)
    if (!rack) {
      focus.current.set(0, 1.7, 0)
      targetCamera.current.set(12.5, 7.8, 15.5)
      targetFov.current = 45
      return
    }
    const nodeMatch = selectedDevice?.match(/NODE-(\d+)/)
    const row = nodeMatch ? Math.max(0, Math.min(7, Number(nodeMatch[1]) - 1)) : null
    if (row !== null) {
      const y = 0.68 + row * 0.44
      focus.current.set(rack.x, y, rack.z + 0.9)
      targetCamera.current.set(rack.x + 1.9, y + 0.7, rack.z + (rack.z > 0 ? 3.6 : -3.6))
      targetFov.current = 29
    } else {
      focus.current.set(rack.x, 2, rack.z)
      targetCamera.current.set(rack.x + 4.0, 4.3, rack.z + (rack.z > 0 ? 5.4 : -5.4))
      targetFov.current = 38
    }
  }, [racks, selectedRack, selectedDevice])

  useFrame(({ clock }) => {
    if (tour && clock.elapsedTime - lastTour.current > 4.2) {
      tourIndex.current = (tourIndex.current + 1) % racks.length
      const rack = racks[tourIndex.current]
      focus.current.set(rack.x, 2, rack.z)
      targetCamera.current.set(rack.x + 4.2, 4.4, rack.z + (rack.z > 0 ? 5.8 : -5.8))
      lastTour.current = clock.elapsedTime
    }
    camera.position.lerp(targetCamera.current, selectedDevice ? 0.05 : tour ? 0.018 : 0.06)
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, 0.055)
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.lerp(focus.current, selectedDevice ? 0.065 : 0.08)
      controls.current.update()
    }
  })

  return <OrbitControls ref={controls} enableDamping dampingFactor={0.065} minDistance={2} maxDistance={34} maxPolarAngle={Math.PI / 2.03} />
}

export function DigitalTwinScene({
  racks,
  selectedRack,
  selectedDevice,
  onRackSelect,
  onDeviceSelect,
  onClear,
  heatmap,
  links,
  airflow,
  tour,
  incident,
}) {
  const networkGeometry = useMemo(() => {
    const points = racks.map((rack) => new THREE.Vector3(rack.x, 4.75, rack.z))
    return new THREE.BufferGeometry().setFromPoints(points)
  }, [racks])

  return (
    <Canvas
      shadows
      camera={{ position: [12.5, 7.8, 15.5], fov: 45 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: 'default', failIfMajorPerformanceCaveat: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.0
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <color attach="background" args={['#03070a']} />
      <fog attach="fog" args={['#03070a', 18, 42]} />
      <ambientLight intensity={0.55} color="#a3dfff" />
      <directionalLight position={[5, 12, 7]} intensity={1.7} color="#d9f7ff" castShadow />
      <pointLight position={[0, 4.8, 0]} intensity={8} distance={18} color="#2ab6e5" />

      <HallShell />
      <RaisedFloor onClear={onClear} />
      <Infrastructure incident={incident} />

      {racks.map((rack) => (
        <Rack
          key={rack.id}
          rack={rack}
          selected={rack.id === selectedRack}
          selectedDevice={rack.id === selectedRack ? selectedDevice : null}
          onRackSelect={onRackSelect}
          onDeviceSelect={onDeviceSelect}
          heatmap={heatmap}
        />
      ))}

      {links && (
        <line geometry={networkGeometry}>
          <lineBasicMaterial color="#4fdcff" transparent opacity={0.5} />
        </line>
      )}

      {airflow && [-8, -4, 0, 4, 8].map((x) => (
        <mesh key={x} position={[x, 0.16, 0]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshBasicMaterial color="#69e7ff" transparent opacity={0.72} />
        </mesh>
      ))}

      <CameraRig racks={racks} selectedRack={selectedRack} selectedDevice={selectedDevice} tour={tour} />
    </Canvas>
  )
}
