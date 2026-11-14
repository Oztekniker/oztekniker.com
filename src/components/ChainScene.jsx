import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

// One InstancedMesh = the whole chain in a single draw call.
//
// The chain is one long CatmullRom curve laid out in PAGE space, through points pinned to the
// sections (see buildPoints). The whole chain moves with the page as you scroll, so its route is
// fixed: down the right of the hero → diagonally across the OZTEKNIKER letters → down the left of
// Work → across to the right at the bottom of Work (behind the cards) → down the right of About →
// into the centre, ending exactly on #chain-anchor at the top of the contact form.
// Every second link is turned 90° around the tangent so neighbours interlock.
//
// Performance:
// - the curve is sampled once into a lookup table; each frame only reads and blends from it
// - links outside the screen are skipped
// - section colours are measured once per layout, not every frame
// - phones get a lighter mesh, lower resolution and no antialiasing
// - the canvas is sized to the tallest mobile viewport so the URL bar showing/hiding
//   never resizes it or forces the route to be rebuilt mid-scroll

const LITE =
  typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768)

const R = 0.16 // torus radius
const TUBE = 0.045 // wire thickness (radius)
const STRETCH = 1.6 // makes the ring an oval link
// distance between link centres when the chain is pulled taut (wires just touching inside)
const PITCH = 2 * R * STRETCH - 2 * TUBE
const STEP = PITCH / 8 // lookup table resolution along the curve

// Per-section look. Sections set data-chain-tone="dark|white|red|cyan".
const TONES = {
  dark: { tint: '#6b7178', light: '#ffffff' },
  white: { tint: '#ffffff', light: '#ffffff' },
  red: { tint: '#ffd0d0', light: '#ff3c3c' },
  cyan: { tint: '#c8f6ff', light: '#50dcff' },
}

// Layout position on the page, ignoring CSS transforms. The intro slides the whole site up
// with a transform; measuring with getBoundingClientRect would bake that offset into the route.
function pageBox(el) {
  let top = 0
  for (let n = el; n; n = n.offsetParent) top += n.offsetTop
  return { top, h: el.offsetHeight }
}

// Page-space route in pixels: [x, y, depth]. x/y are measured on the page, depth is in world units.
function buildPoints() {
  const vw = window.innerWidth
  const box = (sel) => {
    const el = document.querySelector(sel)
    return el ? pageBox(el) : null
  }
  const hero = box('#top')
  const work = box('#work')
  const about = box('#about')
  const anchor = box('#chain-anchor')
  if (!hero || !work || !about || !anchor) return null

  const at = (s, k) => s.top + s.h * k
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

function measureTones() {
  return [...document.querySelectorAll('[data-chain-tone]')].map((el) => {
    const b = pageBox(el)
    return { top: b.top, bottom: b.top + b.h, tone: TONES[el.dataset.chainTone] ?? TONES.white }
  })
}

const UP = new THREE.Vector3(0, 1, 0)
const QUARTER = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2)
const ONE = new THREE.Vector3(1, 1, 1)
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0)

