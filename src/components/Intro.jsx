import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { useLenis } from 'lenis/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import * as THREE from 'three'

// Intro, ~2.2 s on phones, ~2.6 s on desktop, no skip.
// The site waits below the screen.
// 0 → T      a chrome chain snakes in from the left (on desktop: chunkier, twisting, through a
//            full loop) and its end drops onto the top right corner of the site
// T          it hooks on: clank — a shake and a glint
// T+0.15     the chain yanks the whole site up into place, hard, with a jolt on arrival
// The hook point is exactly where the page chain begins (top right), so one hands over to the other.

export const SITE_START = 1 // the site starts fully below the screen

const R = 0.16
const TUBE = 0.045
const STRETCH = 1.6
const PITCH = 2 * R * STRETCH - 2 * TUBE

const UP = new THREE.Vector3(0, 1, 0)
const QUARTER = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI / 2)
const ONE = new THREE.Vector3(1, 1, 1)

// Wide screens (desktop) get a bolder take: chunkier links, a full loop in the middle of the
// screen and a rolling twist as the chain travels. Phones keep the simpler route, which already
// fills a narrow screen. Links shrink back to the page chain's size as they reach the hook, so
// the hand-over to the page chain still lines up.
const isWide = () => window.innerWidth / window.innerHeight > 1.1
const smooth = (x) => x * x * (3 - 2 * x)

function SnakeChain({ p, onReady }) {
  const mesh = useRef()
  const frames = useRef(0)
  const light = useRef()
  const { viewport, camera } = useThree()

  const geometry = useMemo(() => {
    const g = new THREE.TorusGeometry(R, TUBE, 20, 48)
    g.scale(1, STRETCH, 1)
    return g
  }, [])

  // The route, laid out in screen pixels then converted to world units.
  const path = useMemo(() => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const wide = isWide()
    const upp = viewport.height / vh
    const toWorld = ([x, y, z]) => new THREE.Vector3((x - vw / 2) * upp, (vh / 2 - y) * upp, z)
    const hookX = vw * 0.86 // same x the page chain starts at, so the two meet in line
    const hook = [
      [hookX, vh * 0.66, 0.2],
      [hookX, vh * SITE_START + 4, 0], // the hook: top edge of the site, just below the screen
    ]

    let points
    if (wide) {
      // in from the left, a full loop (the chain crosses itself, front then back), out to the right
      const cx = vw * 0.42
      const cy = vh * 0.36
      const r = vh * 0.19
      points = [
        [-vw * 0.12, vh * 0.58, 0],
        [vw * 0.1, vh * 0.5, 0.4],
        [cx - 1.1 * r, cy + r, 0.7],
        [cx + 0.2 * r, cy + r, 0.7], // bottom of the loop, first pass (in front)
        [cx + r, cy, 0.3],
        [cx, cy - r, -0.2], // top of the loop
        [cx - r, cy, -0.6],
        [cx - 0.15 * r, cy + 1.05 * r, -0.7], // bottom again, second pass (behind)
        [cx + 1.6 * r, cy + 0.85 * r, -0.2],
        [vw * 0.72, vh * 0.28, 0.4],
        ...hook,
      ]
    } else {
      points = [
        [-vw * 0.12, vh * 0.12, 0],
        [vw * 0.12, vh * 0.42, 0.6],
        [vw * 0.34, vh * 0.2, -0.4],
        [vw * 0.55, vh * 0.48, 0.5],
        [vw * 0.74, vh * 0.3, -0.3],
        ...hook,
      ]
    }

    const curve = new THREE.CatmullRomCurve3(points.map(toWorld), false, 'centripetal')
    curve.arcLengthDivisions = 1000
    const length = curve.getLength()
    return {
      curve,
      length,
      count: Math.ceil(length / PITCH) + 2, // upper bound; bigger links need fewer
      upp,
      big: wide ? 1.45 : 1, // link size at the start of the route
      twist: wide ? 1 : 0,
    }
  }, [viewport.height])

  const tmp = useMemo(
    () => ({
      p: new THREE.Vector3(),
      tan: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      roll: new THREE.Quaternion(),
      s: new THREE.Vector3(),
      m: new THREE.Matrix4(),
      hidden: new THREE.Matrix4().makeScale(0, 0, 0),
    }),
    [],
  )

  useFrame((state) => {
    if (!mesh.current) return
    // Start the timeline only once the chain has actually drawn a few frames. The first frames
    // compile shaders and can stall for a moment; starting earlier made the chain's entrance
    // get skipped on some machines.
    if (frames.current < 3 && ++frames.current === 3) onReady()
    const { curve, length, count, upp, big, twist } = path
    const head = p.head * length // how far along the route the leading link has travelled
    const lift = -p.siteY * upp + window.innerHeight * SITE_START * upp // follows the site as it is yanked up
    const time = state.clock.elapsedTime

    // size along the route: big for most of it, easing back to page size over the last stretch
    const sizeAt = (s) => 1 + (big - 1) * (1 - smooth(Math.min(1, Math.max(0, (s / length - 0.62) / 0.3))))

    // links trail behind the head like a snake; spacing follows each link's size
    let s = head
    for (let i = 0; i < count; i++) {
      if (s < 0) {
        mesh.current.setMatrixAt(i, tmp.hidden)
        continue
      }
      const size = sizeAt(s)
      const t = Math.min(1, s / length)
      curve.getPointAt(t, tmp.p)
      curve.getTangentAt(t, tmp.tan)
      tmp.p.y += lift
      tmp.q.setFromUnitVectors(UP, tmp.tan)
      // rolling twist around the chain's own axis (dies out near the hook)
      const roll = twist * (size - 1) / (big - 1 || 1) * (s * 1.4 - time * 5)
      if (roll) tmp.q.multiply(tmp.roll.setFromAxisAngle(UP, roll))
      if (i % 2) tmp.q.multiply(QUARTER)
      mesh.current.setMatrixAt(i, tmp.m.compose(tmp.p, tmp.q, tmp.s.setScalar(size)))
      s -= PITCH * size
    }
    mesh.current.instanceMatrix.needsUpdate = true

    camera.position.x = p.shake * 0.08
    camera.position.y = p.shake * -0.05
    light.current.intensity = 2 + p.glint * 50
  })

  return (
    <>
      <pointLight ref={light} position={[viewport.width * 0.35, -viewport.height * 0.35, 2]} intensity={2} distance={9} />
      <instancedMesh ref={mesh} args={[geometry, undefined, path.count]} frustumCulled={false}>
        <meshStandardMaterial color="#e8ecef" metalness={1} roughness={0.18} envMapIntensity={1.4} />
      </instancedMesh>
    </>
  )
}

