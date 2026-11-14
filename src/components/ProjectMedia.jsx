import { useEffect, useRef } from 'react'

// A project's demo: a muted looping video that only plays while the card is on screen,
// with a poster image shown until it loads. Falls back to a labelled placeholder.
export default function ProjectMedia({ project }) {
  const video = useRef(null)

  useEffect(() => {
    const el = video.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const box = 'aspect-video overflow-hidden rounded-[14px] bg-[#1f0e0e]'

  if (project.video) {
    return (
      <div className={box}>
        <video
          ref={video}
          src={project.video}
          poster={project.poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={`${project.title} demo`}
          className="size-full object-cover"
        />
      </div>
    )
  }

  if (project.poster) {
    return (
      <div className={box}>
        <img src={project.poster} alt={`${project.title} screenshot`} loading="lazy" className="size-full object-cover" />
      </div>
    )
  }

  return (
    <div className={`${box} flex items-center justify-center font-mono text-[13px] text-[#d9a9a9]`}>
      [ {project.image} ]
    </div>
  )
}
