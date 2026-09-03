import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, Line, MeshReflectorMaterial, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { CableTrays, FacilityShell, IncidentPath, InfrastructureAssets, NetworkFlow, ThermalPlume } from './sceneEnhancements'
import { CabinetDoor, GpuServerBlade } from './rackDevices'

const STATUS = {
  healthy: { label: '正常', color: '#53f3c3' },
  warning: { label: '预警', color: '#ffc857' },
  critical: { label: '严重', color: '#ff5a73' },
}

function GlowLed({ color, position, scale = 1 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.material.emissiveIntensity = 2.2 + Math.sin(clock.elapsedTime * 3.6) * 0.8
  })
  return (
    <mesh ref={ref} position={position} scale={scale}>
      <sphereGeometry args={[0.055, 14, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
    </mesh>
  )
}

function AislePulse({ z, color, offset = 0, reverse = false }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const raw = (clock.elapsedTime * 2.3 + offset) % 22
    ref.current.position.x = reverse ? 11 - raw : -11 + raw
  })
  return (
    <mesh ref={ref} position={[-11, 0.085, z]}>
      <sphereGeometry args={[0.075, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      <pointLight intensity={1.5} distance={1.6} color={color} />
    </mesh>
  )
}

function AisleLighting({ incident }) {
  const cold = '#55ddff'
  const hot = incident ? '#ff526f' : '#ff9d57'
  return (
    <group>
      {[-0.92, 0.92].map((z) => (
        <mesh key={`cold-${z}`} position={[0, 0.035, z]}>
          <boxGeometry args={[22, 0.035, 0.045]} />
          <meshStandardMaterial color={cold} emissive={cold} emissiveIntensity={3.8} toneMapped={false} />
        </mesh>
      ))}
      {[-5.2, 5.2].map((z) => (
        <mesh key={`hot-${z}`} position={[0, 0.035, z]}>
          <boxGeometry args={[22, 0.035, 0.04]} />
          <meshStandardMaterial color={hot} emissive={hot} emissiveIntensity={incident ? 4.5 : 2.0} toneMapped={false} />
        </mesh>
      ))}
      <AislePulse z={-0.92} color={cold} offset={0} />
      <AislePulse z={0.92} color={cold} offset={8} reverse />
      <AislePulse z={-5.2} color={hot} offset={3} reverse />
      <AislePulse z={5.2} color={hot} offset={12} />
    </group>
  )
}

function ReflectiveRaisedFloor({ onClear }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onClear}>
        <planeGeometry args={[31, 19]} />
        <MeshReflectorMaterial
          blur={[240, 90]}
          resolution={512}
          mixBlur={1}
          mixStrength={9}
          mirror={0.32}
          roughness={0.72}
          depthScale={0.75}
          minDepthThreshold={0.25}
          maxDepthThreshold={1.5}
          color="#071218"
          metalness={0.42}
        />
      </mesh>
      <Grid
        position={[0, 0.016, 0]}
        args={[31, 19]}
        cellSize={0.8}
        cellThickness={0.42}
        cellColor="#17343f"
        sectionSize={4}
        sectionThickness={0.72}
        sectionColor="#285467"
        fadeDistance={27}
        fadeStrength={1.7}
        infiniteGrid={false}
      />
      {Array.from({ length: 15 }, (_, index) => (
        <mesh key={index} position={[-14 + index * 2, 0.028, 7.9]}>
          <boxGeometry args={[1.72, 0.025, 0.04]} />
          <meshStandardMaterial color="#21414c" metalness={0.76} roughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function HeatHalo({ rack }) {
  const color = rack.temp > 35 ? '#ff3f62' : rack.temp > 28 ? '#ff9e4a' : '#31d9bd'
  return (
    <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.45, 1.48, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function RackV4({ rack, selected, selectedDevice, onRackSelect, onDeviceSelect, heatmap }) {
  const group = useRef()
  const statusColor = STATUS[rack.status].color
  const doorOpen = selected && Boolean(selectedDevice)
  const frontGlow = selected ? '#71eaff' : '#1d3b47'

  useFrame(({ clock }) => {
    if (!group.current) return
    const targetY = rack.status === 'critical' ? Math.sin(clock.elapsedTime * 3.6) * 0.014 : 0
    group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, targetY, 0.16)
  })

  const deviceRows = useMemo(() => Array.from({ length: 8 }, (_, row) => row), [])

  return (
    <group ref={group} position={[rack.x, 0, rack.z]} onClick={(event) => { event.stopPropagation(); onRackSelect(rack.id) }}>
      {heatmap && <HeatHalo rack={rack} />}

      <RoundedBox args={[1.62, 4.3, 1.52]} radius={0.075} smoothness={4} position={[0, 2.15, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#061017" metalness={0.88} roughness={0.24} clearcoat={0.72} clearcoatRoughness={0.18} />
      </RoundedBox>

      <mesh position={[0, 2.15, 0.775]} castShadow>
        <boxGeometry args={[1.7, 4.38, 0.03]} />
        <meshStandardMaterial color={frontGlow} emissive={selected ? '#55dfff' : '#102d37'} emissiveIntensity={selected ? 0.65 : 0.08} metalness={0.74} roughness={0.24} toneMapped={!selected} />
      </mesh>

      <mesh position={[-0.76, 2.14, 0.8]}><boxGeometry args={[0.045, 3.92, 0.04]} /><meshStandardMaterial color="#718c96" metalness={0.92} roughness={0.16} /></mesh>
      <mesh position={[0.76, 2.14, 0.8]}><boxGeometry args={[0.045, 3.92, 0.04]} /><meshStandardMaterial color="#718c96" metalness={0.92} roughness={0.16} /></mesh>

      {deviceRows.map((row) => {
        const deviceId = `${rack.id}/NODE-${String(row + 1).padStart(2, '0')}`
        return (
          <GpuServerBlade
            key={deviceId}
            rack={rack}
            row={row}
            y={0.69 + row * 0.44}
            selected={selectedDevice === deviceId}
            onSelect={onDeviceSelect}
          />
        )
      })}

      <CabinetDoor open={doorOpen} />
      <GlowLed color={statusColor} position={[0.56, 4.05, 0.84]} scale={1.08} />

      <Text position={[0, 4.76, 0]} fontSize={0.27} color={selected ? '#dffbff' : '#7c9faa'} anchorX="center" anchorY="middle">
        {rack.id}
      </Text>
      <Text position={[0, 4.46, 0]} fontSize={0.15} color={statusColor} anchorX="center" anchorY="middle">
        {rack.temp.toFixed(1)}°C · {Math.round(rack.gpu)}%
      </Text>
    </group>
  )
}

function NetworkLinks({ racks, visible }) {
  if (!visible) return null
  return (
    <group>
      <Line points={[[-9.5, 4.88, 0], [9.5, 4.88, 0]]} color="#43d8ff" lineWidth={1.55} transparent opacity={0.48} />
      {racks.map((rack) => (
        <Line
          key={rack.id}
          points={[[rack.x, 4.36, rack.z], [rack.x, 4.88, 0]]}
          color={rack.status === 'critical' ? '#ff5a73' : '#57efc4'}
          lineWidth={1.05}
          transparent
          opacity={0.48}
        />
      ))}
    </group>
  )
}

function AirParticle({ index }) {
  const ref = useRef()
  const baseX = -9.5 + (index % 10) * 2.05
  useFrame(({ clock }) => {
    if (!ref.current) return
    const z = ((clock.elapsedTime * (0.55 + (index % 4) * 0.06) + index * 0.61) % 5.6) - 2.8
    ref.current.position.set(baseX, 0.22 + (index % 5) * 0.09, z * 0.3)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.052, 10, 10]} />
      <meshBasicMaterial color="#64e5ff" transparent opacity={0.68} toneMapped={false} />
    </mesh>
  )
}

function CoolingAirflow({ visible }) {
  if (!visible) return null
  return <group>{Array.from({ length: 24 }, (_, index) => <AirParticle key={index} index={index} />)}</group>
}

function parseDeviceRow(deviceId) {
  const match = deviceId?.match(/NODE-(\d+)/)
  return match ? Math.max(0, Math.min(7, Number(match[1]) - 1)) : null
}

function CinematicCamera({ racks, selectedRack, selectedDevice, tour }) {
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

    const row = parseDeviceRow(selectedDevice)
    if (row !== null) {
      const y = 0.69 + row * 0.44
      focus.current.set(rack.x, y, rack.z + 0.96)
      targetCamera.current.set(rack.x + 1.82, y + 0.64, rack.z + (rack.z > 0 ? 3.55 : -3.55))
      targetFov.current = 28
    } else {
      focus.current.set(rack.x, 2.0, rack.z + (rack.z > 0 ? 0.22 : -0.22))
      targetCamera.current.set(rack.x + 4.0, 4.3, rack.z + (rack.z > 0 ? 5.4 : -5.4))
      targetFov.current = 37
    }
  }, [racks, selectedRack, selectedDevice])

  useFrame(({ clock }) => {
    if (tour && clock.elapsedTime - lastTour.current > 4.2) {
      tourIndex.current = (tourIndex.current + 1) % racks.length
      const rack = racks[tourIndex.current]
      focus.current.set(rack.x, 2.0, rack.z)
      targetCamera.current.set(rack.x + 4.2, 4.4, rack.z + (rack.z > 0 ? 5.8 : -5.8))
      targetFov.current = 38
      lastTour.current = clock.elapsedTime
    }

    camera.position.lerp(targetCamera.current, selectedDevice ? 0.048 : tour ? 0.018 : 0.06)
    camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov.current, 0.055)
    camera.updateProjectionMatrix()
    if (controls.current) {
      controls.current.target.lerp(focus.current, selectedDevice ? 0.065 : tour ? 0.025 : 0.08)
      controls.current.update()
    }
  })

  return <OrbitControls ref={controls} enableDamping dampingFactor={0.065} minDistance={1.9} maxDistance={34} maxPolarAngle={Math.PI / 2.03} />
}

export function DigitalTwinScene({ racks, selectedRack, selectedDevice, onRackSelect, onDeviceSelect, onClear, heatmap, links, airflow, tour, incident }) {
  return (
    <Canvas
      shadows
      camera={{ position: [12.5, 7.8, 15.5], fov: 45 }}
      dpr={[1, 1.65]}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.02
        gl.outputColorSpace = THREE.SRGBColorSpace
      }}
    >
      <Suspense fallback={null}>
        <color attach="background" args={['#03070a']} />
        <fog attach="fog" args={['#03070a', 18, 42]} />
        <ambientLight intensity={0.3} color="#a3dfff" />
        <directionalLight position={[5, 12, 7]} intensity={1.9} color="#d9f7ff" castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[0, 4.8, 0]} intensity={11} distance={18} color="#2ab6e5" />
        <pointLight position={[-10, 2.4, -4]} intensity={5} distance={10} color="#39e2b3" />
        <pointLight position={[10, 2.4, 4]} intensity={5} distance={10} color="#3b78ff" />

        <FacilityShell />
        <CableTrays />
        <InfrastructureAssets incident={incident} />
        <ReflectiveRaisedFloor onClear={onClear} />
        <AisleLighting incident={incident} />

        <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[22, 1.72]} />
          <meshStandardMaterial color="#082733" transparent opacity={0.32} emissive="#0a83a1" emissiveIntensity={0.28} />
        </mesh>
        <Text position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.38} color="#6be1f7">COLD AISLE · A1</Text>

        {racks.map((rack) => (
          <RackV4
            key={rack.id}
            rack={rack}
            selected={rack.id === selectedRack}
            selectedDevice={rack.id === selectedRack ? selectedDevice : null}
            onRackSelect={onRackSelect}
            onDeviceSelect={onDeviceSelect}
            heatmap={heatmap}
          />
        ))}

        <NetworkLinks racks={racks} visible={links} />
        <NetworkFlow visible={links} />
        <CoolingAirflow visible={airflow} />
        <IncidentPath active={incident} />
        <ThermalPlume active={incident} />
        <CinematicCamera racks={racks} selectedRack={selectedRack} selectedDevice={selectedDevice} tour={tour} />

        <EffectComposer multisampling={2}>
          <Bloom mipmapBlur luminanceThreshold={0.38} luminanceSmoothing={0.2} intensity={0.9} />
          <Vignette eskil={false} offset={0.13} darkness={0.78} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  )
}
