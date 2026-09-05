import { Line, RoundedBox, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

function CeilingLight({ x, z }) {
  return (
    <group position={[x, 6.15, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[2.2, 0.08, 0.46]} />
        <meshStandardMaterial color="#d9f6ff" emissive="#9beaff" emissiveIntensity={3.2} />
      </mesh>
      <pointLight position={[0, -0.5, 0]} intensity={5.5} distance={6.5} color="#bdeeff" />
    </group>
  )
}

export function FacilityShell() {
  const lights = [-10, -5, 0, 5, 10]
  const columns = [-12, -6, 0, 6, 12]
  return (
    <>
      <group>
        <mesh position={[0, 3.15, -9.2]} receiveShadow>
          <boxGeometry args={[30, 6.3, 0.18]} />
          <meshStandardMaterial color="#09151d" metalness={0.48} roughness={0.58} />
        </mesh>
        <mesh position={[-15.05, 3.15, 0]} receiveShadow>
          <boxGeometry args={[0.18, 6.3, 18.5]} />
          <meshStandardMaterial color="#08131a" metalness={0.45} roughness={0.62} />
        </mesh>
        <mesh position={[15.05, 3.15, 0]} receiveShadow>
          <boxGeometry args={[0.18, 6.3, 18.5]} />
          <meshStandardMaterial color="#08131a" metalness={0.45} roughness={0.62} />
        </mesh>

        {columns.map((x) => (
          <group key={x}>
            <mesh position={[x, 3.05, -8.8]} castShadow>
              <boxGeometry args={[0.24, 6.1, 0.34]} />
              <meshStandardMaterial color="#1b303c" metalness={0.72} roughness={0.3} />
            </mesh>
            <mesh position={[x, 5.98, 0]}>
              <boxGeometry args={[0.18, 0.22, 18]} />
              <meshStandardMaterial color="#182d38" metalness={0.74} roughness={0.32} />
            </mesh>
          </group>
        ))}

        {lights.flatMap((x) => [-5.9, 0, 5.9].map((z) => <CeilingLight key={`${x}-${z}`} x={x} z={z} />))}

        <Text position={[0, 4.9, -9.05]} fontSize={0.72} color="#264c5c" anchorX="center">
          DC-01 · AI COMPUTE HALL
        </Text>
      </group>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.78} luminanceThreshold={0.62} luminanceSmoothing={0.18} mipmapBlur />
      </EffectComposer>
    </>
  )
}

function CableTrayRail({ z, color = '#244b59' }) {
  return (
    <group position={[0, 5.45, z]}>
      <mesh position={[0, 0, -0.19]}>
        <boxGeometry args={[25.2, 0.08, 0.08]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.19]}>
        <boxGeometry args={[25.2, 0.08, 0.08]} />
        <meshStandardMaterial color={color} metalness={0.85} roughness={0.22} />
      </mesh>
      {Array.from({ length: 15 }, (_, i) => -11.9 + i * 1.7).map((x) => (
        <mesh key={x} position={[x, 0, 0]}>
          <boxGeometry args={[0.07, 0.06, 0.46]} />
          <meshStandardMaterial color="#315f6e" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

export function CableTrays() {
  return (
    <group>
      <CableTrayRail z={-3} />
      <CableTrayRail z={3} color="#2b4d63" />
      <Line points={[[-12, 5.52, -2.92], [12, 5.52, -2.92]]} color="#2bd7ff" lineWidth={1.1} transparent opacity={0.5} />
      <Line points={[[-12, 5.52, 2.92], [12, 5.52, 2.92]]} color="#4cf0b6" lineWidth={1.1} transparent opacity={0.42} />
    </group>
  )
}

function Fan({ position, warning = false, speed = 1 }) {
  const fan = useRef()
  useFrame((_, delta) => {
    if (fan.current) fan.current.rotation.z -= delta * (warning ? 5.2 : 8.4) * speed
  })
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.06, 28]} />
        <meshStandardMaterial color="#071219" metalness={0.8} roughness={0.3} />
      </mesh>
      <group ref={fan}>
        {[0, 1, 2, 3].map((blade) => (
          <mesh key={blade} rotation={[0, 0, blade * Math.PI / 2]} position={[0.18, 0, 0.055]}>
            <boxGeometry args={[0.33, 0.08, 0.025]} />
            <meshStandardMaterial color={warning ? '#a85663' : '#3b6876'} metalness={0.55} roughness={0.42} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0, 0.075]}>
        <sphereGeometry args={[0.075, 14, 14]} />
        <meshStandardMaterial color={warning ? '#ff5a73' : '#53f3c3'} emissive={warning ? '#ff5a73' : '#53f3c3'} emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function CoolingUnit({ id, position, incident = false }) {
  const isFault = id === 'CRAC-02' && incident
  return (
    <group position={position}>
      <RoundedBox args={[2.1, 3.85, 1.55]} radius={0.08} smoothness={3} position={[0, 1.95, 0]} castShadow>
        <meshStandardMaterial color="#0b1a22" metalness={0.67} roughness={0.36} />
      </RoundedBox>
      <mesh position={[0, 2.05, 0.795]}>
        <boxGeometry args={[1.72, 2.5, 0.035]} />
        <meshStandardMaterial color={isFault ? '#35151d' : '#102832'} emissive={isFault ? '#ff334f' : '#0c6b82'} emissiveIntensity={isFault ? 0.45 : 0.12} />
      </mesh>
      <Fan position={[-0.48, 2.45, 0.84]} warning={isFault} speed={0.8} />
      <Fan position={[0.48, 2.45, 0.84]} warning={isFault} speed={0.95} />
      <mesh position={[0, 0.72, 0.83]}>
        <boxGeometry args={[1.55, 0.55, 0.035]} />
        <meshStandardMaterial color="#17313c" metalness={0.62} roughness={0.4} />
      </mesh>
      <Text position={[0, 4.3, 0]} fontSize={0.27} color={isFault ? '#ff667d' : '#6fb4c6'} anchorX="center">
        {id}
      </Text>
      <Text position={[0, 4.02, 0]} fontSize={0.14} color={isFault ? '#ff9aa8' : '#3c7887'} anchorX="center">
        {isFault ? 'AIRFLOW DEGRADED · 57%' : 'COOLING ONLINE'}
      </Text>
      <pointLight position={[0, 2.2, 1.2]} intensity={isFault ? 7 : 2.5} distance={4.5} color={isFault ? '#ff334f' : '#28c7ff'} />
    </group>
  )
}

function PduUnit({ id, position }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.25, 3.25, 1.1]} radius={0.06} smoothness={3} position={[0, 1.65, 0]} castShadow>
        <meshStandardMaterial color="#111a20" metalness={0.72} roughness={0.32} />
      </RoundedBox>
      {Array.from({ length: 7 }, (_, i) => i).map((i) => (
        <group key={i} position={[0, 0.55 + i * 0.35, 0.57]}>
          <mesh>
            <boxGeometry args={[0.95, 0.18, 0.025]} />
            <meshStandardMaterial color="#20323b" />
          </mesh>
          <mesh position={[0.36, 0, 0.03]}>
            <sphereGeometry args={[0.035, 10, 10]} />
            <meshStandardMaterial color="#53f3c3" emissive="#53f3c3" emissiveIntensity={2.1} />
          </mesh>
        </group>
      ))}
      <Text position={[0, 3.65, 0]} fontSize={0.23} color="#789eaa" anchorX="center">{id}</Text>
    </group>
  )
}

export function InfrastructureAssets({ incident }) {
  return (
    <group>
      <CoolingUnit id="CRAC-01" position={[12.2, 0, -5.7]} />
      <CoolingUnit id="CRAC-02" position={[-12.2, 0, 3]} incident={incident} />
      <PduUnit id="PDU-A" position={[12.45, 0, 3]} />
      <PduUnit id="PDU-B" position={[-12.45, 0, -3.2]} />
    </group>
  )
}

function MovingDot({ curve, offset = 0, color = '#70efff', speed = 0.11, size = 0.075 }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * speed + offset) % 1
    ref.current.position.copy(curve.getPointAt(t))
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshBasicMaterial color={color} transparent opacity={0.95} blending={THREE.AdditiveBlending} />
      <pointLight intensity={1.2} distance={1.3} color={color} />
    </mesh>
  )
}

