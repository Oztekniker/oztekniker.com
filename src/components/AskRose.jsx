import { useEffect, useRef, useState } from 'react'

// "Ask Rose": a small chat in Rose's style: dark chrome with a touch of rose.
// Messages go to /api/rose.php (PHP on the host, or the dev stand-in in vite.config.js),
// which adds the persona and talks to Claude. Rose's replies type themselves out.

const SUGGESTIONS = ['Who is Arda?', 'Who are you?', 'Is he open to projects?']
const API = '/api/rose.php'

// Cloudflare Turnstile: a free, mostly invisible "are you human" check. The chat must pass it
// once to get a signed session from the server; without a session Rose won't answer.
// If no site key is set (VITE_TURNSTILE_SITE_KEY), the chat starts a session without it.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY
let turnstileLoading = null
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  turnstileLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve(window.turnstile)
    s.onerror = reject
    document.head.appendChild(s)
  })
  return turnstileLoading
}
const ROSE = '#e8a3b8' // the accent: soft rose, not too loud

function greeting() {
  return "Hey, I'm Rose, Arda's assistant. Ask me anything about him or his work."
}

// reveals text a few characters per frame
function Typed({ text, onDone }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (n >= text.length) {
      onDone?.()
      return
    }
    const id = requestAnimationFrame(() => setN((v) => Math.min(text.length, v + 2)))
    return () => cancelAnimationFrame(id)
  }, [n, text, onDone])
  return text.slice(0, n)
}

function Orb({ busy }) {
  return (
    <span className="relative inline-flex size-3 items-center justify-center" aria-hidden="true">
      <span
        className={`absolute inset-0 rounded-full ${busy ? 'animate-ping' : 'animate-pulse'}`}
        style={{ background: ROSE, opacity: 0.5 }}
      />
      <span className="relative size-2 rounded-full" style={{ background: ROSE, boxShadow: `0 0 10px ${ROSE}` }} />
    </span>
  )
}

