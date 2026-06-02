import { Hono } from 'hono'
import { db, dbReady } from '../db'
import { getSettings } from '../lib/settings'

const router = new Hono()

// GET /api/settings — public, no auth required
router.get('/api/settings', async (c) => {
  await dbReady
  const s = await getSettings(db)
  return c.json({
    success: true,
    data: {
      commission:          s.commission,
      late_cancel_fee:     s.late_cancel_fee,
      free_cancel_minutes: s.free_cancel_minutes,
      urgent_multiplier:   s.urgent_multiplier,
    },
  })
})

export default router
