import { Router } from 'express'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth, auth } from '../auth'
import { normalizePhone, validateMongolianPhone } from '@homeservices/shared'

const router = Router()

const patchSchema = z.object({
  name:       z.string().min(2).max(50).optional(),
  email:      z.string().email().optional(),
  avatar_url: z.string().url().optional(),
  phone:      z.string().optional(),
  password:   z.string().min(8).optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
  { message: 'Хамгийн багадаа нэг талбар шаардлагатай' },
)

// GET /api/me
router.get('/me', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const user = (await db.query(
      'SELECT id, phone, name, email, avatar_url FROM users WHERE id = $1',
      [session.sub],
    )).rows[0] as { id: string; phone: string | null; name: string; email: string; avatar_url: string } | undefined

    if (!user) { res.status(404).json({ success: false, error: 'Хэрэглэгч олдсонгүй' }); return }
    res.json({ success: true, data: { id: String(user.id), phone: user.phone ?? '', name: user.name, email: user.email, avatarUrl: user.avatar_url } })
  } catch (err) {
    console.error('[me GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/me
router.patch('/me', async (req, res) => {
  try {
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const { name, email, avatar_url, phone: rawPhone, password } = parsed.data
    let normalizedPhone: string | undefined
    if (rawPhone !== undefined) {
      normalizedPhone = normalizePhone(rawPhone)
      if (!validateMongolianPhone(normalizedPhone)) {
        res.status(400).json({ success: false, error: 'Утасны дугаар буруу байна' }); return
      }
    }

    await dbReady

    if (email !== undefined) {
      const conflict = (await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2 AND email != ''`,
        [email, session.sub],
      )).rows[0]
      if (conflict) { res.status(409).json({ success: false, error: 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй' }); return }
    }

    if (normalizedPhone !== undefined) {
      const conflict = (await db.query(
        `SELECT id FROM users WHERE phone = $1 AND id != $2`,
        [normalizedPhone, session.sub],
      )).rows[0]
      if (conflict) { res.status(409).json({ success: false, error: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй' }); return }
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
          headers: new Headers({ cookie: req.headers.cookie ?? '' }),
        })
      } catch {
        res.status(500).json({ success: false, error: 'Нууц үг тохируулахад алдаа гарлаа' }); return
      }
    }

    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[me PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/me/mode
router.patch('/me/mode', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ mode: z.enum(['user', 'worker']) }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    const { mode } = parsed.data
    if (mode === 'worker' && !session.is_worker) {
      res.status(403).json({ success: false, error: 'Та ажилтан биш байна' }); return
    }

    await dbReady
    await db.query('UPDATE users SET active_mode = $1 WHERE id = $2', [mode, session.sub])
    res.json({ success: true, data: { activeMode: mode } })
  } catch (err) {
    console.error('[me/mode PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/me/saved-workers
router.get('/me/saved-workers', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

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
    `, [session.sub])).rows

    res.json({ success: true, data: rows.map((r) => ({
      id: String(r.id), userId: String(r.user_id), name: r.name,
      specialty: r.specialty, pricePerHour: r.price_per_hour,
      rating: r.rating, reviewCount: r.review_count,
      isAvailable: Boolean(r.is_available), isActive: Boolean(r.is_active),
      danVerified: Boolean(r.dan_verified), createdAt: r.created_at,
    })) })
  } catch (err) {
    console.error('[me/saved-workers GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/me/saved-workers
router.post('/me/saved-workers', async (req, res) => {
  try {
    const parsed = z.object({ worker_id: z.number().int().positive() }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const worker = (await db.query('SELECT id FROM workers WHERE id = $1 AND rejected_at IS NULL', [parsed.data.worker_id])).rows[0]
    if (!worker) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }

    await db.query(
      'INSERT INTO saved_workers (user_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [session.sub, parsed.data.worker_id],
    )
    res.status(201).json({ success: true, data: undefined })
  } catch (err) {
    console.error('[me/saved-workers POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE /api/me/saved-workers/:worker_id
router.delete('/me/saved-workers/:worker_id', async (req, res) => {
  try {
    const paramParsed = z.object({ worker_id: z.coerce.number().int().positive() }).safeParse(req.params)
    if (!paramParsed.success) { res.status(400).json({ success: false, error: 'Буруу ажилтны ID' }); return }

    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    await db.query(
      'DELETE FROM saved_workers WHERE user_id = $1 AND worker_id = $2',
      [session.sub, paramParsed.data.worker_id],
    )
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[me/saved-workers/:worker_id DELETE]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
