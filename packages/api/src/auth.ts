import { betterAuth } from 'better-auth'
import { Pool } from 'pg'
import { scryptSync, randomBytes } from 'crypto'
import { db, dbReady } from './db'
import type { SessionPayload } from '@homeservices/shared'
import type { Request } from 'express'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

const authPool = new Pool({ connectionString: process.env.DATABASE_URL })

export const auth = betterAuth({
  database: authPool,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  emailAndPassword: { enabled: true },
})

export async function requireAuth(req: Request): Promise<SessionPayload | null> {
  const session = await auth.api.getSession({
    headers: new Headers({ cookie: req.headers.cookie ?? '' }),
  })
  if (!session?.user) return null
  await dbReady
  const { rows } = await db.query(
    `SELECT id, role, phone, is_worker, active_mode FROM users WHERE better_auth_id = $1`,
    [session.user.id],
  )
  const user = rows[0]
  if (!user) return null
  return {
    sub: String(user.id),
    role: user.role,
    phone: user.phone ?? '',
    is_worker: user.is_worker,
    active_mode: user.active_mode,
  }
}

export async function requireAdmin(req: Request): Promise<SessionPayload | null> {
  const s = await requireAuth(req)
  return s?.role === 'admin' ? s : null
}
