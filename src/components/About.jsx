import { stack } from '../data/projects'
import Reveal from './Reveal'

export default function About() {
  return (
    <section
      id="about"
      data-chain-tone="cyan"
      data-bg="#081630"
      data-glow="blue"
      className="relative overflow-hidden text-[#e6efff]"
    >
      <div className="flex flex-wrap gap-14 py-36 px-[max(24px,14vw)]">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
          <Reveal as="h2" className="chrome-cyan font-display text-[clamp(40px,6vw,84px)] font-black tracking-[-0.02em]">.About()</Reveal>
          <p className="text-lg leading-[1.7] text-[#b9cdf0]">
            Third-year software engineering student at Eastern Mediterranean University, Northern Cyprus. I learn by
            building, from the docs and by hand, until it works.
          </p>
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3.5">
          <p className="font-mono text-[13px] text-[#8fe9ff]">STACK</p>
          <ul className="flex flex-wrap gap-2.5">
            {stack.map((s) => (
              <li
                key={s}
                className="cursor-default rounded-full border border-[rgba(143,233,255,0.35)] bg-[rgba(8,22,48,0.5)] bg-[linear-gradient(#8fe9ff,#8fe9ff)] bg-bottom bg-no-repeat bg-[length:100%_0%] px-4 py-2.5 font-mono text-sm text-[#e6f9ff] transition-[background-size,color,border-color] duration-300 ease-out hover:border-[#8fe9ff] hover:bg-[length:100%_100%] hover:text-[#081630]"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
