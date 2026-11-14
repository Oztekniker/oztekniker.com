import Tilt from 'react-parallax-tilt'
import Reveal from './Reveal'
import { projects } from '../data/projects'

export default function Work() {
  return (
    <section
      id="work"
      data-chain-tone="red"
      data-bg="#0b0606"
      data-glow="red"
      className="relative overflow-hidden text-[#f4eaea]"
    >
      <div className="flex flex-col gap-12 pb-44 px-[max(24px,14vw)] pt-36">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Reveal as="h2" className="chrome-red font-display text-[clamp(40px,6vw,84px)] font-black tracking-[-0.02em]">
            .Work()
          </Reveal>
          <p className="font-mono text-[13px] text-[#d9a9a9]">selected builds</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {projects.map((p) => (
            // relative z-30: cards sit above the chain, so it passes behind them
            <Tilt
              key={p.title}
              className="relative z-30 rounded-[20px]"
              tiltMaxAngleX={7}
              tiltMaxAngleY={7}
              perspective={1100}
              scale={1.02}
              transitionSpeed={1200}
              glareEnable
              glareMaxOpacity={0.18}
              glareColor="#ffffff"
              glarePosition="all"
              glareBorderRadius="20px"
            >
              <article className="chrome-sweep group flex h-full flex-col gap-3.5 rounded-[20px] border border-white/15 bg-[rgba(20,8,8,0.72)] p-6 transition-colors duration-300 hover:border-white/40">
                <div className="flex aspect-video items-center justify-center rounded-[14px] bg-[#1f0e0e] font-mono text-[13px] text-[#d9a9a9]">
                  [ {p.image} ]
                </div>
                <p className="font-mono text-[13px] text-[#ff9b9b]">{p.tag}</p>
                <h3 className="font-display text-[28px] text-white">{p.title}</h3>
                <p className="leading-relaxed text-[#d8c8c8]">{p.description}</p>
              </article>
            </Tilt>
          ))}
        </div>
      </div>
    </section>
  )
}
