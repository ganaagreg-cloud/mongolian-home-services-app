import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const WORKER_STATUSES = ['worker_on_the_way', 'in_progress', 'completed', 'cancelled_by_worker'] as const
const USER_STATUSES   = ['cancelled_by_user'] as const

const schema = z.object({
  status: z.enum([...WORKER_STATUSES, ...USER_STATUSES]),
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
  const { status } = parsed.data

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND deleted_at IS NULL',
    [session.sub],
  )).rows[0] as { id: string } | undefined
  const isWorker = !!workerRow

  if (!isWorker && status !== 'cancelled_by_user') {
    return NextResponse.json({ success: false, error: 'Зөвхөн ажилтан статус өөрчлөх боломжтой' }, { status: 403 })
  }

  if (isWorker && (USER_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ success: false, error: 'Зөвхөн захиалагч цуцлах боломжтой' }, { status: 403 })
  }

  if (isWorker && (status === 'in_progress' || status === 'completed')) {
    const photoRow = (await db.query(
      'SELECT before_photo_url, after_photo_url FROM orders WHERE id = $1',
      [id],
    )).rows[0] as { before_photo_url: string | null; after_photo_url: string | null } | undefined

    if (status === 'in_progress' && !photoRow?.before_photo_url) {
      return NextResponse.json(
        { success: false, error: 'Өмнөх зургаа оруулсны дараа ажил эхлүүлнэ үү' },
        { status: 422 },
      )
    }
    if (status === 'completed' && !photoRow?.after_photo_url) {
      return NextResponse.json(
        { success: false, error: 'Дараах зургаа оруулсны дараа ажлыг дуусгана уу' },
        { status: 422 },
      )
    }
  }

  const result = isWorker
    ? await db.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND worker_id = $3',
        [status, id, workerRow!.id],
      )
    : await db.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [status, id, session.sub],
      )

  if (!result.rowCount) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: undefined })
}
