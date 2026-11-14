import { useEffect, useRef, useState } from 'react'
import emailjs from '@emailjs/browser'
import Reveal from './Reveal'

const TOPICS = ['Website', 'iOS app', 'AI assistant', 'Something else']
const EMAIL = 'ozteknikerarda@gmail.com'

// Social links (any with an empty url are hidden)
const SOCIALS = [
  { label: 'GitHub', url: 'https://github.com/Oztekniker' },
  { label: 'LinkedIn', url: 'https://www.linkedin.com/in/ardaoztekniker/' },
  { label: 'Instagram', url: 'https://www.instagram.com/arda.oztekniker/' },
]

// EmailJS keys live in .env.local (never committed). See README → Contact form.
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const BUTTON_LABEL = {
  idle: 'Send message',
  sending: 'Sending…',
  sent: 'Message sent',
  error: 'Try again',
}

const fieldLabel = 'flex flex-col gap-1.5 font-mono text-xs tracking-[0.06em] text-[#9aa2a9]'
const fieldInput =
  'min-h-12 border-0 border-b border-white/25 bg-transparent font-sans text-[17px] tracking-normal text-[#f2f4f6] outline-none placeholder:text-[#6f787f] focus:border-white/70'

// ---------- Badge slot ----------
// The card hangs from the chain like an ID badge. The slot plate is drawn twice:
//  - BACK (below the 3D chain): the whole plate with its dark slot
//  - FRONT (above the 3D chain): only the part from the slot's middle line down
// So the last link is seen passing in front of the plate's top edge, dropping into the slot and
// disappearing behind the lower lip, as if it were threaded through the card.
// The plate is sized from the chain's link size (--link-px, set by ChainScene), so the link
// always fits the slot whatever the screen size. #chain-anchor marks the slot's middle line.
const PLATE_W = 160
const PLATE_H = 48
const SLOT = { x: 30, y: 12, w: 100, h: 16 } // slot centre line: y = 20
const SLOT_MID = SLOT.y + SLOT.h / 2
const plateOutline = `M14.5 .5h131a14 14 0 0 1 14 14v19a14 14 0 0 1-14 14h-131a14 14 0 0 1-14-14v-19a14 14 0 0 1 14-14Z`
const slotPath = (() => {
  const { x, y, w, h } = SLOT
  const r = h / 2
  return `M${x + r} ${y}h${w - h}a${r} ${r} 0 0 1 0 ${h}h${-(w - h)}a${r} ${r} 0 0 1 0 ${-h}Z`
})()
const plateLower = `M.5 ${SLOT_MID}H159.5V33.5a14 14 0 0 1-14 14h-131a14 14 0 0 1-14-14Z`
const slotLower = (() => {
  const { x, w, h } = SLOT
  const r = h / 2
  return `M${x} ${SLOT_MID}H${x + w}a${r} ${r} 0 0 1-${r} ${r}H${x + r}a${r} ${r} 0 0 1-${r}-${r}Z`
})()