export function NetworkFlow({ visible }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-11.5, 5.58, 0),
    new THREE.Vector3(-5.5, 5.68, 0),
    new THREE.Vector3(0, 5.62, 0),
    new THREE.Vector3(5.5, 5.68, 0),
    new THREE.Vector3(11.5, 5.58, 0),
  ]), [])
  if (!visible) return null
  return (
    <group>
      <Line points={curve.getPoints(60).map((p) => p.toArray())} color="#3bdcff" lineWidth={1.4} transparent opacity={0.3} />
      {[0, 0.18, 0.36, 0.54, 0.72].map((offset) => <MovingDot key={offset} curve={curve} offset={offset} />)}
    </group>
  )
}

function FaultRing() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const scale = 1 + (Math.sin(clock.elapsedTime * 4) + 1) * 0.12
    ref.current.scale.setScalar(scale)
    ref.current.material.opacity = 0.45 + Math.sin(clock.elapsedTime * 4) * 0.18
  })
  return (
    <mesh ref={ref} position={[-4, 0.09, 3]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.35, 0.045, 12, 64]} />
      <meshBasicMaterial color="#ff405d" transparent opacity={0.55} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

export function IncidentPath({ active }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-11.1, 3.7, 3),
    new THREE.Vector3(-9.2, 5.15, 3),
    new THREE.Vector3(-6.6, 5.15, 3),
    new THREE.Vector3(-4, 4.65, 3),
  ]), [])
  if (!active) return null
  const points = curve.getPoints(60).map((p) => p.toArray())
  return (
    <group>
      <Line points={points} color="#ff405d" lineWidth={3.2} transparent opacity={0.72} />
      <Line points={points} color="#ffc25a" lineWidth={1} transparent opacity={0.9} />
      {[0, 0.2, 0.4, 0.6, 0.8].map((offset) => (
        <MovingDot key={offset} curve={curve} offset={offset} color="#ff5a73" speed={0.2} size={0.095} />
      ))}
      <FaultRing />
      <Text position={[-7.55, 5.55, 3]} fontSize={0.25} color="#ff8191" anchorX="center">
        COOLING FAULT PATH
      </Text>
    </group>
  )
}

function HeatParticle({ index }) {
  const ref = useRef()
  const phase = index * 0.43
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = (clock.elapsedTime * (0.26 + (index % 4) * 0.018) + phase) % 1
    ref.current.position.set(
      -4 + Math.sin(t * Math.PI * 4 + phase) * (0.22 + (index % 3) * 0.07),
      4.15 + t * 2.35,
      3 + Math.cos(t * Math.PI * 3 + phase) * 0.28,
    )
    ref.current.material.opacity = (1 - t) * 0.55
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09 + (index % 3) * 0.025, 10, 10]} />
      <meshBasicMaterial color={index % 2 ? '#ff5a73' : '#ffab4c'} transparent opacity={0.45} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

export function ThermalPlume({ active }) {
  if (!active) return null
  return (
    <group>
      {Array.from({ length: 18 }, (_, i) => <HeatParticle key={i} index={i} />)}
      <pointLight position={[-4, 4.7, 3]} intensity={9} distance={5} color="#ff3f58" />
    </group>
  )
}
