import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

// Black chrome ball that grows spikes.
// At rest it is a smooth glossy sphere. On its own, single spikes stab out at random and every
// few seconds a cluster erupts from one patch in a ripple. Hover: spikes facing the cursor shoot
// out and follow it. Click: every spike fires at once.
// Spikes hide inside the core when retracted, so the ball looks smooth between bursts.

const CORE = 1
const SPIKES = 220
const MAX_LEN = 1.1
const MAX_REACH = CORE + MAX_LEN // used to size the camera so nothing gets cut off

const UP = new THREE.Vector3(0, 1, 0)

// 0→1→0 over a spike's life: fast stab out, slower pull back
function envelope(t) {
  if (t <= 0 || t >= 1) return 0
  if (t < 0.14) {
    const k = t / 0.14
    return 1 - (1 - k) ** 3
  }
  const k = (t - 0.14) / 0.86
  return 1 - k * k
}

function SpikeBall({ hovered, pulse }) {
  const spin = useRef()
  const tilt = useRef()
  const mesh = useRef()
  const hover = useRef(0)
  const nextCluster = useRef(1.2)

  const spikeGeometry = useMemo(() => {
    const g = new THREE.ConeGeometry(0.055, 1, 14)
    g.translate(0, 0.5, 0) // base at the origin so scaling y grows the spike outward
    return g
  }, [])

  const spikes = useMemo(() => {
    const golden = Math.PI * (3 - Math.sqrt(5))
    return Array.from({ length: SPIKES }, (_, i) => {
      const y = 1 - ((i + 0.5) / SPIKES) * 2
      const r = Math.sqrt(1 - y * y)
      const phi = i * golden
      const normal = new THREE.Vector3(Math.cos(phi) * r, y, Math.sin(phi) * r)
      return {
        normal,
        q: new THREE.Quaternion().setFromUnitVectors(UP, normal),
        start: -10, // when its current stab began
        life: 0.9,
        peak: 0,
        next: Math.random() * 30, // when it fires on its own next
      }
    })
  }, [])

  const tmp = useMemo(
    () => ({
      p: new THREE.Vector3(),
      s: new THREE.Vector3(),
      n: new THREE.Vector3(),
      aim: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!mesh.current) return
    hover.current = THREE.MathUtils.damp(hover.current, hovered ? 1 : 0, 5, delta)
    pulse.current = THREE.MathUtils.damp(pulse.current, 0, 3.5, delta)
    const h = hover.current
    const burst = pulse.current
    const time = state.clock.elapsedTime
    const { x, y } = state.pointer

    spin.current.rotation.y += delta * (0.3 + h * 0.15)
    tilt.current.rotation.x = THREE.MathUtils.damp(tilt.current.rotation.x, -y * 0.5 * h, 5, delta)
    tilt.current.rotation.z = THREE.MathUtils.damp(tilt.current.rotation.z, -x * 0.35 * h, 5, delta)

    // every few seconds: a cluster erupts from one patch, rippling outward from its centre
    if (time >= nextCluster.current) {
      tmp.dir.randomDirection()
      for (const sp of spikes) {
        const d = sp.normal.dot(tmp.dir)
        if (d > 0.8) {
          sp.start = time + (1 - d) * 2.2
          sp.life = 0.8 + Math.random() * 0.3
          sp.peak = 0.55 + Math.random() * 0.5
        }
      }
      nextCluster.current = time + 2 + Math.random() * 2.5
    }

    tmp.aim.set(x, y, 0.9).normalize()
    spin.current.getWorldQuaternion(tmp.q)

    for (let i = 0; i < SPIKES; i++) {
      const sp = spikes[i]

      // lone random stabs
      if (time >= sp.next) {
        sp.start = time
        sp.life = 0.7 + Math.random() * 0.4
        sp.peak = 0.45 + Math.random() * 0.6
        sp.next = time + 15 + Math.random() * 40
      }

      const own = sp.peak * envelope((time - sp.start) / sp.life)
      tmp.n.copy(sp.normal).applyQuaternion(tmp.q)
      const facing = Math.max(0, tmp.n.dot(tmp.aim)) ** 4
      const toward = h * facing * 0.9
      const length = Math.min(MAX_LEN, Math.max(own, toward, burst * 0.85))

      if (length < 0.01) {
        tmp.s.set(0, 0, 0) // fully retracted: hidden inside the core
      } else {
        tmp.s.set(1, length + 0.1, 1) // +0.1 so the base stays buried in the surface
      }
      tmp.p.copy(sp.normal).multiplyScalar(CORE - 0.1)
      tmp.m.compose(tmp.p, sp.q, tmp.s)
      mesh.current.setMatrixAt(i, tmp.m)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={tilt}>
      <group ref={spin}>
        <mesh>
          <sphereGeometry args={[CORE, 96, 96]} />
          <meshStandardMaterial color="#0f1012" metalness={1} roughness={0.1} envMapIntensity={1.7} />
        </mesh>
        <instancedMesh ref={mesh} args={[spikeGeometry, undefined, SPIKES]} frustumCulled={false}>
          <meshStandardMaterial color="#2a2d31" metalness={1} roughness={0.16} envMapIntensity={1.5} />
        </instancedMesh>
      </group>
    </group>
  )
}

const LITE =
  typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768)

export default function ChromeSphere() {
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(true)
  const pulse = useRef(0)
  const box = useRef(null)

  // stop rendering entirely while the ball is scrolled out of view
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: '100px' })
    io.observe(box.current)
    return () => io.disconnect()
  }, [])

  // Camera just far enough back that fully extended spikes stay inside the canvas
  const fov = 35
  const distance = (MAX_REACH * 1.04) / Math.tan(THREE.MathUtils.degToRad(fov / 2))

  return (
    <div
      ref={box}
      className="aspect-square w-full max-w-[600px] cursor-pointer"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onClick={() => (pulse.current = 1)}
      aria-hidden="true"
    >
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [0, 0, distance], fov }}
        dpr={LITE ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !LITE, alpha: true }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <Environment resolution={LITE ? 64 : 256}>
          <Lightformer form="rect" intensity={5} position={[0, 5, -5]} scale={[10, 2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[-5, 0, 0]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} />
          <Lightformer form="rect" intensity={2.5} position={[5, 0, 0]} rotation-y={-Math.PI / 2} scale={[10, 1.2, 1]} />
          <Lightformer form="ring" intensity={3} position={[0, 0, 5]} scale={2.5} />
        </Environment>
        <SpikeBall hovered={hovered} pulse={pulse} />
      </Canvas>
    </div>
  )
}
