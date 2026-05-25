import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type WorkerMatchRow = {
  id: number
  name: string
  specialty: string
  price_per_hour: number
  rating: number
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const { id } = await params

  await dbReady

  const order = (await db.query(
    'SELECT id, status, matching_strategy FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string; status: string; matching_strategy: string } | undefined

  if (!order) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }
  if (order.status !== 'searching_worker' && order.status !== 'pending_worker_acceptance') {
    return NextResponse.json(
      { success: false, error: 'Энэ захиалга аль хэдийн боловсруулагдсан' },
      { status: 409 },
    )
  }

  if (order.status === 'pending_worker_acceptance') {
    const stale = (await db.query(
      `SELECT id, offered_at FROM order_match_attempts
       WHERE order_id = $1 AND status = 'offered'
       ORDER BY offered_at DESC LIMIT 1`,
      [id],
    )).rows[0] as { id: number; offered_at: string } | undefined

    if (stale) {
      const ageMs = Date.now() - new Date(stale.offered_at).getTime()
      if (ageMs < 70_000) {
        return NextResponse.json(
          { success: false, error: 'Ажилтан хариу өгөхийг хүлээж байна' },
          { status: 409 },
        )
      }
      await db.query(
        `UPDATE order_match_attempts SET status = 'timeout', responded_at = NOW() WHERE id = $1`,
        [stale.id],
      )
      await db.query(
        `UPDATE orders SET worker_id = NULL, status = 'searching_worker', updated_at = NOW() WHERE id = $1`,
        [id],
      )
    }
  }

  const countRow = (await db.query(
    `SELECT COUNT(*) as cnt FROM order_match_attempts WHERE order_id = $1 AND status != 'offered'`,
    [id],
  )).rows[0] as { cnt: string }
  const completedCount = Number(countRow.cnt)

  if (completedCount >= 5) {
    await db.query(
      `UPDATE orders SET status = 'no_workers_found', updated_at = NOW() WHERE id = $1`,
      [id],
    )
    return NextResponse.json({ success: true, data: { status: 'no_workers_found' } })
  }

  const attemptedRows = (await db.query(
    'SELECT worker_id FROM order_match_attempts WHERE order_id = $1',
    [id],
  )).rows as { worker_id: number }[]
  const attempted = new Set(attemptedRows.map((r) => r.worker_id))

  const allEligible = (await db.query(`
    SELECT w.id, u.name, w.specialty, w.price_per_hour, w.rating
    FROM   workers w
    JOIN   users        u  ON u.id  = w.user_id
    JOIN   banking_info bi ON bi.worker_id = w.id
    WHERE  w.is_available = true
      AND  w.is_active    = true
      AND  w.rating       >= 4.0
      AND  bi.verified    = true
  `)).rows as WorkerMatchRow[]
  const eligible = allEligible.filter((w) => !attempted.has(w.id))

  if (eligible.length === 0) {
    await db.query(
      `UPDATE orders SET status = 'no_workers_found', updated_at = NOW() WHERE id = $1`,
      [id],
    )
    return NextResponse.json({ success: true, data: { status: 'no_workers_found' } })
  }

  const worker = eligible[Math.floor(Math.random() * eligible.length)]!

  await db.query(
    `INSERT INTO order_match_attempts (order_id, worker_id, status) VALUES ($1, $2, 'offered')`,
    [id, worker.id],
  )
  await db.query(
    `UPDATE orders SET status = 'pending_worker_acceptance', worker_id = $1, updated_at = NOW() WHERE id = $2`,
    [worker.id, id],
  )

  return NextResponse.json({
    success: true,
    data: {
      status: 'pending_acceptance',
      attemptNumber: completedCount + 1,
      worker: {
        workerId:     String(worker.id),
        name:         worker.name,
        rating:       worker.rating,
        specialty:    worker.specialty,
        pricePerHour: worker.price_per_hour,
      },
    },
  })
}
