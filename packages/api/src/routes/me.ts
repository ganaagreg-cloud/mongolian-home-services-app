import { Hono } from 'hono'
import { z } from 'zod'
import { randomInt } from 'crypto'
import { db, dbReady } from '../db'
import { requireAuth, auth, hashOtp } from '../auth'
import { logAudit } from '../lib/audit'
import { normalizePhone, validateMongolianPhone } from '@homeservices/shared'
import type { Worker } from '@homeservices/shared'

const router = new Hono()

const patchMeSchema = z.object({
  name:                  z.string().min(2, 'Нэр 2-100 тэмдэгт байх ёстой').max(100).optional(),
  email:                 z.string().email('Имэйл хаяг буруу байна').max(200).optional(),
  avatar_url:            z.string().url('Зурагны URL буруу байна').optional(),
  phone:                 z.string().regex(/^[89]\d{7}$/, 'Монгол дугаар (8 оронт) оруулна уу').optional(),
  password:              z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой').max(128).optional(),
  markNotificationsRead: z.boolean().optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: 'Хамгийн багадаа нэг талбар шаардлагатай' },
)

const modePatchSchema = z.object({ mode: z.enum(['user', 'worker']) })

const savedWorkerPostSchema = z.object({
  worker_id: z.number().int().positive(),
})

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  price_per_hour: number; rating_sum: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
}

function toWorker(row: WorkerRow): Worker {
  return {
    id:           String(row.id),
    userId:       String(row.user_id),
    name:         row.name,
    specialty:    row.specialty,
    pricePerHour: row.price_per_hour,
    rating:       row.review_count > 0 ? Math.round(row.rating_sum / row.review_count * 10) / 10 : 0,
    reviewCount:  row.review_count,
    isAvailable:  Boolean(row.is_available),
    isActive:     Boolean(row.is_active),
    danVerified:  Boolean(row.dan_verified),
    createdAt:    row.created_at,
  }
}

// GET /api/me
router.get('/api/me', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const user = (await db.query(
    'SELECT id, phone, name, email, avatar_url, phone_verified, email_verified, google_id, better_auth_id FROM users WHERE id = $1',
    [session.sub],
  )).rows[0] as {
    id: string; phone: string | null; name: string; email: string; avatar_url: string
    phone_verified: boolean; email_verified: boolean; google_id: string | null
    better_auth_id: string | null
  } | undefined

  if (!user) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

  let twoFactorEnabled = false
  if (user.better_auth_id) {
    const baRow = (await db.query(
      `SELECT "twoFactorEnabled" FROM "user" WHERE id = $1`,
      [user.better_auth_id],
    )).rows[0] as { twoFactorEnabled: boolean } | undefined
    twoFactorEnabled = baRow?.twoFactorEnabled ?? false
  }

  return c.json({
    success: true,
    data: {
      id:               String(user.id),
      phone:            user.phone ?? '',
      name:             user.name,
      email:            user.email,
      avatarUrl:        user.avatar_url,
      phoneVerified:    user.phone_verified,
      emailVerified:    user.email_verified,
      isGoogleOAuth:    user.google_id !== null,
      twoFactorEnabled,
    },
  })
})

