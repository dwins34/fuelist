'use client'

/**
 * FruitScene — the Three.js canvas.
 *
 * Renders floating 3D fruit shapes behind all page content.
 * This file is dynamically imported (SSR: false) by FruitBackground.tsx.
 *
 * Performance knobs:
 *  - dpr capped at 1.5 (half-res on retina keeps GPU happy)
 *  - No shadows
 *  - Fruit count halved on mobile via MOBILE_BREAKPOINT
 *  - frameloop="demand" would save more, but parallax needs "always"
 */

import { useRef, useMemo, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, MeshDistortMaterial, Environment } from '@react-three/drei'
import * as THREE from 'three'

// ── Fruit data ────────────────────────────────────────────────────────────────

interface FruitDef {
  id:       string
  position: [number, number, number]
  color:    string
  emissive: string         // subtle self-glow (like a juicy highlight)
  roughness: number
  metalness: number
  scale:    [number, number, number]
  geo:      'sphere' | 'ico'
  distort:  number         // MeshDistortMaterial warp amount
  speed:    number         // Float animation speed
  floatIntensity: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
  mobileHide?: boolean     // hide on mobile to save GPU
}

const FRUITS: FruitDef[] = [
  // ── Oranges ──────────────────────────────────────────────────────────────
  {
    id: 'orange-l', position: [-3.5, 1.2, -3],
    color: '#FF8C00', emissive: '#FF4500',
    roughness: 0.25, metalness: 0.08,
    scale: [1.05, 1.05, 1.05], geo: 'sphere', distort: 0.15,
    speed: 1.2, floatIntensity: 0.6,
    rotateY: 0.003,
  },
  {
    id: 'orange-r', position: [4.2, -1.8, -5],
    color: '#FF7F00', emissive: '#CC3300',
    roughness: 0.28, metalness: 0.06,
    scale: [0.75, 0.75, 0.75], geo: 'sphere', distort: 0.12,
    speed: 1.5, floatIntensity: 0.5,
    rotateY: -0.004, mobileHide: true,
  },

  // ── Apple / Tomato red ────────────────────────────────────────────────────
  {
    id: 'apple-1', position: [2.8, 2.5, -2],
    color: '#E63946', emissive: '#9B1515',
    roughness: 0.22, metalness: 0.12,
    scale: [0.9, 0.95, 0.9], geo: 'sphere', distort: 0.1,
    speed: 1.0, floatIntensity: 0.7,
    rotateX: 0.002, rotateY: 0.004,
  },
  {
    id: 'apple-2', position: [-4.5, -1.5, -6],
    color: '#C1121F', emissive: '#6A0011',
    roughness: 0.3, metalness: 0.1,
    scale: [1.1, 1.1, 1.1], geo: 'sphere', distort: 0.14,
    speed: 0.8, floatIntensity: 0.55,
    rotateY: 0.003, mobileHide: true,
  },

  // ── Mango (elongated yellow-orange sphere) ────────────────────────────────
  {
    id: 'mango-1', position: [1.2, -2.8, -2.5],
    color: '#FFB703', emissive: '#E07B00',
    roughness: 0.2, metalness: 0.08,
    scale: [0.7, 1.05, 0.68], geo: 'sphere', distort: 0.18,
    speed: 1.1, floatIntensity: 0.65,
    rotateX: 0.003, rotateZ: 0.002,
  },
  {
    id: 'mango-2', position: [-1.8, 3.2, -4],
    color: '#FFAA00', emissive: '#CC7700',
    roughness: 0.22, metalness: 0.06,
    scale: [0.55, 0.82, 0.52], geo: 'sphere', distort: 0.15,
    speed: 1.3, floatIntensity: 0.5,
    rotateY: -0.002, mobileHide: true,
  },

  // ── Lime / Green apple ────────────────────────────────────────────────────
  {
    id: 'lime-1', position: [5.0, 0.5, -5],
    color: '#70D44B', emissive: '#2D6A00',
    roughness: 0.25, metalness: 0.10,
    scale: [0.65, 0.65, 0.65], geo: 'sphere', distort: 0.1,
    speed: 1.4, floatIntensity: 0.6,
    rotateY: 0.005, mobileHide: true,
  },
  {
    id: 'lime-2', position: [-5.5, 2.0, -7],
    color: '#52B788', emissive: '#1B4332',
    roughness: 0.28, metalness: 0.08,
    scale: [0.9, 0.9, 0.9], geo: 'sphere', distort: 0.12,
    speed: 0.9, floatIntensity: 0.45,
    rotateX: 0.002, mobileHide: true,
  },

  // ── Berry cluster (purple icosahedra) ─────────────────────────────────────
  {
    id: 'berry-1', position: [-2.2, 3.5, -1.5],
    color: '#9B2226', emissive: '#5C0F13',
    roughness: 0.45, metalness: 0.02,
    scale: [0.38, 0.38, 0.38], geo: 'ico', distort: 0.05,
    speed: 2.0, floatIntensity: 0.9,
    rotateX: 0.01, rotateY: 0.008,
  },
  {
    id: 'berry-2', position: [-1.6, 3.8, -1.8],
    color: '#6A0572', emissive: '#3C0040',
    roughness: 0.42, metalness: 0.02,
    scale: [0.32, 0.32, 0.32], geo: 'ico', distort: 0.05,
    speed: 1.8, floatIntensity: 0.85,
    rotateY: -0.012,
  },
  {
    id: 'berry-3', position: [-2.7, 3.2, -2.0],
    color: '#7B2D8B', emissive: '#3D0048',
    roughness: 0.48, metalness: 0.01,
    scale: [0.28, 0.28, 0.28], geo: 'ico', distort: 0.04,
    speed: 2.2, floatIntensity: 0.95,
    rotateX: -0.009, mobileHide: true,
  },

  // ── Strawberry / Pink ─────────────────────────────────────────────────────
  {
    id: 'straw-1', position: [-5.0, -3.0, -4],
    color: '#FF6B6B', emissive: '#AA0030',
    roughness: 0.35, metalness: 0.05,
    scale: [0.55, 0.7, 0.55], geo: 'ico', distort: 0.08,
    speed: 1.3, floatIntensity: 0.6,
    rotateX: 0.005, rotateY: 0.007, mobileHide: true,
  },

  // ── Lemon (small, back) ───────────────────────────────────────────────────
  {
    id: 'lemon-1', position: [3.5, 3.2, -4.5],
    color: '#FFF44F', emissive: '#B8A700',
    roughness: 0.2, metalness: 0.05,
    scale: [0.55, 0.72, 0.55], geo: 'sphere', distort: 0.13,
    speed: 1.6, floatIntensity: 0.7,
    rotateZ: 0.003, mobileHide: true,
  },
]

