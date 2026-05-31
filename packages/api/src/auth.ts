import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { scryptSync, randomBytes } from 'crypto'
import { db, dbReady } from './db'
import type { SessionPayload, UserRole } from '@homeservices/shared'
import type { Context } from 'hono'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const authPool = new Pool({ connectionString: process.env.DATABASE_URL })

const trustedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: authPool,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',
  trustedOrigins,
  advanced: {
    cookiePrefix: 'better-auth',
    cookies: {
      session_token: {
        name: 'better-auth.session_token',
      },
    },
    crossSubDomainCookies: {
      enabled: isProd,
      domain: process.env.COOKIE_DOMAIN ?? '.homeservice.mn',
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

export async function requireAdmin(c: Context): Promise<SessionPayload | null> {
  const s = await requireAuth(c)
  return s?.role === 'admin' ? s : null
}