// PATCH /api/me
router.patch('/api/me', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = patchMeSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const { name, email, avatar_url, phone: rawPhone, password, markNotificationsRead } = parsed.data

  let normalizedPhone: string | undefined
  if (rawPhone !== undefined) {
    normalizedPhone = normalizePhone(rawPhone)
    if (!validateMongolianPhone(normalizedPhone)) {
      return c.json({ success: false, error: 'Утасны дугаар буруу байна' }, 400)
    }
  }

  await dbReady

  if (email !== undefined) {
    const conflict = (await db.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2 AND email != ''`,
      [email, session.sub],
    )).rows[0]
    if (conflict) {
      return c.json({ success: false, error: 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй' }, 409)
    }
  }

  if (normalizedPhone !== undefined) {
    const conflict = (await db.query(
      `SELECT id FROM users WHERE phone = $1 AND id != $2`,
      [normalizedPhone, session.sub],
    )).rows[0]
    if (conflict) {
      return c.json({ success: false, error: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй' }, 409)
    }
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1
  if (name !== undefined)            { sets.push(`name = $${idx++}`);                vals.push(name) }
  if (email !== undefined)           { sets.push(`email = $${idx++}`);               vals.push(email) }
  if (avatar_url !== undefined)      { sets.push(`avatar_url = $${idx++}`);          vals.push(avatar_url) }
  if (normalizedPhone !== undefined) { sets.push(`phone = $${idx++}`);               vals.push(normalizedPhone) }
  if (markNotificationsRead === true){ sets.push('notifications_read_at = NOW()') }
  vals.push(session.sub)

  if (sets.length > 0) {
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, vals)
  }

  if (password !== undefined) {
    try {
      await auth.api.setPassword({
        body:    { newPassword: password },
        headers: c.req.raw.headers,
      })
    } catch {
      return c.json({ success: false, error: 'Нууц үг тохируулахад алдаа гарлаа' }, 500)
    }
  }

  return c.json({ success: true, data: undefined })
})

// PATCH /api/me/mode
router.patch('/api/me/mode', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = modePatchSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const { mode } = parsed.data

  await dbReady

  if (mode === 'worker' && !session.is_worker) {
    return c.json({ success: false, error: 'Та ажилтан биш байна' }, 403)
  }

  await db.query('UPDATE users SET active_mode = $1 WHERE id = $2', [mode, session.sub])

  return c.json({ success: true, data: { activeMode: mode } })
})

// GET /api/me/saved-workers
router.get('/api/me/saved-workers', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const rows = (await db.query(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating_sum, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   saved_workers sw
    JOIN   workers w ON w.id = sw.worker_id AND w.rejected_at IS NULL
    JOIN   users   u ON u.id = w.user_id
    WHERE  sw.user_id = $1
    ORDER  BY sw.created_at DESC
  `, [session.sub])).rows as WorkerRow[]

  return c.json({ success: true, data: rows.map(toWorker) })
})

// POST /api/me/saved-workers
router.post('/api/me/saved-workers', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = savedWorkerPostSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const worker = (await db.query(
    'SELECT id FROM workers WHERE id = $1 AND rejected_at IS NULL',
    [parsed.data.worker_id],
  )).rows[0]

  if (!worker) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  await db.query(
    'INSERT INTO saved_workers (user_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [session.sub, parsed.data.worker_id],
  )

  return c.json({ success: true, data: undefined }, 201)
})

// ── Contact verification ─────────────────────────────────────────────────────

const sendVerifyOtpSchema = z.object({
  type: z.enum(['phone', 'email']),
})

// POST /api/me/send-verify-otp — send OTP to verified phone or email
router.post('/api/me/send-verify-otp', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }
  const parsed = sendVerifyOtpSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }, 400)
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  try {
    const user = (await db.query(
      'SELECT phone, email FROM users WHERE id = $1',
      [session.sub],
    )).rows[0] as { phone: string | null; email: string } | undefined

    if (!user) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    if (parsed.data.type === 'phone') {
      if (!user.phone) return c.json({ success: false, error: 'Утасны дугаар бүртгэлгүй байна' }, 400)

      const lastIssue = (await db.query(
        'SELECT issued_at FROM otp_codes WHERE phone = $1',
        [user.phone],
      )).rows[0] as { issued_at: Date } | undefined
      if (lastIssue && Date.now() - new Date(lastIssue.issued_at).getTime() < 60_000) {
        return c.json({ success: false, error: 'Хэт олон хүсэлт гаргасан байна. 60 секунд хүлээнэ үү.' }, 429)
      }

      const code = String(randomInt(100000, 1000000))
      await db.query(
        `INSERT INTO otp_codes (phone, code, attempts, issued_at, expires_at)
         VALUES ($1, $2, 0, NOW(), $3)
         ON CONFLICT (phone) DO UPDATE SET code = $2, attempts = 0, issued_at = NOW(), expires_at = $3`,
        [user.phone, hashOtp(code), expiresAt],
      )
      if (process.env.NODE_ENV !== 'production') console.log(`[MOCK SMS] Contact verify OTP: ${code}`)
    } else {
      if (!user.email) return c.json({ success: false, error: 'Имэйл хаяг бүртгэлгүй байна' }, 400)

      const lastIssue = (await db.query(
        'SELECT issued_at FROM email_otp_codes WHERE email = $1',
        [user.email],
      )).rows[0] as { issued_at: Date } | undefined
      if (lastIssue && Date.now() - new Date(lastIssue.issued_at).getTime() < 60_000) {
        return c.json({ success: false, error: 'Хэт олон хүсэлт гаргасан байна. 60 секунд хүлээнэ үү.' }, 429)
      }

      const code = String(randomInt(100000, 1000000))
      await db.query(
        `INSERT INTO email_otp_codes (email, code, attempts, issued_at, expires_at)
         VALUES ($1, $2, 0, NOW(), $3)
         ON CONFLICT (email) DO UPDATE SET code = $2, attempts = 0, issued_at = NOW(), expires_at = $3`,
        [user.email, hashOtp(code), expiresAt],
      )
      if (process.env.NODE_ENV !== 'production') console.log(`[MOCK EMAIL] Contact verify OTP: ${code}`)
    }

    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Request failed' }, 500)
  }
})

