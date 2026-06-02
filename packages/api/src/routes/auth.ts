import { Hono } from 'hono'
import { z } from 'zod'
import { scrypt, randomBytes, createHmac } from 'crypto'
import bcrypt from 'bcryptjs'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { mockDANVerification } from '../mocks/dan'
import type { UserRole } from '@homeservices/shared'

// Replicates @better-auth/utils password.node.mjs hashing so we can update
// Better Auth's account table and have signIn.email work after a PIN reset.
function hashForBetterAuth(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  return new Promise<string>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 67108864 },
      (err, key) => (err ? reject(err) : resolve(`${salt}:${key.toString('hex')}`)),
    )
  })
}

function createResetToken(phone: string): string {
  const exp = Date.now() + 15 * 60 * 1000
  const payload = `pin-reset.${phone}.${exp}`
  const sig = createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret').update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

function verifyResetToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const sep = decoded.lastIndexOf('|')
    if (sep < 0) return null
    const payload = decoded.slice(0, sep)
    const sig = decoded.slice(sep + 1)
    const expected = createHmac('sha256', process.env.JWT_SECRET ?? 'dev-secret').update(payload).digest('hex')
    if (sig !== expected) return null
    const parts = payload.split('.')
    if (parts.length !== 3 || parts[0] !== 'pin-reset') return null
    const phone = parts[1]!
    const exp = Number(parts[2])
    if (!phone || isNaN(exp) || Date.now() > exp) return null
    return phone
  } catch { return null }
}

const router = new Hono()

// GET /api/auth/me — bridges Better Auth session → our users table
router.get('/api/auth/me', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Unauthorized' }, 401)

  await dbReady
  const user = (await db.query(
    `SELECT id, name, phone, role, is_worker, active_mode, avatar_url
     FROM users WHERE id = $1`,
    [session.sub],
  )).rows[0] as {
    id: string; name: string; phone: string | null
    role: string; is_worker: boolean; active_mode: string; avatar_url: string
  } | undefined

  if (!user) return c.json({ success: false, error: 'User not found' }, 404)

  return c.json({
    success: true,
    data: {
      id:              user.id,
      name:            user.name,
      avatarUrl:       user.avatar_url,
      isWorker:        user.is_worker,
      activeMode:      user.active_mode,
      role:            user.role,
      needsOnboarding: !user.phone,
    },
  })
})

// GET /api/auth/dan — returns mock auth_url
router.get('/api/auth/dan', (c) => {
  const state   = crypto.randomUUID()
  const auth_url = `/api/auth/dan?code=mock-auth-code&state=${state}`
  return c.json({ success: true, data: { auth_url, state } })
})

const danSchema = z.object({
  phone: z.string().regex(/^\d{8}$/).optional(),
  code:  z.string().optional(),
})

// POST /api/auth/dan — DAN identity verification
router.post('/api/auth/dan', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch { body = {} }

  const parsed = danSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)

  const result = await mockDANVerification(parsed.data.phone ?? '')
  if (!result.success) {
    return c.json(
      { success: false, error: result.error ?? 'ДАН системтэй холбогдоход алдаа гарлаа.' },
      503,
    )
  }

  await dbReady

  const session = await requireAuth(c)
  if (session) {
    const user = (await db.query(
      'SELECT id, name FROM users WHERE id = $1',
      [session.sub],
    )).rows[0] as { id: string; name: string } | undefined

    if (!user) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

    await db.query('UPDATE users SET dan_verified = true, is_verified = true WHERE id = $1', [user.id])

    const { firstname = '', lastname = '', registernumber = '' } = result
    if (firstname || lastname || registernumber) {
      await db.query(
        'UPDATE users SET firstname = $1, lastname = $2, registernumber = $3 WHERE id = $4',
        [firstname, lastname, registernumber, user.id],
      )
    }
    return c.json({ success: true, data: { firstname, lastname, registernumber, fullName: user.name || result.fullName } })
  }

  // Not logged in: upsert by phone
  const phone = parsed.data.phone ?? String(90000000 + Math.floor(Math.random() * 9999999))
  const { firstname = '', lastname = '', registernumber = '' } = result

  let user = (await db.query(
    'SELECT id, phone, role FROM users WHERE phone = $1',
    [phone],
  )).rows[0] as { id: string; phone: string; role: string } | undefined

  if (!user) {
    const inserted = (await db.query(
      `INSERT INTO users (phone, name, firstname, lastname, registernumber, role, dan_verified, is_verified)
       VALUES ($1, $2, $3, $4, $5, 'user', true, true)
       RETURNING id`,
      [phone, result.fullName ?? '', firstname, lastname, registernumber],
    )).rows[0] as { id: string }
    user = { id: String(inserted.id), phone, role: 'user' as UserRole }
  } else {
    await db.query(
      'UPDATE users SET dan_verified = true, is_verified = true, firstname = $1, lastname = $2, registernumber = $3 WHERE id = $4',
      [firstname, lastname, registernumber, user.id],
    )
  }

  return c.json({ success: true, data: { firstname, lastname, registernumber, fullName: result.fullName } })
})

