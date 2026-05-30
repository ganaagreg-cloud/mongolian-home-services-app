import { Hono } from 'hono'
import { db, dbReady } from '../db'

const router = new Hono()

// GET /api/service-types — public, no auth required
router.get('/api/service-types', async (c) => {
  await dbReady
  const rows = (await db.query(
    `SELECT st.id, st.name_mn, st.icon, st.sort_order,
            COALESCE(pr.base_rate, 25000) AS base_rate
     FROM service_types st
     LEFT JOIN pricing_rules pr ON pr.service_type_id = st.id
     WHERE st.is_active = true ORDER BY st.sort_order`,
  )).rows as { id: number; name_mn: string; icon: string; sort_order: number; base_rate: number }[]

  return c.json({ success: true, data: rows })
})

export default router
