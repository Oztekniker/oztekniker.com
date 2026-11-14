import { useRef } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(SplitText, ScrollTrigger, useGSAP)

// Text that slides up line by line from behind an invisible edge.
// Default: plays when it scrolls into view. afterIntro: plays as soon as the intro has finished.
// Lines are re-measured on resize, so it never breaks when the text rewraps.

export default function Reveal({ as: Tag = 'div', children, afterIntro = false, delay = 0, ...rest }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      const el = ref.current
      // chrome gradient text: the gradient has to live on each line, or it won't move with it
      const chrome = [...el.classList].find((c) => c.startsWith('chrome-'))
      let split

      const start = () => {
        split = SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit(self) {
            if (chrome) {
              el.classList.remove(chrome)
              self.lines.forEach((line) => line.classList.add(chrome))
            }
            // room for tall caps and accents inside the clipping mask
            self.masks.forEach((m) => {
              m.style.paddingBlock = '0.12em'
              m.style.marginBlock = '-0.12em'
            })
            return gsap.from(self.lines, {
              yPercent: 115,
              duration: 1,
              ease: 'power4.out',
              stagger: 0.1,
              delay,
              scrollTrigger: afterIntro ? undefined : { trigger: el, start: 'top 85%', once: true },
            })
          },
        })
      }

      const waiting = afterIntro && document.documentElement.classList.contains('intro-pending')
      if (waiting) window.addEventListener('intro-done', start, { once: true })
      else start()

      return () => {
        window.removeEventListener('intro-done', start)
        split?.revert()
        if (chrome) el.classList.add(chrome)
      }
    },
    { scope: ref },
  )

  return (
    <Tag ref={ref} {...rest}>
      {children}
    </Tag>
  )
}
