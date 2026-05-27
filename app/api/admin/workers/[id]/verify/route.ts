import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const { id } = await params
  const { action } = parsed.data

  await dbReady
  const worker = (await db.query('SELECT id FROM workers WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0]
  if (!worker) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  if (action === 'approve') {
    await db.query('UPDATE workers SET is_active = true WHERE id = $1', [id])
    await db.query(
      'UPDATE users SET is_worker = true WHERE id = (SELECT user_id FROM workers WHERE id = $1)',
      [id],
    )
  } else {
    await db.query('UPDATE workers SET rejected_at = NOW(), is_active = false WHERE id = $1', [id])
    await db.query(
      'UPDATE users SET is_worker = false WHERE id = (SELECT user_id FROM workers WHERE id = $1)',
      [id],
    )
  }

  return NextResponse.json({ success: true, data: undefined })
}