const verifyContactSchema = z.object({
  type: z.enum(['phone', 'email']),
  code: z.string().regex(/^\d{6}$/),
})

// PATCH /api/me/verify-contact — validate OTP and set phone_verified / email_verified
router.patch('/api/me/verify-contact', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }
  const parsed = verifyContactSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }, 400)
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  try {
    const user = (await db.query(
      'SELECT phone, email FROM users WHERE id = $1',
      [session.sub],
    )).rows[0] as { phone: string | null; email: string } | undefined

    if (!user) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

    if (parsed.data.type === 'phone') {
      if (!user.phone) return c.json({ success: false, error: 'Утасны дугаар бүртгэлгүй байна' }, 400)

      const row = (await db.query(
        'SELECT code, attempts, expires_at FROM otp_codes WHERE phone = $1',
        [user.phone],
      )).rows[0] as { code: string; attempts: number; expires_at: Date } | undefined

      if (!row || new Date() > new Date(row.expires_at)) {
        return c.json({ success: false, error: 'Код буруу эсвэл хугацаа дууссан' }, 400)
      }
      if (row.attempts >= 5) {
        return c.json({ success: false, error: 'Хэт олон оролдлого хийлээ. Шинэ код авна уу.' }, 429)
      }
      if (row.code !== hashOtp(parsed.data.code)) {
        await db.query('UPDATE otp_codes SET attempts = attempts + 1 WHERE phone = $1', [user.phone])
        return c.json({ success: false, error: 'Код буруу эсвэл хугацаа дууссан' }, 400)
      }

      await db.query('DELETE FROM otp_codes WHERE phone = $1', [user.phone])
      await db.query('UPDATE users SET phone_verified = true WHERE id = $1', [session.sub])
    } else {
      if (!user.email) return c.json({ success: false, error: 'Имэйл хаяг бүртгэлгүй байна' }, 400)

      const row = (await db.query(
        'SELECT code, attempts, expires_at FROM email_otp_codes WHERE email = $1',
        [user.email],
      )).rows[0] as { code: string; attempts: number; expires_at: Date } | undefined

      if (!row || new Date() > new Date(row.expires_at)) {
        return c.json({ success: false, error: 'Код буруу эсвэл хугацаа дууссан' }, 400)
      }
      if (row.attempts >= 5) {
        return c.json({ success: false, error: 'Хэт олон оролдлого хийлээ. Шинэ код авна уу.' }, 429)
      }
      if (row.code !== hashOtp(parsed.data.code)) {
        await db.query('UPDATE email_otp_codes SET attempts = attempts + 1 WHERE email = $1', [user.email])
        return c.json({ success: false, error: 'Код буруу эсвэл хугацаа дууссан' }, 400)
      }

      await db.query('DELETE FROM email_otp_codes WHERE email = $1', [user.email])
      await db.query('UPDATE users SET email_verified = true WHERE id = $1', [session.sub])
    }

    return c.json({ success: true })
  } catch {
    return c.json({ error: 'Request failed' }, 500)
  }
})

// ── PDPL subject-access + erasure ────────────────────────────────────────────

