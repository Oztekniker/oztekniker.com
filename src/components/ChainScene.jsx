import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'

// One InstancedMesh = the whole chain in a single draw call.
//
// The chain is one long CatmullRom curve laid out in PAGE space, through points pinned to the
// sections (see buildPoints). The whole chain moves with the page as you scroll, so its route is
// fixed: down the right of the hero → diagonally across the OZTEKNIKER letters → down the left of
// Work → across to the right at the bottom of Work (behind the cards) → down the right of About →
// into the centre, ending exactly on #chain-anchor at the top of the contact form.
// Every second link is turned 90° around the tangent so neighbours interlock.

const R = 0.16 // torus radius
const TUBE = 0.045 // wire thickness (radius)
const STRETCH = 1.6 // makes the ring an oval link
// distance between link centres when the chain is pulled taut (wires just touching inside)
const PITCH = 2 * R * STRETCH - 2 * TUBE

// Per-section look. Sections set data-chain-tone="dark|white|red|cyan".
const TONES = {
  dark: { tint: '#6b7178', light: '#ffffff' },
  white: { tint: '#ffffff', light: '#ffffff' },
  red: { tint: '#ffd0d0', light: '#ff3c3c' },
  cyan: { tint: '#c8f6ff', light: '#50dcff' },
}

function currentTone() {
  const mid = window.innerHeight / 2
  for (const el of document.querySelectorAll('[data-chain-tone]')) {
    const r = el.getBoundingClientRect()
    if (r.top <= mid && r.bottom >= mid) return TONES[el.dataset.chainTone] ?? TONES.white
  }
  return TONES.white
}

// Page-space route in pixels: [x, y, depth]. x/y are measured on the page, depth is in world units.
function buildPoints() {
  const vw = window.innerWidth
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { top: r.top + window.scrollY, h: r.height }
  }
  const hero = box('#top')
  const work = box('#work')
  const about = box('#about')
  const anchor = box('#chain-anchor')
  if (!hero || !work || !about || !anchor) return null

  const at = (s, k) => s.top + s.h * k
  // Long straight runs joined by wide bends
  // Long straight runs joined by wide bends
  return [
    [vw * 0.86, -240, 0], // starts in line with where the intro chain hooks on
    [vw * 0.86, at(hero, 0.42), 0.3], // straight down the right of the hero
    [vw * 0.46, at(hero, 0.95), -0.2], // diagonal across the wordmark…
    [vw * 0.11, at(work, 0.04), 0.3], // …carrying on behind the intro text to the left
    [vw * 0.11, at(work, 0.62), -0.2], // straight down the left of Work
    [vw * 0.4, at(work, 0.97), 0.2], // gentle turn under the cards (keeps the curve from bulging out)
    [vw * 0.86, at(about, 0.1), 0.3], // sweep right
    [vw * 0.86, at(about, 0.8), -0.2], // straight down the right of About
    [vw * 0.6, anchor.top - 260, 0.2],
    [vw * 0.5, anchor.top - 80, 0],
    [vw * 0.5, anchor.top + 4, 0], // locks onto the top of the form
  ]
}

const UP = new THREE.Vector3(0, 1, 0)
const QUARTER = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2)
const ONE = new THREE.Vector3(1, 1, 1)
const ZERO = new THREE.Vector3(0, 0, 0)

