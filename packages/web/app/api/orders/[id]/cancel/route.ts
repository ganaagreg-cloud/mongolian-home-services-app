import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const paramsSchema = z.object({ id: z.coerce.number().int().positive() })

const FREE_STATUSES = new Set([
  'pending_acceptances', 'searching_worker', 'pending_worker_acceptance', 'pending_payment',
])
const FEE_STATUSES = new Set(['worker_assigned', 'worker_on_the_way'])
const LATE_CANCEL_FEE = 5000

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await params
  const paramParsed = paramsSchema.safeParse({ id: rawId })
  if (!paramParsed.success) {
    return NextResponse.json({ success: false, error: 'Буруу захиалгын ID' }, { status: 400 })
  }
  const orderId = paramParsed.data.id

  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const order = (await db.query(
    `SELECT id, worker_id, status, scheduled_date, total_amount, service, payment_status
     FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, session.sub],
  )).rows[0] as {
    id: string; worker_id: string | null; status: string; scheduled_date: string
    total_amount: number; service: string; payment_status: string
  } | undefined

  if (!order) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  if (!FREE_STATUSES.has(order.status) && !FEE_STATUSES.has(order.status)) {
    return NextResponse.json({ success: false, error: 'Энэ захиалгыг цуцлах боломжгүй' }, { status: 403 })
  }

  let fee = 0
  if (FEE_STATUSES.has(order.status)) {
    const scheduledDate = new Date(order.scheduled_date)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    fee = scheduledDate <= oneHourFromNow ? LATE_CANCEL_FEE : 0
  }

  const refundAmount = Math.max(0, order.total_amount - fee)

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE orders SET status = 'cancelled_by_user', updated_at = NOW() WHERE id = $1`,
      [orderId],
    )

    if (order.payment_status === 'paid') {
      await client.query(
        'INSERT INTO transactions (worker_id, amount, type, service) VALUES ($1, $2, $3, $4)',
        [order.worker_id ?? null, refundAmount, 'refund', order.service],
      )
    }

    await client.query('COMMIT')
  } catch {
    await client.query('ROLLBACK')
    return NextResponse.json({ success: false, error: 'Алдаа гарлаа' }, { status: 500 })
  } finally {
    client.release()
  }

  return NextResponse.json({ success: true, data: { refundAmount, fee } })
}
