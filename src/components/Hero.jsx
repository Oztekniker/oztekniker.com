import ChromeSphere from './ChromeSphere'
import Wordmark from './Wordmark'
import Reveal from './Reveal'

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
          <p className="font-mono text-[13px] text-[#4f555b]">// oztekniker · portfolio · vol. 02</p>
          <Reveal as="h1" afterIntro className="reveal-after-intro font-display text-[clamp(36px,4.6vw,64px)] font-bold leading-[1.02] tracking-[-0.02em]">
            BUILT BY HAND.
            <br />
            LINKED BY CODE.
          </Reveal>
          <p className="max-w-[460px] text-[17px] leading-relaxed text-[#3b4046]">
            Software engineering student shipping iOS apps, voice AI assistants and hand-built hardware.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="#work" className="inline-flex min-h-12 items-center rounded-full border border-ink bg-ink px-6 font-semibold text-[#f2f4f6] transition-colors duration-300 hover:bg-transparent hover:text-ink">
              See the work
            </a>
            <a href="#contact" className="inline-flex min-h-12 items-center rounded-full border border-ink px-6 font-medium transition-colors duration-300 hover:bg-ink hover:text-[#f2f4f6]">
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