// ── Forgot-password flow ─────────────────────────────────────────────────────

const forgotSchema = z.object({
  phone: z.string().regex(/^[89]\d{7}$/),
})

// POST /api/auth/forgot-password — generate OTP and store in otp_codes.
// No session required; always returns success to prevent user enumeration.
router.post('/api/auth/forgot-password', async (c) => {
  try {
    const body = forgotSchema.parse(await c.req.json())
    await dbReady

    const user = (await db.query(
      'SELECT id FROM users WHERE phone = $1',
      [body.phone],
    )).rows[0] as { id: number } | undefined

    if (user) {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
      await db.query(
        `INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)
         ON CONFLICT (phone) DO UPDATE SET code = $2, expires_at = $3`,
        [body.phone, code, expiresAt],
      )
      // Dev mock — log OTP to server console only
      console.log(`[MOCK SMS] OTP code: ${code}`)
    }

    return c.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: 'Буруу дугаар' }, 400)
    return c.json({ error: 'Request failed' }, 500)
  }
})

const verifyOtpSchema = z.object({
  phone: z.string().regex(/^[89]\d{7}$/),
  code:  z.string().regex(/^\d{6}$/),
})

// POST /api/auth/verify-otp — verify OTP, return 15-min reset token.
// No session required.
router.post('/api/auth/verify-otp', async (c) => {
  try {
    const body = verifyOtpSchema.parse(await c.req.json())
    await dbReady

    const row = (await db.query(
      'SELECT code, expires_at FROM otp_codes WHERE phone = $1',
      [body.phone],
    )).rows[0] as { code: string; expires_at: Date } | undefined

    if (!row || new Date() > new Date(row.expires_at) || row.code !== body.code) {
      return c.json({ success: false, error: 'Код буруу эсвэл хугацаа дууссан' }, 400)
    }

    await db.query('DELETE FROM otp_codes WHERE phone = $1', [body.phone])

    const resetToken = createResetToken(body.phone)
    return c.json({ success: true, resetToken })
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: 'Буруу өгөгдөл' }, 400)
    return c.json({ error: 'Request failed' }, 500)
  }
})

const resetPinSchema = z.object({
  resetToken: z.string().min(1),
  pin:        z.string().min(8),
})

// POST /api/auth/reset-pin — hash new PIN with bcryptjs, update both tables.
// Auth via reset token (no session required).
router.post('/api/auth/reset-pin', async (c) => {
  try {
    const body = resetPinSchema.parse(await c.req.json())

    const phone = verifyResetToken(body.resetToken)
    if (!phone) return c.json({ success: false, error: 'Хүсэлт хугацаа дуусгавар болсон' }, 400)

    await dbReady

    const user = (await db.query(
      'SELECT id, better_auth_id FROM users WHERE phone = $1',
      [phone],
    )).rows[0] as { id: number; better_auth_id: string | null } | undefined

    if (!user) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

    // bcryptjs hash stored in our users table (as specified)
    const bcryptHash = await bcrypt.hash(body.pin, 12)
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [bcryptHash, user.id])

    // Matching Better Auth's scrypt format so signIn.email still works after reset
    if (user.better_auth_id) {
      const baHash = await hashForBetterAuth(body.pin)
      await db.query(
        `UPDATE account SET password = $1 WHERE user_id = $2 AND provider_id = 'credential'`,
        [baHash, user.better_auth_id],
      )
    }

    return c.json({ success: true })
  } catch (e) {
    if (e instanceof z.ZodError) return c.json({ error: 'Буруу өгөгдөл' }, 400)
    return c.json({ error: 'Request failed' }, 500)
  }
})

export default router
