import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { pinoLogger } from 'hono-pino'
import { rateLimiter } from 'hono-rate-limiter'
import { db, dbReady } from './db'
import { auth } from './auth'
import authRouter       from './routes/auth'
import meRouter         from './routes/me'
import ordersRouter     from './routes/orders'
import workersRouter    from './routes/workers'
import adminRouter      from './routes/admin'
import paymentsRouter   from './routes/payments'
import sosRouter        from './routes/sos'
import disputesRouter   from './routes/disputes'
import serviceTypesRouter from './routes/service-types'

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const app = new Hono()

app.use('*', cors({
  origin: (origin) => allowedOrigins.includes(origin) ? origin : null,
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
  credentials: true,
}))

app.use('*', pinoLogger({
  http: {
    onReqBindings: (c) => ({ req: { method: c.req.method, path: c.req.path } }),
    onResBindings: (c) => ({ res: { status: c.res.status } }),
    responseTime: true,
  },
}))

// Health check — no auth, must stay fast
app.get('/api/health', async (c) => {
  try {
    await db.query('SELECT 1')
    return c.json({ status: 'ok', db: 'ok', ts: Date.now() })
  } catch {
    return c.json({ status: 'degraded', db: 'error', ts: Date.now() }, 503)
  }
})

app.get('/health', (c) => c.json({ ok: true }))

// Per-route rate limiters (in-memory, per IP)
app.use('/api/payments/*', rateLimiter({
  windowMs: 60_000,
  limit: 20,
  keyGenerator: (c) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
}))
app.use('/api/auth/dan', rateLimiter({
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (c) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
}))
app.use('/api/sos', rateLimiter({
  windowMs: 60_000,
  limit: 60,
  keyGenerator: (c) => c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
}))

// Custom auth routes first (before Better Auth wildcard)
app.route('/', authRouter)

// Better Auth — handles all OAuth flows, session management, signout
app.all('/api/auth/*', (c) => auth.handler(c.req.raw))
app.route('/', meRouter)
app.route('/', ordersRouter)
app.route('/', workersRouter)
app.route('/', adminRouter)
app.route('/', paymentsRouter)
app.route('/', sosRouter)
app.route('/', disputesRouter)
app.route('/', serviceTypesRouter)

const PORT = Number(process.env.PORT ?? 4000)
dbReady
  .then(() => serve({ fetch: app.fetch, port: PORT }, () => console.log(`[api] listening on :${PORT}`)))
  .catch(() => process.exit(1))

// Type-only export — safe for `import type { AppType } from '@homeservices/api'`
// in Next.js; TypeScript erases this at build time, no Node.js code is bundled.
export type AppType = typeof app
