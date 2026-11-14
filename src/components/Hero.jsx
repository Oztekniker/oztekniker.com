import { useLayoutEffect, useRef } from 'react'
import ChromeSphere from './ChromeSphere'
import Reveal from './Reveal'

// Giant OZTEKNIKER that always fits exactly between the page gutters, whatever the screen width
function Wordmark() {
  const box = useRef(null)
  const text = useRef(null)

  useLayoutEffect(() => {
    const fit = () => {
      const el = text.current
      const cs = getComputedStyle(box.current)
      const avail = box.current.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      el.style.fontSize = '100px'
      el.style.fontSize = `${(100 * avail) / el.scrollWidth}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box.current)
    document.fonts?.ready.then(fit)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={box} aria-hidden="true" className="relative z-10 px-[max(24px,14vw)] pb-[2vw]">
      <p ref={text} className="inline-block whitespace-nowrap font-display font-black leading-[0.9] tracking-[-0.04em]">
        OZTEKNIKER
      </p>
    </div>
  )
}

const NAV = [
  { href: '#work', label: '.Work()' },
  { href: '#about', label: '.About()' },
  { href: '#contact', label: '.Contact()' },
]

export default function Hero() {
  return (
    <section id="top" data-chain-tone="dark" data-bg="#d9dcdf" className="relative overflow-hidden text-ink">
      <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 py-7 px-[max(24px,14vw)]">
        <a href="#top" className="font-display text-[17px] font-bold tracking-[0.04em]">
          OZTEKNIKER
        </a>
        <nav aria-label="Main" className="flex flex-wrap gap-1 font-mono text-[13px] text-[#3b4046]">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="px-3.5 py-3 hover:text-ink">
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="relative z-20 flex flex-wrap items-center gap-8 pb-4 px-[max(24px,14vw)] pt-6">
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-6">
          <p className="font-mono text-[13px] text-[#4f555b]">// portfolio · vol. 02 · Cyprus</p>
          <Reveal as="h1" afterIntro className="reveal-after-intro font-display text-[clamp(36px,4.6vw,64px)] font-bold leading-[1.02] tracking-[-0.02em]">
            BUILT BY HAND.
            <br />
            LINKED BY CODE.
          </Reveal>
          <p className="max-w-[460px] text-[17px] leading-relaxed text-[#3b4046]">
            Software engineering student shipping iOS apps, voice AI assistants and hand-built hardware.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#work" className="inline-flex min-h-12 items-center rounded-full bg-ink px-6 font-semibold text-[#f2f4f6]">
              See the work
            </a>
            <a href="#contact" className="inline-flex min-h-12 items-center rounded-full border border-ink px-6 font-medium">
              Start a project
            </a>
          </div>
        </div>
        {/* z-30 puts the ball in front of the chain overlay, so the chain passes behind it */}
        <div className="relative z-30 flex min-w-0 flex-[1.2_1_420px] justify-center">
          <ChromeSphere />
        </div>
      </div>

      <Wordmark />
    </section>
  )
}
