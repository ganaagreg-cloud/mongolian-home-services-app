import { Router } from 'express'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'

const router = Router()

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

// POST /api/sos — must respond in < 2s
router.post('/sos', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = sosSchema.safeParse(req.body ?? {})
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Буруу өгөгдөл' }); return }

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

    res.status(201).json({ success: true, data: { alertId } })
  } catch (err) {
    console.error('[sos POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
