import { Router } from 'express'
import { db, dbReady } from '../db'

const router = Router()

router.get('/service-types', async (_req, res) => {
  try {
    await dbReady
    const { rows } = await db.query(
      `SELECT id, name_mn, icon, sort_order
       FROM service_types WHERE is_active = true ORDER BY sort_order`,
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[service-types]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
