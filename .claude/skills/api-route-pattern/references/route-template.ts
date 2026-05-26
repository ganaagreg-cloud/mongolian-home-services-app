import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import db from '@/lib/db'

// Step 1 — Zod schema defined at the top of the file
const BodySchema = z.object({
  resourceId: z.coerce.number().int().positive(),
  status: z.enum(['pending', 'active', 'completed']),
})

export async function POST(req: NextRequest) {
  try {
    // Step 1 — Validate input (ZodError → caught below → 400)
    const body = BodySchema.parse(await req.json())

    // Step 2 — Authenticate the caller (throws 401 if invalid)
    const { userId, role } = await requireAuth(req)

    // Step 3 — Verify resource ownership
    const resource = await db.query(
      'SELECT user_id FROM resources WHERE id = $1 AND deleted_at IS NULL',
      [body.resourceId]
    )
    if (!resource.rows[0] || resource.rows[0].user_id !== userId) {
      return Response.json({ error: 'Request failed' }, { status: 403 })
    }

    // Step 4 — Parameterized query only (never string concatenation)
    await db.query(
      'UPDATE resources SET status = $1, updated_at = NOW() WHERE id = $2',
      [body.status, body.resourceId]
    )

    return Response.json({ success: true })

  } catch (e) {
    // Step 5 — Generic error only, never expose internals
    return Response.json({ error: 'Request failed' }, { status: 500 })
  }
}
