import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Order, OrderStatus, PaymentStatus, PropertyType } from '@/lib/types'

type OrderRow = {
  id: string; user_id: string; worker_id: string | null; worker_name: string | null
  service: string; status: string; address: string; scheduled_date: string
  hours: number; total_amount: number; urgent: boolean
  rooms: number | null; area_sqm: number | null
  property_type: string | null; notes: string | null
  payment_status: string
  before_photo_url: string | null; after_photo_url: string | null
  created_at: string; updated_at: string
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
  const row = (await db.query(`
    SELECT o.id, o.user_id, o.worker_id, u.name as worker_name,
           o.service, o.status, o.address, o.scheduled_date,
           o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
           o.property_type, o.notes, o.payment_status,
           o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at
    FROM   orders o
    LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
    LEFT JOIN users   u ON u.id = w.user_id  
    WHERE  o.id = $1 AND (o.user_id = $2 OR w.user_id = $2)
  `, [id, session.sub])).rows[0] as OrderRow | undefined

  if (!row) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  const order: Order = {
    id:            String(row.id),
    userId:        String(row.user_id),
    workerId:      row.worker_id ? String(row.worker_id) : null,
    workerName:    row.worker_name ?? undefined,
    service:       row.service,
    status:        row.status as OrderStatus,
    address:       row.address,
    scheduledDate: row.scheduled_date,
    hours:         row.hours,
    totalAmount:   row.total_amount,
    urgent:        Boolean(row.urgent),
    rooms:         row.rooms ?? undefined,
    areaSqm:       row.area_sqm ?? undefined,
    propertyType:  row.property_type as PropertyType | undefined,
    notes:         row.notes ?? undefined,
    paymentStatus:  row.payment_status as PaymentStatus,
    beforePhotoUrl: row.before_photo_url ?? undefined,
    afterPhotoUrl:  row.after_photo_url ?? undefined,
    createdAt:      row.created_at,
    updatedAt:      row.updated_at,
  }

  return NextResponse.json({ success: true, data: order })
}

// PATCH /api/orders/[id]
// User picks a worker from the scheduled acceptors list.
// Body: { workerId: string }
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

  const parsed = body as { workerId?: unknown }
  if (typeof parsed.workerId !== 'string' && typeof parsed.workerId !== 'number') {
    return NextResponse.json({ success: false, error: 'workerId шаардлагатай' }, { status: 400 })
  }
  const workerId = String(parsed.workerId)

  const { id } = await params

  await dbReady

  const orderRow = (await db.query(
    'SELECT id, status, worker_id FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string; status: string; worker_id: string | null } | undefined

  if (!orderRow) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }
  // Idempotent: already assigned to the same worker is a no-op success
  if (orderRow.status === 'worker_assigned' && String(orderRow.worker_id) === String(workerId)) {
    return NextResponse.json({ success: true, data: undefined })
  }
  if (orderRow.status !== 'pending_acceptances') {
    return NextResponse.json({ success: false, error: 'Энэ захиалга өөрчлөх боломжгүй' }, { status: 409 })
  }

  const accepted = (await db.query(
    'SELECT id FROM order_acceptances WHERE order_id = $1 AND worker_id = $2',
    [id, workerId],
  )).rows[0]

  if (!accepted) {
    return NextResponse.json({ success: false, error: 'Ажилтан энэ захиалгыг хүлээж аваагүй байна' }, { status: 400 })
  }

  await db.query(
    `UPDATE orders SET worker_id = $1, status = 'worker_assigned', updated_at = NOW() WHERE id = $2`,
    [workerId, id],
  )
  await db.query(
    'UPDATE order_acceptances SET picked_at = NOW() WHERE order_id = $1 AND worker_id = $2',
    [id, workerId],
  )

  return NextResponse.json({ success: true, data: undefined })
}
