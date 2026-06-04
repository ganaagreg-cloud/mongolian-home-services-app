import { Hono } from 'hono'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { renderNotification } from '../lib/notifications'
import type { NotificationType, NotificationMeta, Notification } from '@homeservices/shared'

const router = new Hono()

type NotificationRow = {
  id: number
  user_id: number
  type: string
  metadata: unknown
  created_at: string
}

// GET /api/notifications?before=<ISO timestamp>
// Returns up to 50 notifications newest-first. `before` is a cursor (exclusive).
router.get('/api/notifications', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const rawBefore = c.req.query('before')
  let beforeTs: Date | null = null
  if (rawBefore !== undefined) {
    beforeTs = new Date(rawBefore)
    if (isNaN(beforeTs.getTime())) {
      return c.json({ success: false, error: 'Буруу cursor' }, 400)
    }
  }

  await dbReady

  try {
    const rows = (await db.query<NotificationRow>(
      `SELECT id, user_id, type, metadata, created_at
       FROM notifications
       WHERE user_id = $1
         AND ($2::timestamptz IS NULL OR created_at < $2)
       ORDER BY created_at DESC
       LIMIT 50`,
      [session.sub, beforeTs?.toISOString() ?? null],
    )).rows

    const data: Notification[] = rows.flatMap((row) => {
      try {
        const input = { type: row.type as NotificationType, metadata: row.metadata } as {
          [T in NotificationType]: { type: T; metadata: NotificationMeta[T] }
        }[NotificationType]
        const { title, body } = renderNotification(input)
        return [{
          id: String(row.id),
          userId: String(row.user_id),
          type: row.type as NotificationType,
          metadata: row.metadata as NotificationMeta[NotificationType],
          createdAt: row.created_at,
          title,
          body,
        } as Notification]
      } catch {
        return []
      }
    })

    return c.json({ success: true, data, hasMore: rows.length === 50 })
  } catch {
    return c.json({ success: false, error: 'Request failed' }, 500)
  }
})

// GET /api/notifications/badge — unread count via watermark
router.get('/api/notifications/badge', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  try {
    const userRow = (await db.query<{ notifications_read_at: string | null }>(
      'SELECT notifications_read_at FROM users WHERE id = $1',
      [session.sub],
    )).rows[0]

    const watermark = userRow?.notifications_read_at ?? null

    const countRow = (await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM notifications
       WHERE user_id = $1
         AND ($2::timestamptz IS NULL OR created_at > $2)`,
      [session.sub, watermark],
    )).rows[0]

    return c.json({ success: true, data: { count: parseInt(countRow?.count ?? '0', 10) } })
  } catch {
    return c.json({ success: false, error: 'Request failed' }, 500)
  }
})

export default router