// What fills the black while the chain snakes in. It sits underneath the site,
// so the rising page covers it naturally during the yank.
function IntroDecor() {
  const label = 'font-mono text-[12px] uppercase tracking-[0.18em] text-white/45'
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-20 overflow-hidden bg-black">
      {/* faint measuring grid with a vignette */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          maskImage: 'radial-gradient(ellipse 75% 70% at 50% 45%, #000 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 45%, #000 30%, transparent 100%)',
        }}
      />
      {/* giant outlined wordmark behind the chain */}
      <p
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-display text-[17vw] font-black leading-none tracking-[-0.05em] text-transparent"
        style={{ WebkitTextStroke: '1px rgba(255,255,255,0.09)' }}
      >
        OZTEKNIKER
      </p>
      {/* corner labels */}
      <div className="absolute inset-x-0 top-0 flex justify-between px-[max(24px,4vw)] pt-7">
        <span className={label}>Oztekniker</span>
        <span className={label}>Portfolio — Vol. 02</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-[max(24px,4vw)] pb-7">
        <span className={label}>// built by hand. linked by code.</span>
        <span className="flex items-baseline gap-3">
          <span className={label}>Loading</span>
          <span id="intro-counter" className="font-display text-[clamp(40px,5vw,72px)] font-bold leading-none text-white/85">
            000
          </span>
        </span>
      </div>
    </div>
  )
}

export default function Intro() {
  const [done, setDone] = useState(() => !document.documentElement.classList.contains('intro-pending'))
  const [ready, setReady] = useState(false)
  const lenis = useLenis()
  // animated values shared between the GSAP timeline, the 3D chain and the site wrapper
  const p = useMemo(() => ({ head: 0, siteY: window.innerHeight * SITE_START, shake: 0, glint: 0 }), [])

  // lock scrolling while the intro plays
  useEffect(() => {
    if (done) {
      lenis?.start()
      return
    }
    window.scrollTo(0, 0)
    lenis?.stop()
  }, [lenis, done])

  // start once the 3D scene has rendered, so nothing stutters on the first frames
  useEffect(() => {
    if (!ready || done) return
    const els = document.querySelectorAll('[data-intro-lift]')
    const counter = document.getElementById('intro-counter')
    const place = () => {
      const t = `translate3d(${p.shake * 6}px, ${p.siteY}px, 0)`
      els.forEach((el) => (el.style.transform = t))
      if (counter) counter.textContent = String(Math.round(p.head * 100)).padStart(3, '0')
    }

    const tl = gsap.timeline({
      onUpdate: place,
      onComplete: () => {
        els.forEach((el) => (el.style.transform = '')) // back to normal
        document.documentElement.classList.remove('intro-pending')
        window.dispatchEvent(new Event('intro-done')) // hero headline starts its reveal
        ScrollTrigger.refresh() // scroll triggers were measured while the site was still shifted down
        setDone(true)
      },
    })
    // the loop on wide screens is a longer route, so give it a little more time
    const T = isWide() ? 1.5 : 1.1
    tl.to(p, { head: 1, duration: T, ease: 'power2.out' }, 0)
    // hook on
    tl.to(p, { keyframes: { shake: [-0.6, 0.4, 0] }, duration: 0.12, ease: 'none' }, T)
    tl.to(p, { glint: 1, duration: 0.05, yoyo: true, repeat: 1 }, T)
    // yank
    tl.to(p, { siteY: 0, duration: 0.45, ease: 'power4.in' }, T + 0.15)
    tl.to(p, { keyframes: { shake: [-1, 0.8, -0.5, 0.3, 0] }, duration: 0.25, ease: 'none' }, T + 0.6)
    tl.to(p, { keyframes: { siteY: [-22, 6, 0] }, duration: 0.3, ease: 'power2.out' }, T + 0.6)
    return () => tl.kill()
  }, [ready, done, p])

  if (done) return null

  return (
    <>
      <IntroDecor />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ pointerEvents: 'none' }}
      >
        <ambientLight intensity={0.2} />
        <directionalLight position={[3, 5, 6]} intensity={1.2} />
        <Environment resolution={256}>
          <Lightformer form="rect" intensity={4} position={[0, 5, -6]} scale={[12, 2, 1]} />
          <Lightformer form="rect" intensity={2} position={[-6, 0, 0]} rotation-y={Math.PI / 2} scale={[12, 1.5, 1]} />
          <Lightformer form="rect" intensity={2} position={[6, 0, 0]} rotation-y={-Math.PI / 2} scale={[12, 1.5, 1]} />
          <Lightformer form="ring" intensity={3} position={[0, 0, 6]} scale={3} />
        </Environment>
        <SnakeChain p={p} onReady={() => setReady(true)} />
      </Canvas>
      </div>
    </>
  )
}
