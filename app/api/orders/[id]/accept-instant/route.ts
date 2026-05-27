import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/orders/[id]/accept-instant
// Worker accepts an instant offer. Sets status to worker_assigned.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND deleted_at IS NULL',
    [session.sub],
  )).rows[0] as { id: number } | undefined

  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Зөвхөн ажилтан хүлээж авах боломжтой' }, { status: 403 })
  }

  const { id } = await params

  const order = (await db.query(
    `SELECT id, status, user_id FROM orders WHERE id = $1 AND worker_id = $2 AND status = 'pending_worker_acceptance'`,
    [id, workerRow.id],
  )).rows[0] as { id: string; status: string; user_id: string } | undefined

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Захиалга олдсонгүй эсвэл хүлээгдэж буй байдалд биш байна' },
      { status: 404 },
    )
  }
  if (String(order.user_id) === String(session.sub)) {
    return NextResponse.json({ success: false, error: 'Өөрийн захиалгаа авах боломжгүй' }, { status: 403 })
  }

  await db.query(
    `UPDATE order_match_attempts SET status = 'accepted', responded_at = NOW()
     WHERE order_id = $1 AND worker_id = $2 AND status = 'offered'`,
    [id, workerRow.id],
  )
  await db.query(
    `UPDATE orders SET status = 'worker_assigned', updated_at = NOW() WHERE id = $1`,
    [id],
  )

  return NextResponse.json({ success: true, data: undefined })
}
