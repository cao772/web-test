import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const GREEN = '#53f3c3'
const CYAN = '#6eeaff'
const RED = '#ff5a73'

function StatusLed({ color, position }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.026, 10, 10]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3.5} toneMapped={false} />
    </mesh>
  )
}

function Fan({ x }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = clock.elapsedTime * 4.5
  })
  return (
    <group position={[x, 0, 0.112]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.014, 18]} />
        <meshStandardMaterial color="#071218" metalness={0.7} roughness={0.35} />
      </mesh>
      <group ref={ref}>
        {[0, 1, 2, 3].map((blade) => (
          <mesh key={blade} rotation={[0, 0, blade * Math.PI / 2]} position={[0.033, 0, 0.122]}>
            <boxGeometry args={[0.055, 0.017, 0.008]} />
            <meshStandardMaterial color="#36515d" metalness={0.8} roughness={0.3} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export function GpuServerBlade({ rack, row, y, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const group = useRef()
  const deviceId = `${rack.id}/NODE-${String(row + 1).padStart(2, '0')}`
  const critical = rack.status === 'critical' && row >= 5
  const statusColor = critical ? RED : GREEN

  useEffect(() => {
    if (!hovered) return undefined
    document.body.style.cursor = 'pointer'
    return () => { document.body.style.cursor = 'default' }
  }, [hovered])

  useFrame(() => {
    if (!group.current) return
    const targetZ = selected ? 1.13 : hovered ? 0.98 : 0.89
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, targetZ, selected ? 0.12 : 0.16)
  })

  return (
    <group
      ref={group}
      position={[0, y, 0.89]}
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
        <boxGeometry args={[1.32, 0.32, 0.22]} />
        <meshStandardMaterial
          color={selected ? '#173844' : row % 2 ? '#0d1d25' : '#10242d'}
          metalness={0.82}
          roughness={0.32}
          emissive={selected ? CYAN : '#000000'}
          emissiveIntensity={selected ? 0.16 : 0}
        />
      </mesh>

      <mesh position={[0, 0, 0.116]}>
        <boxGeometry args={[1.22, 0.235, 0.018]} />
        <meshStandardMaterial color="#0a151b" metalness={0.62} roughness={0.48} />
      </mesh>

      <Fan x={-0.33} />
      <Fan x={-0.13} />

      <mesh position={[0.18, 0.018, 0.13]}>
        <boxGeometry args={[0.31, 0.07, 0.018]} />
        <meshStandardMaterial color="#183744" metalness={0.65} roughness={0.4} />
      </mesh>
      {[0, 1, 2, 3].map((port) => (
        <mesh key={port} position={[0.08 + port * 0.065, 0.018, 0.142]}>
          <boxGeometry args={[0.035, 0.026, 0.009]} />
          <meshStandardMaterial color={port < 2 ? '#4f8295' : '#274754'} emissive={port === 0 ? CYAN : '#000'} emissiveIntensity={0.8} />
        </mesh>
      ))}

      <StatusLed color={statusColor} position={[0.49, 0.055, 0.143]} />
      <StatusLed color={row % 3 === 0 ? CYAN : GREEN} position={[0.55, 0.055, 0.143]} />

      <Text
        position={[0.43, -0.055, 0.145]}
        fontSize={0.055}
        color={selected ? '#d7f9ff' : '#5f8998'}
        anchorX="center"
        anchorY="middle"
      >
        N{String(row + 1).padStart(2, '0')} · H100
      </Text>

      {selected && (
        <>
          <pointLight position={[0, 0.08, 0.36]} intensity={4.5} distance={1.7} color={CYAN} />
          <mesh position={[0, 0, 0.19]}>
            <boxGeometry args={[1.39, 0.38, 0.012]} />
            <meshBasicMaterial color={CYAN} transparent opacity={0.17} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  )
}

export function CabinetDoor({ open }) {
  const pivot = useRef()
  useFrame(() => {
    if (!pivot.current) return
    pivot.current.rotation.y = THREE.MathUtils.lerp(pivot.current.rotation.y, open ? -1.14 : 0, 0.08)
  })

  return (
    <group ref={pivot} position={[-0.8, 2.12, 0.83]}>
      <group position={[0.8, 0, 0]}>
        <mesh>
          <boxGeometry args={[1.58, 4.14, 0.035]} />
          <meshStandardMaterial color="#274554" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0, 0.025]}>
          <boxGeometry args={[1.43, 3.82, 0.018]} />
          <meshPhysicalMaterial color="#17303a" transparent opacity={0.13} roughness={0.08} metalness={0.18} transmission={0.18} />
        </mesh>
        <mesh position={[0.62, 0, 0.055]}>
          <boxGeometry args={[0.045, 0.48, 0.055]} />
          <meshStandardMaterial color="#7695a1" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    </group>
  )
}

export function DeviceFocusLabel({ rack, deviceId }) {
  if (!deviceId) return null
  const match = deviceId.match(/NODE-(\d+)/)
  const row = match ? Math.max(0, Number(match[1]) - 1) : 0
  const y = 0.69 + row * 0.44
  return (
    <group position={[rack.x, y + 0.42, rack.z + 1.18]}>
      <Text fontSize={0.12} color="#bff8ff" anchorX="center" anchorY="middle">
        {deviceId.replace(`${rack.id}/`, '')} · 8×H100
      </Text>
      <mesh position={[0, -0.16, -0.05]}>
        <boxGeometry args={[1.0, 0.012, 0.012]} />
        <meshBasicMaterial color={CYAN} toneMapped={false} />
      </mesh>
    </group>
  )
}
