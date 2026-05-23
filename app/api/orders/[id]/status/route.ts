import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  status: z.enum(['accepted', 'arriving', 'working', 'completed', 'cancelled']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Буруу статус' }, { status: 400 })
  }

  const { id } = await params

  // Worker can update their own orders; users can only cancel
  const workerRow = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(session.sub) as { id: string } | undefined
  const isWorker = !!workerRow

  if (!isWorker && parsed.data.status !== 'cancelled') {
    return NextResponse.json({ success: false, error: 'Зөвхөн ажилтан статус өөрчлөх боломжтой' }, { status: 403 })
  }

  const result = isWorker
    ? db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND worker_id = ?`)
        .run(parsed.data.status, id, workerRow!.id)
    : db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`)
        .run(parsed.data.status, id, session.sub)

  if (result.changes === 0) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: undefined })
}