function Chain() {
  const group = useRef()
  const mesh = useRef()
  const material = useRef()
  const glow = useRef()
  const scroll = useRef({ last: window.scrollY, velocity: 0 })
  const tones = useRef([])
  const { viewport, size } = useThree()
  const getState = useThree((s) => s.get)
  const [path, setPath] = useState(null)

  // Render on GSAP's ticker, right after the smooth scroll has moved (see ScrollClock in App.jsx),
  // so the chain and the page always draw the same scroll position in the same frame.
  useEffect(() => {
    const render = (time) => getState().advance(time)
    gsap.ticker.add(render)
    return () => gsap.ticker.remove(render)
  }, [getState])

  const geometry = useMemo(() => {
    const g = LITE ? new THREE.TorusGeometry(R, TUBE, 10, 24) : new THREE.TorusGeometry(R, TUBE, 20, 48)
    g.scale(1, STRETCH, 1)
    return g
  }, [])

  // Rebuild the route only when the layout really changes: a new width, or the page getting
  // taller/shorter (fonts loading, content). Height-only resizes (mobile URL bar) are ignored.
  useEffect(() => {
    let frame = 0
    let lastW = -1
    let lastDocH = -1
    const build = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const w = window.innerWidth
        const docH = document.documentElement.scrollHeight
        if (w === lastW && Math.abs(docH - lastDocH) < 2) return
        const pts = buildPoints()
        if (!pts) return
        lastW = w
        lastDocH = docH

        const upp = viewport.height / size.height // world units per pixel
        const curve = new THREE.CatmullRomCurve3(
          pts.map(([x, y, z]) => new THREE.Vector3((x - w / 2) * upp, -y * upp, z)),
          false,
          'centripetal',
        )
        curve.arcLengthDivisions = 2000
        const length = curve.getLength()

        // lookup table: positions and tangents every STEP along the curve
        const n = Math.ceil(length / STEP) + 1
        const pos = new Float32Array(n * 3)
        const tan = new Float32Array(n * 3)
        const p = new THREE.Vector3()
        const t = new THREE.Vector3()
        for (let k = 0; k < n; k++) {
          const u = Math.min(1, (k * STEP) / length)
          curve.getPointAt(u, p).toArray(pos, k * 3)
          curve.getTangentAt(u, t).toArray(tan, k * 3)
        }

        let count = Math.ceil(length / PITCH) + 2
        if (count % 2) count += 1
        tones.current = measureTones()
        setPath({ length, count, upp, n, pos, tan })
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
  }, [viewport.height, size.height])

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
    const { length, count, upp, n, pos, tan } = path
    const H = size.height

    const y = window.scrollY
    const s = scroll.current
    s.velocity = THREE.MathUtils.lerp(s.velocity, y - s.last, 0.12)
    s.last = y

    // move the whole chain with the page
    const groupY = (H / 2 + y) * upp
    group.current.position.y = groupY
    const half = viewport.height / 2 + 0.8 // anything further than this from centre is off-screen

    // links creep slowly toward the form as you scroll, like the chain is being pulled in
    const slide = (y * upp * 0.15) % (2 * PITCH)
    const sway = THREE.MathUtils.clamp(s.velocity * 0.004, -0.25, 0.25)
    const time = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const d = i * PITCH + slide - 2 * PITCH
      if (d < 0 || d > length) {
        mesh.current.setMatrixAt(i, HIDDEN)
        continue
      }
      // blend between the two nearest lookup-table samples
      const f = d / STEP
      const k = Math.min(n - 1, Math.floor(f))
      const k2 = Math.min(n - 1, k + 1)
      const a = f - k
      tmp.p.set(
        pos[k * 3] + (pos[k2 * 3] - pos[k * 3]) * a,
        pos[k * 3 + 1] + (pos[k2 * 3 + 1] - pos[k * 3 + 1]) * a,
        pos[k * 3 + 2] + (pos[k2 * 3 + 2] - pos[k * 3 + 2]) * a,
      )
      if (Math.abs(tmp.p.y + groupY) > half) {
        mesh.current.setMatrixAt(i, HIDDEN)
        continue
      }
      tmp.tan
        .set(
          tan[k * 3] + (tan[k2 * 3] - tan[k * 3]) * a,
          tan[k * 3 + 1] + (tan[k2 * 3 + 1] - tan[k * 3 + 1]) * a,
          tan[k * 3 + 2] + (tan[k2 * 3 + 2] - tan[k * 3 + 2]) * a,
        )
        .normalize()

      // a little life: lags on fast scrolls, breathes at rest; pinned at both ends
      const pin = Math.min(1, d / 2, (length - d) / 2)
      tmp.p.x += pin * (sway * Math.sin(d * 0.5) + Math.sin(time * 0.8 + d * 0.6) * 0.025)

      tmp.q.setFromUnitVectors(UP, tmp.tan)
      if (i % 2) tmp.q.multiply(QUARTER)
      tmp.m.compose(tmp.p, tmp.q, ONE)
      mesh.current.setMatrixAt(i, tmp.m)
    }
    mesh.current.instanceMatrix.needsUpdate = true

    // ease colours toward the section under the middle of the screen (measured once per layout)
    const mid = y + window.innerHeight / 2
    const hit = tones.current.find((t) => mid >= t.top && mid <= t.bottom)
    const tone = hit ? hit.tone : TONES.white
    const ease = 1 - Math.exp(-delta * 4)
    material.current.color.lerp(tmp.tint.set(tone.tint), ease)
    glow.current.color.lerp(tmp.light.set(tone.light), ease)
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
    // h-lvh: as tall as the largest mobile viewport, so the URL bar never resizes the canvas
    <div data-intro-lift aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[25] h-lvh">
      <Canvas
        frameloop="never" // driven by GSAP's ticker, in step with the scroll
        camera={{ position: [0, 0, 10], fov: 35 }}
        dpr={LITE ? [1, 1.5] : [1, 2]}
        gl={{ antialias: !LITE, alpha: true, powerPreference: 'high-performance' }}
        style={{ pointerEvents: 'none' }} // the overlay must never block clicks or hovers underneath
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 5, 6]} intensity={1.2} />
        {/* Studio light panels built in code: chrome needs something to reflect, and no HDR download */}
        <Environment resolution={LITE ? 64 : 256}>
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
