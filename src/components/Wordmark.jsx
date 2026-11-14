import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

// The giant OZTEKNIKER at the bottom of the hero.
// Layers, back to front:
//   echoes  — outlined copies stacked downward, like the word was stamped in a few times
//   ink     — the solid black word
//   chrome  — the same word in polished chrome, only visible inside a soft spotlight that
//             follows the cursor (on touch screens, or when the mouse is away, it drifts by itself)
// Letters rise into place one by one when the intro hands over.
// Always fits exactly between the page gutters.

const WORD = 'OZTEKNIKER'
const ECHOES = 3

function Letters() {
  return WORD.split('').map((ch, i) => (
    <span key={i} className="wm-letter inline-block">
      {ch}
    </span>
  ))
}

export default function Wordmark() {
  const box = useRef(null)
  const stack = useRef(null)
  const sizer = useRef(null)

  // fit the font size to the space between the gutters
  useLayoutEffect(() => {
    const fit = () => {
      const cs = getComputedStyle(box.current)
      const avail = box.current.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      stack.current.style.fontSize = '100px'
      stack.current.style.fontSize = `${(100 * avail) / sizer.current.scrollWidth}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box.current)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [])

  // spotlight: follows the pointer, drifts on its own when there isn't one
  useEffect(() => {
    const el = stack.current
    let raf = 0
    let visible = true
    let lastMove = -Infinity
    const target = { x: 30, y: 50 }
    const pos = { x: 30, y: 50 }

    const onMove = (e) => {
      if (e.pointerType === 'touch') return
      const r = el.getBoundingClientRect()
      target.x = ((e.clientX - r.left) / r.width) * 100
      target.y = ((e.clientY - r.top) / r.height) * 100
      lastMove = performance.now()
    }
    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      if (!visible) return
      if (now - lastMove > 1500) {
        const t = now / 1000
        target.x = 50 + 45 * Math.sin(t * 0.35)
        target.y = 45 + 25 * Math.sin(t * 0.6)
      }
      pos.x += (target.x - pos.x) * 0.08
      pos.y += (target.y - pos.y) * 0.08
      el.style.setProperty('--mx', `${pos.x.toFixed(2)}%`)
      el.style.setProperty('--my', `${pos.y.toFixed(2)}%`)
    }
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(el)
    window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  // letters rise in, one after another, once the intro has pulled the site up
  useEffect(() => {
    const layers = [...stack.current.querySelectorAll('.wm-layer')]
    const play = () =>
      layers.forEach((layer, n) =>
        gsap.from(layer.querySelectorAll('.wm-letter'), {
          yPercent: 60,
          opacity: 0,
          filter: 'blur(10px)',
          duration: 1.1,
          ease: 'power4.out',
          clearProps: 'filter',
          stagger: 0.05,
          delay: 0.15 + n * 0.06,
        }),
      )
    if (document.documentElement.classList.contains('intro-pending')) {
      window.addEventListener('intro-done', play, { once: true })
      return () => window.removeEventListener('intro-done', play)
    }
    play()
  }, [])

  const layer = 'wm-layer absolute inset-0 whitespace-nowrap'

  return (
    <div ref={box} aria-hidden="true" className="relative z-10 px-[max(24px,14vw)] pb-[3vw]">
      <div
        ref={stack}
        className="relative inline-block select-none font-display font-black leading-[0.9] tracking-[-0.04em]"
      >
        {/* sizer: invisible, gives the stack its width and height */}
        <span ref={sizer} className="invisible inline-block whitespace-nowrap">
          {WORD}
        </span>

        {/* echoes, furthest first */}
        {Array.from({ length: ECHOES }, (_, i) => ECHOES - i).map((k) => (
          <span
            key={k}
            className={layer}
            style={{
              transform: `translateY(${k * 0.07}em)`,
              color: 'transparent',
              WebkitTextStroke: `1px rgba(14,15,17,${0.32 - k * 0.08})`,
            }}
          >
            <Letters />
          </span>
        ))}

        {/* ink */}
        <span className={`${layer} text-ink`}>
          <Letters />
        </span>

        {/* chrome, revealed by the spotlight */}
        <span
          className={`${layer} wm-chrome`}
          style={{
            WebkitMaskImage: 'radial-gradient(circle 16vw at var(--mx, 30%) var(--my, 50%), #000 35%, transparent 75%)',
            maskImage: 'radial-gradient(circle 16vw at var(--mx, 30%) var(--my, 50%), #000 35%, transparent 75%)',
          }}
        >
          <Letters />
        </span>
      </div>
    </div>
  )
}
