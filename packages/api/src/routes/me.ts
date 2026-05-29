import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth, auth } from '../auth'
import { normalizePhone, validateMongolianPhone } from '@homeservices/shared'
import type { Worker } from '@homeservices/shared'

const router = new Hono()

const patchMeSchema = z.object({
  name:       z.string().min(2, 'Нэр 2-50 тэмдэгт байх ёстой').max(50).optional(),
  email:      z.string().email('Имэйл хаяг буруу байна').optional(),
  avatar_url: z.string().url('Зурагны URL буруу байна').optional(),
  phone:      z.string().optional(),
  password:   z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой').optional(),
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
  price_per_hour: number; rating: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
}

function toWorker(row: WorkerRow): Worker {
  return {
    id:           String(row.id),
    userId:       String(row.user_id),
    name:         row.name,
    specialty:    row.specialty,
    pricePerHour: row.price_per_hour,
    rating:       row.rating,
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
    'SELECT id, phone, name, email, avatar_url FROM users WHERE id = $1',
    [session.sub],
  )).rows[0] as { id: string; phone: string | null; name: string; email: string; avatar_url: string } | undefined

  if (!user) return c.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, 404)

  return c.json({
    success: true,
    data: {
      id:        String(user.id),
      phone:     user.phone ?? '',
      name:      user.name,
      email:     user.email,
      avatarUrl: user.avatar_url,
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

  const { name, email, avatar_url, phone: rawPhone, password } = parsed.data

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
  if (name !== undefined)            { sets.push(`name = $${idx++}`);       vals.push(name) }
  if (email !== undefined)           { sets.push(`email = $${idx++}`);      vals.push(email) }
  if (avatar_url !== undefined)      { sets.push(`avatar_url = $${idx++}`); vals.push(avatar_url) }
  if (normalizedPhone !== undefined) { sets.push(`phone = $${idx++}`);      vals.push(normalizedPhone) }
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
           w.rating, w.review_count, w.is_available, w.is_active,
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
