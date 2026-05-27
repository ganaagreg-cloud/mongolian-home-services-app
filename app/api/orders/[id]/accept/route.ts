import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

// POST /api/orders/[id]/accept
// Called by a worker to express interest in a scheduled post.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }
  if (!session.is_worker) {
    return NextResponse.json({ success: false, error: 'Зөвхөн ажилтан хүлээж авах боломжтой' }, { status: 403 })
  }

  const { id } = await params

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: number } | undefined

  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Ажилтны бүртгэл олдсонгүй' }, { status: 404 })
  }

  const order = (await db.query(
    'SELECT id, status, user_id FROM orders WHERE id = $1',
    [id],
  )).rows[0] as { id: string; status: string; user_id: string } | undefined

  if (!order) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }
  if (String(order.user_id) === String(session.sub)) {
    return NextResponse.json({ success: false, error: 'Өөрийн захиалгаа авах боломжгүй' }, { status: 403 })
  }
  if (order.status !== 'pending_acceptances') {
    return NextResponse.json(
      { success: false, error: 'Энэ захиалга хүлээж авах боломжгүй' },
      { status: 409 },
    )
  }

  try {
    await db.query(
      'INSERT INTO order_acceptances (order_id, worker_id) VALUES ($1, $2) ON CONFLICT (order_id, worker_id) DO NOTHING',
      [id, workerRow.id],
    )
  } catch {
    return NextResponse.json({ success: false, error: 'Хүлээж авахад алдаа гарлаа' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: undefined }, { status: 201 })
}
