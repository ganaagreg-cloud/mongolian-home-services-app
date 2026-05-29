import { Router } from 'express'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'

const router = Router()

// GET /api/auth/me
router.get('/auth/me', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Unauthorized' }); return }

    await dbReady
    const user = (await db.query(
      `SELECT id, phone, name, username, first_name, last_name, email,
              role, is_worker, active_mode, avatar_url
       FROM users WHERE id = $1`,
      [session.sub],
    )).rows[0] as {
      id: string; phone: string | null; name: string; username: string
      first_name: string; last_name: string; email: string
      role: string; is_worker: boolean; active_mode: string; avatar_url: string
    } | undefined

    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return }

    res.json({
      success: true,
      data: {
        id:         user.id,
        phone:      user.phone ?? '',
        name:       user.name,
        username:   user.username,
        firstName:  user.first_name,
        lastName:   user.last_name,
        email:      user.email,
        role:       user.role,
        isWorker:   user.is_worker,
        activeMode: user.active_mode,
        avatarUrl:  user.avatar_url,
      },
    })
  } catch (err) {
    console.error('[auth/me GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
