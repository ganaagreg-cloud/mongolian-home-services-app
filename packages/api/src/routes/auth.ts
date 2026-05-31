import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { mockDANVerification } from '../mocks/dan'
import type { UserRole } from '@homeservices/shared'

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

  const screen =
    !user.phone       ? 'oauth-onboarding' :
    user.role === 'admin' ? 'admin' :
    (user.is_worker && user.active_mode === 'worker') ? 'worker-jobs' :
    'home'

  return c.json({
    success: true,
    data: {
      id:         user.id,
      name:       user.name,
      avatarUrl:  user.avatar_url,
      isWorker:   user.is_worker,
      activeMode: user.active_mode,
      screen,
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

export default router
