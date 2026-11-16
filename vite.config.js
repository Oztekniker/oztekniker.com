import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { readFileSync } from 'node:fs'

// In production, /api/rose.php runs on the PHP host. `npm run dev` can't run PHP,
// so this stands in for it locally, using ANTHROPIC_API_KEY from .env.local
// (no VITE_ prefix, so it is never bundled into the site).
function roseDev(env) {
  return {
    name: 'rose-dev',
    configureServer(server) {
      server.middlewares.use('/api/rose.php', async (req, res) => {
        const send = (code, body) => {
          res.statusCode = code
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return send(405, { error: 'POST only' })
        if (!env.ANTHROPIC_API_KEY) return send(500, { error: 'Add ANTHROPIC_API_KEY to .env.local' })
        let raw = ''
        for await (const chunk of req) raw += chunk
        const { action, messages = [] } = JSON.parse(raw || '{}')
        // locally there is no Turnstile or origin check; any session is fine
        if (action === 'start') return send(200, { session: 'dev' })
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-5-5',
            max_tokens: 350,
            system: readFileSync('public/api/rose-prompt.txt', 'utf8'),
            messages: messages.slice(-12),
            thinking: { type: 'disabled' },
            output_config: { effort: 'low' },
          }),
        })
        if (!r.ok) return send(502, { error: 'Rose could not be reached. Please try again.' })
        const data = await r.json()
        send(200, { reply: data.content?.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), roseDev(env)],
  }
})
