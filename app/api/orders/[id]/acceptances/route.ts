import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { OrderAcceptance } from '@/lib/types'

type AcceptanceRow = {
  id: number
  order_id: string
  worker_id: string
  worker_name: string
  worker_rating: number
  worker_review_count: number
  worker_specialty: string
  worker_price_per_hour: number
  created_at: string
}

export async function GET(
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
    'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string } | undefined

  if (!order) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  const rows = (await db.query(`
    SELECT
      oa.id, oa.order_id, oa.worker_id, oa.created_at,
      u.name           AS worker_name,
      w.rating         AS worker_rating,
      w.review_count   AS worker_review_count,
      w.specialty      AS worker_specialty,
      w.price_per_hour AS worker_price_per_hour
    FROM  order_acceptances oa
    JOIN  workers w ON w.id   = oa.worker_id
    JOIN  users   u ON u.id   = w.user_id
    WHERE oa.order_id = $1
    ORDER BY oa.created_at ASC
  `, [id])).rows as AcceptanceRow[]

  const acceptances: OrderAcceptance[] = rows.map((r) => ({
    id:                  String(r.id),
    orderId:             String(r.order_id),
    workerId:            String(r.worker_id),
    workerName:          r.worker_name,
    workerRating:        r.worker_rating,
    workerReviewCount:   r.worker_review_count,
    workerSpecialty:     r.worker_specialty,
    workerPricePerHour:  r.worker_price_per_hour,
    acceptedAt:          r.created_at,
  }))

  return NextResponse.json({ success: true, data: acceptances })
}
