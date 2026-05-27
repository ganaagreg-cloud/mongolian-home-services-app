import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'
import { SignJWT, jwtVerify } from 'jose'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { db, dbReady } from '@/lib/db'
import type { SessionPayload, UserRole } from './types'

// ── Password hashing (kept for existing register/login routes) ──────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const hashBuffer = Buffer.from(hash, 'hex')
    const suppliedHash = scryptSync(password, salt, 64)
    return timingSafeEqual(hashBuffer, suppliedHash)
  } catch {
    return false
  }
}

// ── Legacy JWT helpers (kept for existing login/register/logout routes) ──────

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-replace-before-production'
)
const COOKIE_NAME = 'token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await signToken(payload)
  const store = await cookies()
  store.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

// ── Better Auth instance ──────────────────────────────────────────────────────
// Uses its own pool so it can manage its own tables (user, session, account)
// independently of our app's users table initialisation chain.

const authPool = new Pool({
  connectionString: process.env.DATABASE_URL ?? '',
})

export const auth = betterAuth({
  database: authPool,
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-secret-replace-before-production',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({
        email: profile.email ?? `${profile.id}@facebook.placeholder.local`,
      }),
    },
  },
  plugins: [nextCookies()],
  user: {
    additionalFields: {
      is_worker:   { type: 'boolean', defaultValue: false, input: false },
      active_mode: { type: 'string',  defaultValue: 'user', input: false },
      phone:       { type: 'string',  required: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // After Better Auth creates its own user record, provision our users row.
        // If a users row already has the same email (e.g. seeded worker), link it
        // instead of inserting a duplicate — prevents unique-email constraint errors.
        after: async (baUser: { id: string; name?: string | null; email?: string | null }) => {
          await dbReady
          const email = baUser.email ?? ''
          try {
            // Link to an existing unlinked users row that shares the same email
            if (email) {
              const linked = await db.query(
                `UPDATE users SET better_auth_id = $1
                 WHERE email = $2 AND better_auth_id IS NULL
                 RETURNING id`,
                [baUser.id, email],
              )
              if ((linked.rowCount ?? 0) > 0) return
            }
            // New user — ON CONFLICT DO NOTHING handles all unique violations
            // (partial index on better_auth_id requires omitting the conflict target)
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

export type Session = typeof auth.$Infer.Session

// ── requireAuth — Better Auth session backed ──────────────────────────────────
// Reads the BA session cookie, then bridges to our integer users.id.
// Return shape is unchanged: { sub, role, phone } — existing routes need zero edits.

export async function requireAuth(req: NextRequest): Promise<SessionPayload | null> {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) return null

  await dbReady
  const { rows } = await db.query(
    `SELECT id, role, phone, is_worker, active_mode
     FROM users WHERE better_auth_id = $1`,
    [session.user.id],
  )
  const user = rows[0] as {
    id: number
    role: string
    phone: string
    is_worker: boolean
    active_mode: string
  } | undefined

  if (!user) return null

  return {
    sub:         String(user.id),
    role:        user.role as UserRole,
    phone:       user.phone ?? '',
    is_worker:   user.is_worker,
    active_mode: user.active_mode as 'user' | 'worker',
  }
}

export async function requireAdmin(req: NextRequest): Promise<SessionPayload | null> {
  const session = await requireAuth(req)
  if (!session || session.role !== 'admin') return null
  return session
}
