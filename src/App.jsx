import { ReactLenis } from 'lenis/react'
import Intro from './components/Intro'
import ChainScene from './components/ChainScene'
import Backdrop from './components/Backdrop'
import Hero from './components/Hero'
import Statement from './components/Statement'
import Work from './components/Work'
import About from './components/About'
import Contact from './components/Contact'

// Build order (from the design notes):
// 1. ✓ Intro: chain snakes in from the left, hooks the top of the site, yanks it up (Intro.jsx)
// 2. ✓ 3D chrome chain through the whole page (ChainScene.jsx)
// 3. ✓ Background colour transitions on scroll (Backdrop.jsx)
// 4. Small details: headline reveals, chrome sweep + tilt on cards
// 5. Ask NOXIS button (last)
//
// Elements marked data-intro-lift start pushed below the screen and get pulled up by the intro.

export default function App() {
  return (
    // anchors: links like href="#work" glide to their section instead of jumping
    <ReactLenis root options={{ anchors: { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) } }}>
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
    </ReactLenis>
  )
}
