import { SignJWT, jwtVerify } from 'jose'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { SessionPayload } from './types'

// ── Password hashing (Node built-in crypto, no extra deps) ──────────────────

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

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'dev-secret-replace-before-production'
)

const COOKIE_NAME = 'token'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 7, // 7 days
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

// Call only from Route Handlers and Server Actions.
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

// Use at the top of every protected Route Handler.
// Returns null if the request is unauthenticated (caller must return 401).
export async function requireAuth(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// Returns null if the caller is not an admin (use with 403 response).
export async function requireAdmin(req: NextRequest): Promise<SessionPayload | null> {
  const session = await requireAuth(req)
  if (!session || session.role !== 'admin') return null
  return session
}