// GET /api/me/export — returns all rows owned by the authenticated user.
// Every query is filtered by session.sub — no other user's data is accessible.
router.get('/api/me/export', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const uid = Number(session.sub)
  await dbReady

  try {
    const [profile, orders, reviews, messages, disputes, savedWorkers, notifications, paymentIntents] =
      await Promise.all([
        db.query(
          `SELECT id, name, phone, email, avatar_url,
                  firstname, lastname, registernumber,
                  role, is_worker, active_mode,
                  dan_verified, is_verified,
                  phone_verified, email_verified,
                  created_at
           FROM users WHERE id = $1`,
          [uid],
        ),
        db.query(
          `SELECT id, service_type_id, status, address, scheduled_date,
                  hours, total_amount, urgent, rooms, area_sqm, property_type,
                  notes, matching_strategy, payment_status, survey_details,
                  before_photo_url, after_photo_url, created_at, updated_at
           FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
          [uid],
        ),
        // Reviews are authored by the user (no user_id column — linked via order)
        db.query(
          `SELECT r.id, r.order_id, r.rating, r.comment, r.created_at
           FROM reviews r
           JOIN orders o ON o.id = r.order_id
           WHERE o.user_id = $1
           ORDER BY r.created_at DESC`,
          [uid],
        ),
        // All messages in the user's orders (both sides of conversation)
        db.query(
          `SELECT m.id, m.order_id, m.sender_id, m.text, m.created_at
           FROM messages m
           JOIN orders o ON o.id = m.order_id
           WHERE o.user_id = $1
           ORDER BY m.created_at DESC`,
          [uid],
        ),
        db.query(
          `SELECT d.id, d.order_id, d.issue, d.status, d.compensation_amount,
                  d.photo_urls, d.created_at, d.updated_at
           FROM disputes d
           JOIN orders o ON o.id = d.order_id
           WHERE o.user_id = $1
           ORDER BY d.created_at DESC`,
          [uid],
        ),
        db.query(
          `SELECT sw.worker_id, sw.created_at
           FROM saved_workers sw
           WHERE sw.user_id = $1
           ORDER BY sw.created_at DESC`,
          [uid],
        ),
        db.query(
          `SELECT id, type, metadata, created_at
           FROM notifications WHERE user_id = $1
           ORDER BY created_at DESC`,
          [uid],
        ),
        db.query(
          `SELECT id, paid_at, created_at
           FROM payment_intents WHERE user_id = $1
           ORDER BY created_at DESC`,
          [uid],
        ),
      ])

    await logAudit(uid, 'pdpl_export', {
      ip: c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    })

    return c.json({
      success: true,
      data: {
        exportedAt:     new Date().toISOString(),
        profile:        profile.rows[0] ?? null,
        orders:         orders.rows,
        reviews:        reviews.rows,
        messages:       messages.rows,
        disputes:       disputes.rows,
        savedWorkers:   savedWorkers.rows,
        notifications:  notifications.rows,
        paymentIntents: paymentIntents.rows,
      },
    })
  } catch {
    return c.json({ error: 'Request failed' }, 500)
  }
})

// Non-terminal order statuses — any of these blocks account deletion
const ACTIVE_ORDER_STATUSES = [
  'pending_acceptances', 'awaiting_payment', 'searching_worker',
  'pending_worker_acceptance', 'pending_payment', 'matched',
  'worker_accepted', 'worker_on_the_way', 'in_progress',
  'quote_submitted', 'quote_approved',
] as const

// POST /api/me/delete — soft-delete + anonymize.
// Rows with settled payments are NEVER hard-deleted (financial/legal retention).
router.post('/api/me/delete', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const uid = Number(session.sub)
  await dbReady

  try {
    // ── Blocking checks ───────────────────────────────────────────────────────

    const openOrder = (await db.query(
      `SELECT id, status FROM orders WHERE user_id = $1
       AND status = ANY($2::text[]) LIMIT 1`,
      [uid, ACTIVE_ORDER_STATUSES],
    )).rows[0] as { id: string; status: string } | undefined

    if (openOrder) {
      return c.json({
        success: false,
        error:  'Идэвхтэй захиалга байна. Данс устгахын өмнө бүх захиалгаа дуусгана уу.',
        reason: 'open_order',
      }, 409)
    }

    const openDispute = (await db.query(
      `SELECT d.id FROM disputes d
       JOIN orders o ON o.id = d.order_id
       WHERE o.user_id = $1 AND d.status NOT IN ('resolved','rejected')
       LIMIT 1`,
      [uid],
    )).rows[0] as { id: string } | undefined

    if (openDispute) {
      return c.json({
        success: false,
        error:  'Шийдвэрлэгдээгүй гомдол байна. Данс устгахын өмнө гомдлоо шийдвэрлүүлнэ үү.',
        reason: 'open_dispute',
      }, 409)
    }

    // A paid payment_intent that was not consumed by order creation means
    // money is sitting in escrow — block until it resolves.
    const openEscrow = (await db.query(
      `SELECT id FROM payment_intents WHERE user_id = $1 AND paid_at IS NOT NULL LIMIT 1`,
      [uid],
    )).rows[0] as { id: string } | undefined

    if (openEscrow) {
      return c.json({
        success: false,
        error:  'Шийдвэрлэгдээгүй эскро төлбөр байна. Данс устгахын өмнө төлбөрийн асуудлаа шийдвэрлүүлнэ үү.',
        reason: 'unsettled_escrow',
      }, 409)
    }

    // ── Capture identifiers before nulling them ───────────────────────────────

    const userRow = (await db.query(
      'SELECT better_auth_id, phone, email FROM users WHERE id = $1',
      [uid],
    )).rows[0] as { better_auth_id: string | null; phone: string | null; email: string } | undefined

    if (!userRow) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

    // ── Erasure — PII nulled, financial rows retained ─────────────────────────

    // Profile: null all PII; deleted_at marks soft-deletion
    await db.query(
      `UPDATE users SET
         deleted_at          = NOW(),
         name                = '[deleted]',
         phone               = NULL,
         email               = '',
         avatar_url          = '',
         firstname           = '',
         lastname            = '',
         registernumber      = '',
         google_id           = NULL,
         facebook_id         = NULL,
         better_auth_id      = NULL,
         failed_login_attempts = 0,
         locked_until        = NULL
       WHERE id = $1`,
      [uid],
    )

    // Orders: anonymize address/notes; retain amounts, dates, statuses for escrow audit
    await db.query(
      `UPDATE orders SET address = '[deleted]', notes = NULL, survey_details = NULL WHERE user_id = $1`,
      [uid],
    )

    // Messages the user sent: anonymize text
    await db.query(`UPDATE messages SET text = '[deleted]' WHERE sender_id = $1`, [uid])

    // Preference data: no financial value, hard-delete
    await db.query('DELETE FROM saved_workers WHERE user_id = $1', [uid])

    if (userRow.phone) {
      await db.query('DELETE FROM otp_codes WHERE phone = $1', [userRow.phone])
    }
    if (userRow.email && userRow.email !== '') {
      await db.query('DELETE FROM email_otp_codes WHERE email = $1', [userRow.email])
    }

    // Better Auth records: remove credential/OAuth links so re-login is impossible;
    // anonymize the BA user row; invalidate all sessions
    if (userRow.better_auth_id) {
      await db.query('DELETE FROM session WHERE "userId" = $1', [userRow.better_auth_id])
      await db.query('DELETE FROM account WHERE "userId" = $1', [userRow.better_auth_id])
      await db.query(
        `UPDATE "user" SET name = '[deleted]', email = CONCAT('[deleted-', id, ']@deleted'), image = NULL
         WHERE id = $1`,
        [userRow.better_auth_id],
      )
    }

    await logAudit(uid, 'pdpl_erasure', {
      reason:   'user_request',
      retained: 'orders, transactions, reviews, messages retained for financial/legal audit (PDPL Art.16)',
      ip:       c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    })

    return c.json({ success: true, data: { deletedAt: new Date().toISOString() } })
  } catch {
    return c.json({ error: 'Request failed' }, 500)
  }
})

// DELETE /api/me/saved-workers/:worker_id
router.delete('/api/me/saved-workers/:worker_id', async (c) => {
  const rawId = c.req.param('worker_id')
  const workerIdNum = Number(rawId)
  if (!Number.isInteger(workerIdNum) || workerIdNum <= 0) {
    return c.json({ success: false, error: 'Буруу ажилтны ID' }, 400)
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  await db.query(
    'DELETE FROM saved_workers WHERE user_id = $1 AND worker_id = $2',
    [session.sub, workerIdNum],
  )

  return c.json({ success: true, data: undefined })
})

export default router