function PlateDefs({ id }) {
  return (
    <defs>
      <linearGradient id={`${id}-plate`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={PLATE_H}>
        <stop offset="0" stopColor="#2c2f33" />
        <stop offset="1" stopColor="#16181b" />
      </linearGradient>
      <linearGradient id={`${id}-rim`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={PLATE_W} y2={PLATE_H}>
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.3" stopColor="#6b737a" />
        <stop offset="0.55" stopColor="#e3e8ec" />
        <stop offset="1" stopColor="#3a3f44" />
      </linearGradient>
    </defs>
  )
}

function BadgeSlot() {
  const box =
    'pointer-events-none absolute left-1/2 top-[6px] w-[calc(var(--link-px,60px)*2)] -translate-x-1/2 aspect-[160/48]'
  return (
    <>
      {/* back: under the chain */}
      <div aria-hidden="true" className={box}>
        <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} className="block size-full">
          <PlateDefs id="slot-back" />
          <path d={plateOutline} fill="url(#slot-back-plate)" stroke="url(#slot-back-rim)" strokeWidth="1" />
          <path d={slotPath} fill="#050607" stroke="#000" strokeWidth="1" />
          {/* bright lip on the slot's upper edge */}
          <path d={`M${SLOT.x + 8} ${SLOT.y}h${SLOT.w - 16}`} stroke="#f2f4f6" strokeOpacity="0.45" strokeWidth="1" />
        </svg>
        <div id="chain-anchor" className="absolute left-1/2 h-0 w-0" style={{ top: `${(SLOT_MID / PLATE_H) * 100}%` }} />
      </div>
      {/* front: over the chain, from the slot's middle down */}
      <div aria-hidden="true" className={`${box} z-30`}>
        <svg viewBox={`0 0 ${PLATE_W} ${PLATE_H}`} className="block size-full">
          <PlateDefs id="slot-front" />
          <path d={plateLower} fill="url(#slot-front-plate)" />
          <path
            d={`M.5 ${SLOT_MID}V33.5a14 14 0 0 0 14 14h131a14 14 0 0 0 14-14V${SLOT_MID}`}
            fill="none"
            stroke="url(#slot-front-rim)"
            strokeWidth="1"
          />
          <path d={slotLower} fill="#050607" />
          {/* lower lip of the slot catching the light */}
          <path
            d={`M${SLOT.x + 4} ${SLOT.y + SLOT.h - 1}h${SLOT.w - 8}`}
            stroke="#c9d1d8"
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        </svg>
      </div>
    </>
  )
}

// ---------- Lanyard border ----------
// A black band around the card with outlined text running round it, like a printed lanyard.
// The text follows the band's centre line, starting and ending at the top centre, where the
// badge plate hides the seam. It scrolls by exactly one phrase per cycle, so the loop is seamless.
const BAND_TEXT = 'OZTEKNIKER — BUILT BY HAND — LINKED BY CODE — '.replace(/ /g, '\u00A0')
const SPEED = 36 // px per second

function LanyardText({ band }) {
  const svg = useRef(null)
  const meas = useRef(null)
  const [size, setSize] = useState(null)
  const [unit, setUnit] = useState(0)

  useEffect(() => {
    const el = svg.current
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fontSize = band > 30 ? 14 : 11
  // measure one phrase as actually rendered (after the web font has loaded)
  useEffect(() => {
    const measure = () => meas.current && setUnit(meas.current.getComputedTextLength())
    measure()
    document.fonts?.ready.then(measure)
  }, [fontSize])

  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const textProps = {
    fontFamily: 'Unbounded, sans-serif',
    fontWeight: 700,
    fontSize,
    letterSpacing: '0.18em',
    fill: 'none',
    stroke: 'rgba(232,236,239,0.55)',
    strokeWidth: 0.7,
    dominantBaseline: 'central',
  }

  let content = null
  if (size && unit > 0) {
    const inset = band / 2
    const r = Math.max(4, 40 - inset)
    const w = size.w - inset * 2
    const h = size.h - inset * 2
    const cx = size.w / 2
    // clockwise from the top centre back to the top centre
    const d =
      `M${cx} ${inset}H${inset + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${inset + h - r}a${r} ${r} 0 0 1 ${-r} ${r}` +
      `H${inset + r}a${r} ${r} 0 0 1 ${-r} ${-r}V${inset + r}a${r} ${r} 0 0 1 ${r} ${-r}H${cx}`
    const perimeter = 2 * (w + h) - 8 * r + 2 * Math.PI * r
    const repeats = Math.ceil(perimeter / unit) + 2
    content = (
      <>
        <path id="lanyard-path" d={d} fill="none" />
        <text {...textProps}>
          <textPath href="#lanyard-path" startOffset="0">
            {BAND_TEXT.repeat(repeats)}
            {!still && (
              <animate attributeName="startOffset" from="0" to={-unit} dur={`${unit / SPEED}s`} repeatCount="indefinite" />
            )}
          </textPath>
        </text>
      </>
    )
  }

  return (
    <svg ref={svg} aria-hidden="true" className="pointer-events-none absolute inset-0 size-full">
      <text ref={meas} {...textProps} visibility="hidden" x="0" y="-100">
        {BAND_TEXT}
      </text>
      {content}
    </svg>
  )
}

export default function Contact() {
  const [topic, setTopic] = useState('Website')
  // band width matches the CSS: 24px on phones, 36px from the sm breakpoint
  const [bandPx, setBandPx] = useState(() => (window.matchMedia('(min-width: 640px)').matches ? 36 : 24))
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    const on = () => setBandPx(mq.matches ? 36 : 24)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const form = useRef(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return
    // honeypot: real people never see or fill this field, bots usually do
    if (form.current.company.value) return

    setStatus('sending')
    try {
      if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) throw new Error('EmailJS keys missing in .env.local')
      await emailjs.sendForm(SERVICE_ID, TEMPLATE_ID, form.current, { publicKey: PUBLIC_KEY })
      setStatus('sent')
      form.current.reset()
      setTopic('Website')
      setTimeout(() => setStatus('idle'), 6000)
    } catch (err) {
      console.error('Contact form:', err)
      setStatus('error')
    }
  }

  return (
    <section id="contact" data-chain-tone="white" data-bg="#1d1f22" className="relative overflow-hidden text-[#e8ecef]">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 pb-18 text-center">
        {/* room for the 3D chain to swing in */}
        <div className="h-56" />

        {/* lanyard band (black, with outlined text running round it) */}
        <div
          className="relative w-full max-w-[1040px] rounded-[40px] border border-white/15 bg-[#08090a] p-[var(--band)] shadow-[0_40px_120px_rgba(0,0,0,0.55)] [--band:24px] sm:[--band:36px]"
        >
          <LanyardText band={bandPx} />
          <BadgeSlot />
        {/* chrome border */}
        <div
          className="relative rounded-[28px] p-px"
          style={{ background: 'linear-gradient(160deg, #fff 0%, #6b737a 22%, #2a2d31 45%, #9aa2a9 70%, #1e2023 100%)' }}
        >
          <form
            ref={form}
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-12 rounded-[27px] p-[clamp(24px,4vw,48px)] pt-[calc(var(--link-px,60px)*0.6+12px)] text-left"
            style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.09), rgba(255,255,255,0) 70%), #17191c',
            }}
          >
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4.5">
              <p className="font-mono text-[13px] text-[#9aa2a9]">.Contact()</p>
              <Reveal as="h2" className="chrome-text font-display text-[clamp(28px,3vw,40px)] font-bold leading-[1.08] tracking-[-0.01em]">
                Got an idea?
                <br />
                Let's link up.
              </Reveal>
              <p className="leading-relaxed text-[#aeb6bd]">
                A website, an app, an assistant or something stranger. Tell me what you have in mind.
              </p>
              <div className="mt-auto flex flex-col gap-2.5 border-t border-white/10 pt-3">
                <a href={`mailto:${EMAIL}`} className="inline-flex min-h-11 items-center gap-2.5 text-[15px]">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                  {EMAIL}
                </a>
                <div className="flex flex-wrap gap-1 font-mono text-[13px] text-[#aeb6bd]">
                  {SOCIALS.filter((l) => l.url).map((l, i) => (
                    <a
                      key={l.label}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${i === 0 ? 'pr-2.5' : 'px-2.5'} py-3 transition-colors hover:text-white`}
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-[1.4_1_380px] flex-col gap-5.5">
              {/* sent along with the form */}
              <input type="hidden" name="topic" value={topic} />
              <input
                type="text"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute -left-[9999px] h-px w-px opacity-0"
              />

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-3 text-sm text-[#c3cad0]">What are we building?</legend>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((t) => {
                    const on = t === topic
                    return (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTopic(t)}
                        className={
                          on
                            ? 'btn-chrome min-h-11 cursor-pointer rounded-full px-4.5 text-sm font-semibold text-[#0b0d0f]'
                            : 'min-h-11 cursor-pointer rounded-full border border-white/20 px-4.5 text-sm text-[#c3cad0] hover:border-white/50'
                        }
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
              </fieldset>

              <div className="flex flex-wrap gap-5.5">
                <label className={`${fieldLabel} flex-[1_1_180px]`}>
                  NAME
                  <input name="name" type="text" required placeholder="Your name" className={fieldInput} />
                </label>
                <label className={`${fieldLabel} flex-[1_1_180px]`}>
                  EMAIL
                  <input name="email" type="email" required placeholder="you@example.com" className={fieldInput} />
                </label>
              </div>
              <label className={fieldLabel}>
                MESSAGE
                <textarea name="message" required placeholder="Tell me about your idea" className={`${fieldInput} min-h-30 resize-y py-3`} />
              </label>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="btn-chrome inline-flex min-h-14 cursor-pointer items-center gap-3 rounded-full pl-7 pr-2.5 font-semibold text-[#0b0d0f] disabled:cursor-wait disabled:opacity-70"
                >
                  {BUTTON_LABEL[status]}
                  <span className="inline-flex size-[38px] items-center justify-center rounded-full bg-ink text-[#f2f4f6]">
                    {status === 'sending' ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    ) : status === 'sent' ? (
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    ) : (
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m13 6 6 6-6 6" />
                      </svg>
                    )}
                  </span>
                </button>
                <p role="status" aria-live="polite" className="text-sm text-[#aeb6bd]">
                  {status === 'sent' && "Thanks! I'll get back to you soon."}
                  {status === 'error' && (
                    <>
                      Something went wrong. You can also email{' '}
                      <a href={`mailto:${EMAIL}`} className="text-white underline underline-offset-4">
                        {EMAIL}
                      </a>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
          </form>
        </div>
        </div>

        <div className="h-24" />
        <Reveal as="p" className="chrome-text font-display text-[clamp(44px,8vw,116px)] font-black leading-[0.95] tracking-[-0.03em]">
          LET'S BUILD
          <br />
          SOMETHING.
        </Reveal>
        <p className="mt-18 text-[13px] text-[#8a9299]">© 2026 Oztekniker</p>
      </div>
    </section>
  )
}
