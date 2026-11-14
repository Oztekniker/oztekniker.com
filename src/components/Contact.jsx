import { useRef, useState } from 'react'
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

export default function Contact() {
  const [topic, setTopic] = useState('Website')
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
        {/* room for the 3D chain to swing in; it ends exactly on this anchor */}
        <div className="h-56" />
        <div id="chain-anchor" aria-hidden="true" className="h-0 w-0" />

        {/* chrome border */}
        <div
          className="relative w-full max-w-[980px] rounded-[28px] p-px shadow-[0_40px_120px_rgba(0,0,0,0.55)]"
          style={{ background: 'linear-gradient(160deg, #fff 0%, #6b737a 22%, #2a2d31 45%, #9aa2a9 70%, #1e2023 100%)' }}
        >
          <form
            ref={form}
            onSubmit={handleSubmit}
            className="flex flex-wrap gap-12 rounded-[27px] p-[clamp(24px,4vw,48px)] text-left"
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
