import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// One fixed background behind the whole page. Each section declares the colour it wants
// (data-bg) and an optional glow (data-glow="red|blue"); when a section crosses the middle of
// the screen the backdrop eases to it. Sections themselves stay transparent.

export default function Backdrop() {
  const root = useRef(null)

  useGSAP(
    () => {
      const base = root.current.querySelector('.bd-base')
      const red = root.current.querySelector('.bd-red')
      const blue = root.current.querySelector('.bd-blue')

      const apply = (el) => {
        const { bg, glow } = el.dataset
        const ease = { duration: 0.9, ease: 'power2.out', overwrite: 'auto' }
        gsap.to(base, { backgroundColor: bg, ...ease })
        gsap.to(document.documentElement, { '--page-bg': bg, ...ease })
        gsap.to(red, { opacity: glow === 'red' ? 1 : 0, ...ease })
        gsap.to(blue, { opacity: glow === 'blue' ? 1 : 0, ...ease })
      }

      document.querySelectorAll('[data-bg]').forEach((el) => {
        ScrollTrigger.create({
          trigger: el,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && apply(el),
        })
      })
    },
    { scope: root },
  )

  return (
    <div ref={root} data-intro-lift aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh">
      <div className="bd-base absolute inset-0" style={{ backgroundColor: '#d9dcdf' }} />
      {/* red spotlight from below (Work) */}
      <div
        className="bd-red absolute inset-0 opacity-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 112%, rgba(255,36,36,0.75) 0%, rgba(150,10,10,0.35) 40%, rgba(11,6,6,0) 72%)',
        }}
      />
      {/* blue wash from the top left (About) */}
      <div
        className="bd-blue absolute inset-0 opacity-0"
        style={{ background: 'radial-gradient(ellipse 70% 80% at 20% 0%, rgba(60,140,255,0.45), rgba(8,22,48,0) 70%)' }}
      />
    </div>
  )
}
