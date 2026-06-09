import { serve } from '@hono/node-server'
import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { pinoLogger } from 'hono-pino'
import { db, dbReady } from './db'
import { makeRateLimiter } from './lib/rate-limit'
import { auth, authConfig } from './auth'
import { runBaPluginMigrations } from './lib/ba-migrate'
import { logAudit } from './lib/audit'
import authRouter       from './routes/auth'
import meRouter         from './routes/me'
import ordersRouter     from './routes/orders'
import workersRouter    from './routes/workers'
import adminRouter      from './routes/admin'
import paymentsRouter   from './routes/payments'
import sosRouter        from './routes/sos'
import disputesRouter   from './routes/disputes'
import serviceTypesRouter from './routes/service-types'
import notificationsRouter   from './routes/notifications'
import applicationsRouter, { expireOrder }  from './routes/applications'

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

// Per-route rate limiters — sliding window, in-memory, keyed by IP+path
const authRateOk    = makeRateLimiter(60_000,  5)   // login + OTP endpoints
const invoiceRateOk = makeRateLimiter(60_000, 10)   // payment invoice creation

const clientIp = (c: Context): string =>
  c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

// /api/auth/* POST — covers sign-in, forgot-password, verify-otp, phone-lookup
app.use('/api/auth/*', async (c, next) => {
  if (c.req.method === 'POST' && !authRateOk(`${clientIp(c)}:${c.req.path}`)) {
    return c.json({ error: 'Request failed' }, 429)
  }
  return next()
})

// /api/payments/create-invoice — invoice creation is a financial write
app.use('/api/payments/create-invoice', async (c, next) => {
  if (!invoiceRateOk(`${clientIp(c)}:${c.req.path}`)) {
    return c.json({ error: 'Request failed' }, 429)
  }
  return next()
})

// /api/sos is intentionally EXEMPT from rate limiting — never block emergency calls

// Custom auth routes first (before Better Auth wildcard)
app.route('/', authRouter)

// Audit 2FA enable/disable events — runs after BA processes the request.
// We capture the session before and look up the app user ID after, so the
// audit record stores an integer FK into users rather than a BA string ID.
app.use('/api/auth/two-factor/:action', async (c, next) => {
  const action = c.req.param('action')
  if (action !== 'enable' && action !== 'disable') return next()
  const baSession = await auth.api.getSession({ headers: c.req.raw.headers })
  await next()
  if (c.res.ok && baSession?.user?.id) {
    await dbReady
    const row = (await db.query(
      'SELECT id FROM users WHERE better_auth_id = $1',
      [baSession.user.id],
    )).rows[0] as { id: number } | undefined
    if (row) await logAudit(row.id, `twoFactor.${action}`, {}).catch(() => {})
  }
})

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
app.route('/', notificationsRouter)
app.route('/', applicationsRouter)

async function runExpiryJob() {
  try {
    const { rows } = await db.query<{ id: string }>(
      `SELECT id FROM orders WHERE status = 'awaiting_payment' AND payment_deadline < NOW()`,
    )
    for (const { id } of rows) {
      await expireOrder(id)
    }
  } catch { /* non-fatal: will retry next tick */ }
}

const PORT = Number(process.env.PORT ?? 4000)
dbReady
  .then(() => runBaPluginMigrations(authConfig, db))
  .then(() => {
    serve({ fetch: app.fetch, port: PORT }, () => console.log(`[api] listening on :${PORT}`))
    setInterval(() => void runExpiryJob(), 60_000)
  })
  .catch(() => process.exit(1))

// Type-only export — safe for `import type { AppType } from '@homeservices/api'`
// in Next.js; TypeScript erases this at build time, no Node.js code is bundled.
export type AppType = typeof app