// ── Single fruit mesh ─────────────────────────────────────────────────────────

function FruitMesh({ def }: { def: FruitDef }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (!meshRef.current) return
    if (def.rotateX) meshRef.current.rotation.x += def.rotateX
    if (def.rotateY) meshRef.current.rotation.y += def.rotateY
    if (def.rotateZ) meshRef.current.rotation.z += def.rotateZ
  })

  const geometry = useMemo(() => {
    if (def.geo === 'ico') return new THREE.IcosahedronGeometry(1, 2)
    return new THREE.SphereGeometry(1, 40, 40)
  }, [def.geo])

  return (
    <Float
      speed={def.speed}
      rotationIntensity={0.4}
      floatIntensity={def.floatIntensity}
    >
      <mesh
        ref={meshRef}
        position={def.position}
        scale={def.scale}
        castShadow={false}
        receiveShadow={false}
      >
        <primitive object={geometry} attach="geometry" />
        {/* MeshDistortMaterial gives the organic "squish" effect */}
        <MeshDistortMaterial
          color={def.color}
          emissive={def.emissive}
          emissiveIntensity={0.12}
          roughness={def.roughness}
          metalness={def.metalness}
          distort={def.distort}
          speed={1.5}
        />
      </mesh>
    </Float>
  )
}

// ── Mouse parallax controller ─────────────────────────────────────────────────

function ParallaxController() {
  const { camera } = useThree()
  const mouse = useRef({ x: 0, y: 0 })
  const targetOffset = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: MouseEvent) {
      // Normalize to -1..1
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame(() => {
    // Smooth damping toward mouse position
    targetOffset.current.x += (mouse.current.x * 0.4 - targetOffset.current.x) * 0.04
    targetOffset.current.y += (-mouse.current.y * 0.3 - targetOffset.current.y) * 0.04

    camera.position.x = targetOffset.current.x
    camera.position.y = targetOffset.current.y
    camera.lookAt(0, 0, 0)
  })

  return null
}

// ── Scene ─────────────────────────────────────────────────────────────────────

function Scene({ isMobile }: { isMobile: boolean }) {
  const visibleFruits = useMemo(
    () => isMobile ? FRUITS.filter((f) => !f.mobileHide) : FRUITS,
    [isMobile]
  )

  return (
    <>
      {/* Lighting rig */}
      <ambientLight intensity={0.55} />

      {/* Main warm key light */}
      <directionalLight position={[5, 8, 5]} intensity={1.6} color="#FFECD0" />

      {/* Cool rim light from below-back */}
      <pointLight position={[-6, -4, -4]} intensity={0.5} color="#C8E6FF" />

      {/* Warm fill on the left */}
      <pointLight position={[-5, 4, 3]}  intensity={0.6} color="#FFD580" />

      {/* Accent: soft magenta for depth */}
      <pointLight position={[6, -3, 2]}  intensity={0.3} color="#FFB3C6" />

      {/* Environment gives natural reflections */}
      <Suspense fallback={null}>
        <Environment preset="sunset" />
      </Suspense>

      {/* Parallax — moves camera with mouse */}
      <ParallaxController />

      {/* Fruit meshes */}
      {visibleFruits.map((def) => (
        <FruitMesh key={def.id} def={def} />
      ))}
    </>
  )
}

// ── Exported canvas ───────────────────────────────────────────────────────────

export default function FruitScene({ isMobile }: { isMobile: boolean }) {
  return (
    <Canvas
      // Cap pixel-ratio at 1.5 — biggest single perf win
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 55 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <Scene isMobile={isMobile} />
    </Canvas>
  )
}
