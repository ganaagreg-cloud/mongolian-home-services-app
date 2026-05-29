import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { dbReady } from './db'
import { auth } from './auth'
import authRouter from './routes/auth'

const app = new Hono()

// Health check
app.get('/health', (c) => c.json({ ok: true }))

// Better Auth — handles all OAuth flows, session management, signout
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))

// Custom auth domain routes (auth/me, auth/dan)
app.route('/', authRouter)

const PORT = Number(process.env.PORT ?? 4000)
dbReady
  .then(() => serve({ fetch: app.fetch, port: PORT }, () => console.log(`[api] listening on :${PORT}`)))
  .catch(() => process.exit(1))