function Chain() {
  const group = useRef()
  const mesh = useRef()
  const material = useRef()
  const glow = useRef()
  const scroll = useRef({ last: window.scrollY, velocity: 0 })
  const { viewport } = useThree()
  const [path, setPath] = useState(null)

  const geometry = useMemo(() => {
    const g = new THREE.TorusGeometry(R, TUBE, 20, 48)
    g.scale(1, STRETCH, 1)
    return g
  }, [])

  // Rebuild the route whenever the page layout changes (resize, fonts loading, content changes)
  useEffect(() => {
    let frame = 0
    const build = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const pts = buildPoints()
        if (!pts) return
        const upp = viewport.height / window.innerHeight // world units per pixel
        const vw = window.innerWidth
        const curve = new THREE.CatmullRomCurve3(
          pts.map(([x, y, z]) => new THREE.Vector3((x - vw / 2) * upp, -y * upp, z)),
          false,
          'centripetal',
        )
        curve.arcLengthDivisions = 2000
        const length = curve.getLength()
        let count = Math.ceil(length / PITCH) + 2
        if (count % 2) count += 1
        setPath({ curve, length, count, upp })
      })
    }
    build()
    const ro = new ResizeObserver(build)
    ro.observe(document.body)
    window.addEventListener('resize', build)
    document.fonts?.ready.then(build)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', build)
      cancelAnimationFrame(frame)
    }
  }, [viewport.height])

  const tmp = useMemo(
    () => ({
      p: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      m: new THREE.Matrix4(),
      tint: new THREE.Color(),
      light: new THREE.Color(),
    }),
    [],
  )

  useFrame((state, delta) => {
    if (!path || !mesh.current) return
    const { curve, length, count, upp } = path
    const vh = window.innerHeight

    const y = window.scrollY
    const s = scroll.current
    s.velocity = THREE.MathUtils.lerp(s.velocity, y - s.last, 0.12)
    s.last = y

    // move the whole chain with the page
    group.current.position.y = (vh / 2 + y) * upp

    // links creep slowly toward the form as you scroll, like the chain is being pulled in
    const slide = (y * upp * 0.15) % (2 * PITCH)
    const sway = THREE.MathUtils.clamp(s.velocity * 0.004, -0.25, 0.25)
    const time = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const d = i * PITCH + slide - 2 * PITCH
      if (d < 0 || d > length) {
        tmp.m.compose(ZERO, tmp.q.identity(), ZERO) // hidden
        mesh.current.setMatrixAt(i, tmp.m)
        continue
      }
      const t = d / length
      curve.getPointAt(t, tmp.p)
      curve.getTangentAt(t, tmp.tan)
      // a little life: lags on fast scrolls, breathes at rest; pinned at both ends
      const pin = Math.min(1, d / 2, (length - d) / 2)
      tmp.p.x += pin * (sway * Math.sin(d * 0.5) + Math.sin(time * 0.8 + d * 0.6) * 0.025)

      tmp.q.setFromUnitVectors(UP, tmp.tan)
      if (i % 2) tmp.q.multiply(QUARTER)
      tmp.m.compose(tmp.p, tmp.q, ONE)
      mesh.current.setMatrixAt(i, tmp.m)
    }
    mesh.current.instanceMatrix.needsUpdate = true

    // ease colours toward the section under the middle of the screen
    const tone = currentTone()
    const k = 1 - Math.exp(-delta * 4)
    material.current.color.lerp(tmp.tint.set(tone.tint), k)
    glow.current.color.lerp(tmp.light.set(tone.light), k)
  })

  return (
    <>
      <pointLight ref={glow} position={[viewport.width / 2 - 1, -viewport.height / 2, 2]} intensity={40} distance={12} />
      <group ref={group}>
        {path && (
          <instancedMesh ref={mesh} args={[geometry, undefined, path.count]} key={path.count} frustumCulled={false}>
            <meshStandardMaterial ref={material} metalness={1} roughness={0.2} envMapIntensity={1.3} />
          </instancedMesh>
        )}
      </group>
    </>
  )
}

export default function ChainScene() {
  return (
    <div data-intro-lift aria-hidden="true" className="pointer-events-none fixed inset-0 z-[25]">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: 'none' }} // the overlay must never block clicks or hovers underneath
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 5, 6]} intensity={1.2} />
        {/* Studio light panels built in code: chrome needs something to reflect, and no HDR download */}
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={4} position={[0, 5, -6]} scale={[12, 2, 1]} />
          <Lightformer form="rect" intensity={2} position={[-6, 0, 0]} rotation-y={Math.PI / 2} scale={[12, 1.5, 1]} />
          <Lightformer form="rect" intensity={2} position={[6, 0, 0]} rotation-y={-Math.PI / 2} scale={[12, 1.5, 1]} />
          <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} />
        </Environment>
        <Chain />
      </Canvas>
    </div>
  )
}
