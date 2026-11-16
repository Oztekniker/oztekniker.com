import { useEffect } from 'react'
import { ReactLenis, useLenis } from 'lenis/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Intro from './components/Intro'
import ChainScene from './components/ChainScene'
import Backdrop from './components/Backdrop'
import Hero from './components/Hero'
import Statement from './components/Statement'
import Work from './components/Work'
import About from './components/About'
import Contact from './components/Contact'
import AskRose from './components/AskRose'

// Build order (from the design notes):
// 1. ✓ Intro: chain snakes in from the left, hooks the top of the site, yanks it up (Intro.jsx)
// 2. ✓ 3D chrome chain through the whole page (ChainScene.jsx)
// 3. ✓ Background colour transitions on scroll (Backdrop.jsx)
// 4. Small details: headline reveals, chrome sweep + tilt on cards
// 5. ✓ Ask Rose chat (AskRose.jsx + public/api/rose.php)
//
// Elements marked data-intro-lift start pushed below the screen and get pulled up by the intro.

// One clock for everything that moves with the scroll.
// Every frame GSAP's ticker first advances the smooth scroll (Lenis), then everything else
// (the 3D chain, scroll triggers) reads the new position in that same frame. Without this,
// Lenis and the chain ran on separate loops and the chain trailed the page on fast scrolls.
function ScrollClock() {
  const lenis = useLenis()
  useEffect(() => {
    if (!lenis) return
    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick, false, true) // prioritized: runs before the chain renders
    lenis.on('scroll', ScrollTrigger.update)
    return () => {
      gsap.ticker.remove(tick)
      lenis.off('scroll', ScrollTrigger.update)
    }
  }, [lenis])
  return null
}

export default function App() {
  return (
    // anchors: links like href="#work" glide to their section instead of jumping
    <ReactLenis
      root
      options={{ autoRaf: false, syncTouch: true, anchors: { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) } }}
    >
      <ScrollClock />
      <Intro />
      <Backdrop />
      <ChainScene />
      <main data-intro-lift className="overflow-x-hidden font-sans">
        <Hero />
        <Statement />
        <Work />
        <About />
        <Contact />
      </main>
      <AskRose />
    </ReactLenis>
  )
}
