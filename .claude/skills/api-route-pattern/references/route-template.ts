import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../auth'
import { db } from '../db'

// Step 1 — Zod schema defined at the top of the file
const BodySchema = z.object({
  resourceId: z.coerce.number().int().positive(),
  status: z.enum(['pending', 'active', 'completed']),
})

const router = new Hono()

router.post('/api/resources', async (c) => {
  try {
    // Step 1 — Validate input (ZodError → caught below → 400)
    const body = BodySchema.parse(await c.req.json())

    // Step 2 — Authenticate the caller (null → 401)
    const session = await requireAuth(c)
    if (!session) return c.json({ error: 'Request failed' }, 401)

    // Step 3 — Verify resource ownership
    const resource = await db.query(
      'SELECT user_id FROM resources WHERE id = $1 AND deleted_at IS NULL',
      [body.resourceId],
    )
    if (!resource.rows[0] || resource.rows[0].user_id !== Number(session.sub)) {
      return c.json({ error: 'Request failed' }, 403)
    }

    // Step 4 — Parameterized query only (never string concatenation)
    await db.query(
      'UPDATE resources SET status = $1, updated_at = NOW() WHERE id = $2',
      [body.status, body.resourceId],
    )

    return c.json({ success: true })

  } catch (e) {
    // Step 5 — Generic error only, never expose internals
    return c.json({ error: 'Request failed' }, 500)
  }
})

export default router
