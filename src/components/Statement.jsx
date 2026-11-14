import Reveal from './Reveal'

export default function Statement() {
  return (
    <section id="introduction" data-chain-tone="white" data-bg="#26292d" className="relative overflow-hidden text-[#e8ecef]">
      {/* above the chain overlay, so the chain passes behind the text */}
      <div className="relative z-30 py-40 px-[max(24px,14vw)]">
        <p className="mb-6 font-mono text-[13px] text-[#9aa2a9]">.Introduction()</p>
        <Reveal as="p" className="max-w-[960px] font-display text-[clamp(28px,3.6vw,52px)] font-medium leading-[1.2] tracking-[-0.01em]">
          Apps, AI assistants and hardware. <span className="chrome-text">Built by hand, from the docs,</span> until it works.
        </Reveal>
      </div>
    </section>
  )
}