export default function AskRose() {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(() => !document.documentElement.classList.contains('intro-pending'))
  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: greeting(), typed: true }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef(null)
  const field = useRef(null)
  const button = useRef(null)
  const cfBox = useRef(null)
  const widget = useRef(null)
  const pendingToken = useRef(null)
  const session = useRef(null) // a promise of the session string

  // one Turnstile token (renders the widget the first time, resets it after that)
  async function turnstileToken() {
    const ts = await loadTurnstile()
    return new Promise((resolve, reject) => {
      pendingToken.current = { resolve, reject }
      if (widget.current != null) {
        ts.reset(widget.current)
      } else {
        widget.current = ts.render(cfBox.current, {
          sitekey: SITE_KEY,
          appearance: 'interaction-only', // invisible unless Cloudflare needs a click
          size: 'flexible',
          theme: 'dark',
          callback: (t) => pendingToken.current?.resolve(t),
          'error-callback': () => pendingToken.current?.reject(new Error('turnstile')),
        })
      }
    })
  }

  function getSession(fresh = false) {
    if (fresh) session.current = null
    session.current ??= (async () => {
      const token = SITE_KEY ? await turnstileToken() : ''
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'start', turnstile: token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.session) throw new Error(data.error || 'session')
      return data.session
    })().catch((e) => {
      session.current = null // let the next attempt try again
      throw e
    })
    return session.current
  }

  // get verified as soon as the chat opens, so the first question doesn't wait
  useEffect(() => {
    if (open) getSession().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // appear once the intro is over
  useEffect(() => {
    if (ready) return
    const on = () => setReady(true)
    window.addEventListener('intro-done', on, { once: true })
    return () => window.removeEventListener('intro-done', on)
  }, [ready])

  // keep the newest message in view
  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  // focus the field on open; Escape closes and returns focus to the button
  useEffect(() => {
    if (!open) return
    field.current?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function ask(text) {
    const q = text.trim()
    if (!q || busy) return
    const next = [...messages, { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setBusy(true)
    // the greeting is local, so it isn't sent; the server wants the visitor to speak first
    const history = next.slice(1).map(({ role, content }) => ({ role, content }))
    const send = async (fresh) =>
      fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session: await getSession(fresh), messages: history }),
      })
    try {
      let res = await send(false)
      if (res.status === 401) res = await send(true) // session expired: verify again once
      const data = await res.json().catch(() => ({}))
      const reply = res.ok && data.reply ? data.reply : data.error || 'Hmm, I lost the connection there. Try again?'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Hmm, I lost the connection there. Try again?' }])
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <section
          role="dialog"
          aria-label="Ask Rose"
          className="flex h-[min(560px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border text-[#e9ecef] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
          style={{
            borderColor: 'rgba(232,163,184,0.28)',
            background: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(232,163,184,0.10), transparent 70%), #0b0c0e',
          }}
        >
          <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(232,163,184,0.16)' }}>
            <span className="font-mono text-[13px] tracking-[0.5em]" style={{ color: '#f2f4f6' }}>
              R O S E.
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em]" style={{ color: ROSE }}>
              <Orb busy={busy} />
              {busy ? 'THINKING' : 'LISTENING'}
            </span>
          </header>

          {/* data-lenis-prevent: let this list scroll on its own instead of the page */}
          <ol ref={list} data-lenis-prevent aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {messages.map((m, i) =>
              m.role === 'assistant' ? (
                <li key={i} className="max-w-[90%] text-[15px] leading-relaxed text-[#e9ecef]">
                  {m.typed ? (
                    m.content
                  ) : (
                    <Typed
                      text={m.content}
                      onDone={() => setMessages((all) => all.map((x, j) => (j === i ? { ...x, typed: true } : x)))}
                    />
                  )}
                </li>
              ) : (
                <li
                  key={i}
                  className="max-w-[85%] self-end rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-relaxed"
                  style={{ background: 'rgba(232,163,184,0.14)', color: '#f4f6f8' }}
                >
                  {m.content}
                </li>
              ),
            )}
            {busy && (
              <li className="flex gap-1.5" aria-label="Rose is thinking">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full"
                    style={{ background: ROSE, animationDelay: `${d * 120}ms` }}
                  />
                ))}
              </li>
            )}
          </ol>

          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 px-5 pb-3">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="min-h-9 cursor-pointer rounded-full border px-3 text-[12px] transition-colors hover:bg-[rgba(232,163,184,0.14)]"
                  style={{ borderColor: 'rgba(232,163,184,0.35)', color: '#f2f4f6' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Turnstile lives here; it stays invisible unless Cloudflare asks for a click */}
          <div ref={cfBox} className="px-5 empty:hidden" />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex items-center gap-2 border-t p-3"
            style={{ borderColor: 'rgba(232,163,184,0.16)' }}
          >
            <label htmlFor="rose-input" className="sr-only">
              Ask Rose
            </label>
            <input
              id="rose-input"
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="Ask about Arda's work…"
              autoComplete="off"
              className="min-h-11 flex-1 rounded-full bg-[rgba(255,255,255,0.04)] px-4 text-[15px] text-[#f4f6f8] outline-none placeholder:text-[#7d848b] focus:bg-[rgba(255,255,255,0.07)]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-opacity disabled:cursor-default disabled:opacity-40"
              style={{ background: ROSE, color: '#0b0c0e' }}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
            </button>
          </form>
        </section>
      )}

      <button
        ref={button}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close Rose' : 'Ask Rose'}
        className="inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-full border px-5 font-mono text-[12px] tracking-[0.3em] shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
        style={{ borderColor: 'rgba(232,163,184,0.4)', background: '#0b0c0e', color: '#f2f4f6' }}
      >
        <Orb busy={busy} />
        {open ? 'CLOSE' : 'ASK ROSE'}
      </button>
    </div>
  )
}
