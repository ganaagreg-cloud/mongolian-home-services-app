import { Hono } from 'hono'
import { db, dbReady } from '../db'

const router = new Hono()

// GET /api/service-types — public, no auth required
router.get('/api/service-types', async (c) => {
  await dbReady
  const rows = (await db.query(
    `SELECT id, name_mn, icon, sort_order
     FROM service_types WHERE is_active = true ORDER BY sort_order`,
  )).rows as { id: number; name_mn: string; icon: string; sort_order: number }[]

  return c.json({ success: true, data: rows })
})

export default router
