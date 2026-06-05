import { betterAuth } from 'better-auth'
import { scryptSync, randomBytes, createHmac, timingSafeEqual } from 'crypto'
import { getCookie } from 'hono/cookie'
import { db, dbReady } from './db'
import type { SessionPayload, UserRole } from '@homeservices/shared'
import type { Context } from 'hono'

const ADMIN_HMAC_KEY = (() => {
  const v = process.env.JWT_SECRET
  if (!v) throw new Error('[auth] JWT_SECRET env var is required')
  return v
})()

const ADMIN_TOKEN_TTL_MS = 12 * 60 * 60 * 1000 // 12 hours

export function hashOtp(code: string): string {
  return createHmac('sha256', ADMIN_HMAC_KEY).update(code).digest('hex')
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const trustedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: db,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  trustedOrigins,
  advanced: {
    cookiePrefix: 'better-auth',
    cookies: {
      session_token: {
        name: 'better-auth.session_token',
        attributes: isProd ? { sameSite: 'none' as const, secure: true } : {},
      },
    },
    crossSubDomainCookies: {
      enabled: !!process.env.COOKIE_DOMAIN,
      domain: process.env.COOKIE_DOMAIN,
    },
    useSecureCookies: isProd,
  },
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    facebook: {
      clientId:     process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      mapProfileToUser: (profile: { id: string; email?: string }) => ({
        email: profile.email ?? `${profile.id}@facebook.placeholder.local`,
      }),
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (baUser: { id: string; name?: string | null; email?: string | null }) => {
          await dbReady
          const email = baUser.email ?? ''
          try {
            if (email) {
              const linked = await db.query(
                `UPDATE users SET better_auth_id = $1
                 WHERE email = $2 AND better_auth_id IS NULL
                 RETURNING id`,
                [baUser.id, email],
              )
              if ((linked.rowCount ?? 0) > 0) return
            }
            await db.query(
              `INSERT INTO users (better_auth_id, name, email)
               VALUES ($1, $2, $3)
               ON CONFLICT DO NOTHING`,
              [baUser.id, baUser.name ?? '', email],
            )
          } catch (err) {
            console.error('[auth hook] failed to provision users row:', err)
          }
        },
      },
    },
  },
})

export async function requireAuth(c: Context): Promise<SessionPayload | null> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) return null

  await dbReady
  const { rows } = await db.query(
    `SELECT id, role, is_worker, active_mode
     FROM users WHERE better_auth_id = $1`,
    [session.user.id],
  )
  const user = rows[0] as {
    id: number; role: string
    is_worker: boolean; active_mode: string
  } | undefined

  if (!user) return null

  return {
    sub:         String(user.id),
    role:        user.role as UserRole,
    is_worker:   user.is_worker,
    active_mode: user.active_mode as 'user' | 'worker',
  }
}

const ADMIN_COOKIE = 'hs-admin-session'

export function createAdminToken(): string {
  const payload = `hs-admin.${Date.now()}`
  const sig = createHmac('sha256', ADMIN_HMAC_KEY).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const sep = decoded.lastIndexOf('|')
    if (sep < 0) return false
    const payload = decoded.slice(0, sep)
    const sig = decoded.slice(sep + 1)
    const expected = createHmac('sha256', ADMIN_HMAC_KEY).update(payload).digest('hex')

    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false

    // Reject tokens older than TTL — payload format: "hs-admin.{timestamp}"
    const ts = Number(payload.split('.')[1])
    if (isNaN(ts) || Date.now() - ts > ADMIN_TOKEN_TTL_MS) return false

    return true
  } catch { return false }
}

// The admin panel and API are separate origins on Render, so the cookie is set
// and sent cross-site. Browsers only store/send a cross-site cookie when it is
// SameSite=None; Secure. Localhost dev is http and same-site-enough → keep Lax.
function adminCookieSameSite(): string {
  return process.env.NODE_ENV === 'production' ? 'None; Secure' : 'Lax'
}

export function clearAdminCookie(): string {
  return `${ADMIN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=${adminCookieSameSite()}`
}

export function setAdminCookie(token: string): string {
  return `${ADMIN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=${adminCookieSameSite()}`
}

export async function requireAdmin(c: Context): Promise<SessionPayload | null> {
  // Better Auth session (OAuth admins)
  const s = await requireAuth(c)
  if (s?.role === 'admin') return s

  // Credential session cookie (admin panel username/password login)
  const token = getCookie(c, ADMIN_COOKIE)
  if (token && verifyAdminToken(token)) {
    return { sub: 'admin', role: 'admin', is_worker: false, active_mode: 'user' }
  }

  return null
}
