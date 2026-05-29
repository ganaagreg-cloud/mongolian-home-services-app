import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'

const router = new Hono()

const sosSchema = z.object({
  orderId:   z.string().optional(),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
})

function dispatchNotifications(alertId: number, role: string): void {
  void Promise.resolve().then(() => {
    console.log(`[SOS] Alert #${alertId} dispatched — role=${role}`)
  })
}

// POST /api/sos — must respond in < 2s. No blocking logic here.
router.post('/api/sos', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch { body = {} }

  const parsed = sosSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)

  const { orderId, latitude, longitude } = parsed.data

  await dbReady
  const result = (await db.query(`
    INSERT INTO sos_alerts (order_id, triggered_by_id, role, latitude, longitude, status)
    VALUES ($1, $2, $3, $4, $5, 'active')
    RETURNING id
  `, [
    orderId ? Number(orderId) : null,
    Number(session.sub),
    session.role,
    latitude ?? null,
    longitude ?? null,
  ])).rows[0] as { id: number }

  const alertId = Number(result.id)
  dispatchNotifications(alertId, session.role)

  return c.json({ success: true, data: { alertId } }, 201)
})

export default router
