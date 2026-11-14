import { useEffect, useRef, useState } from 'react'

// "Ask NOXIS": a small gold-on-black chat, styled after the NOXIS desktop interface.
// Messages go to /api/noxis.php (PHP on the host, or the dev stand-in in vite.config.js),
// which adds the persona and talks to Claude. NOXIS's replies type themselves out.

const SUGGESTIONS = ['Who is Arda?', 'What is NOXIS?', 'Is he open to projects?']
const GOLD = '#d9a54c'

function greeting() {
  const h = new Date().getHours()
  const part = h < 5 ? 'evening' : h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
  return `Good ${part}. I'm NOXIS, Arda's assistant. Ask me anything about him or his work.`
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
        style={{ background: GOLD, opacity: 0.5 }}
      />
      <span className="relative size-2 rounded-full" style={{ background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
    </span>
  )
}

export default function AskNoxis() {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(() => !document.documentElement.classList.contains('intro-pending'))
  const [messages, setMessages] = useState(() => [{ role: 'assistant', content: greeting(), typed: true }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const list = useRef(null)
  const field = useRef(null)
  const button = useRef(null)

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
    try {
      const res = await fetch('/api/noxis.php', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        // the greeting is local, so it isn't sent; the server wants the visitor to speak first
        body: JSON.stringify({ messages: next.slice(1).map(({ role, content }) => ({ role, content })) }),
      })
      const data = await res.json().catch(() => ({}))
      const reply = res.ok && data.reply ? data.reply : data.error || 'Apologies, I lost the connection. Please try again.'
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Apologies, I lost the connection. Please try again.' }])
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
          aria-label="Ask NOXIS"
          className="flex h-[min(560px,calc(100dvh-120px))] w-[min(380px,calc(100vw-32px))] flex-col overflow-hidden rounded-[22px] border text-[#efe6d6] shadow-[0_30px_80px_rgba(0,0,0,0.6)]"
          style={{
            borderColor: 'rgba(217,165,76,0.28)',
            background: 'radial-gradient(ellipse 80% 45% at 50% 0%, rgba(217,165,76,0.10), transparent 70%), #0d0c0a',
          }}
        >
          <header className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(217,165,76,0.16)' }}>
            <span className="font-mono text-[13px] tracking-[0.5em]" style={{ color: '#f1e3c8' }}>
              N O X I S.
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em]" style={{ color: GOLD }}>
              <Orb busy={busy} />
              {busy ? 'THINKING' : 'LISTENING'}
            </span>
          </header>

          {/* data-lenis-prevent: let this list scroll on its own instead of the page */}
          <ol ref={list} data-lenis-prevent aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
            {messages.map((m, i) =>
              m.role === 'assistant' ? (
                <li key={i} className="max-w-[90%] text-[15px] leading-relaxed text-[#efe6d6]">
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
                  style={{ background: 'rgba(217,165,76,0.14)', color: '#f6ead2' }}
                >
                  {m.content}
                </li>
              ),
            )}
            {busy && (
              <li className="flex gap-1.5" aria-label="NOXIS is thinking">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full"
                    style={{ background: GOLD, animationDelay: `${d * 120}ms` }}
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
                  className="min-h-9 cursor-pointer rounded-full border px-3 text-[12px] transition-colors hover:bg-[rgba(217,165,76,0.14)]"
                  style={{ borderColor: 'rgba(217,165,76,0.35)', color: '#f1e3c8' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              ask(input)
            }}
            className="flex items-center gap-2 border-t p-3"
            style={{ borderColor: 'rgba(217,165,76,0.16)' }}
          >
            <label htmlFor="noxis-input" className="sr-only">
              Ask NOXIS
            </label>
            <input
              id="noxis-input"
              ref={field}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={600}
              placeholder="Ask about Arda's work…"
              autoComplete="off"
              className="min-h-11 flex-1 rounded-full bg-[rgba(255,255,255,0.04)] px-4 text-[15px] text-[#f6ead2] outline-none placeholder:text-[#8a7f6c] focus:bg-[rgba(255,255,255,0.07)]"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="inline-flex size-11 cursor-pointer items-center justify-center rounded-full transition-opacity disabled:cursor-default disabled:opacity-40"
              style={{ background: GOLD, color: '#0d0c0a' }}
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
        aria-label={open ? 'Close NOXIS' : 'Ask NOXIS'}
        className="inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-full border px-5 font-mono text-[12px] tracking-[0.3em] shadow-[0_12px_40px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
        style={{ borderColor: 'rgba(217,165,76,0.4)', background: '#0d0c0a', color: '#f1e3c8' }}
      >
        <Orb busy={busy} />
        {open ? 'CLOSE' : 'ASK NOXIS'}
      </button>
    </div>
  )
}
