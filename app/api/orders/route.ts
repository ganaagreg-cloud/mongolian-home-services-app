import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Order, OrderStatus, PaymentStatus, PropertyType, MatchingStrategy } from '@/lib/types'

type OrderRow = {
  id: string; user_id: string; worker_id: string | null; worker_name: string | null
  service: string; status: string; address: string; scheduled_date: string
  hours: number; total_amount: number; urgent: boolean
  rooms: number | null; area_sqm: number | null
  property_type: string | null; notes: string | null
  matching_strategy: string | null; payment_status: string
  before_photo_url: string | null; after_photo_url: string | null
  created_at: string; updated_at: string
}

function toOrder(row: OrderRow): Order {
  return {
    id:               String(row.id),
    userId:           String(row.user_id),
    workerId:         row.worker_id ? String(row.worker_id) : null,
    workerName:       row.worker_name ?? undefined,
    service:          row.service,
    status:           row.status as OrderStatus,
    address:          row.address,
    scheduledDate:    row.scheduled_date,
    hours:            row.hours,
    totalAmount:      row.total_amount,
    urgent:           Boolean(row.urgent),
    rooms:            row.rooms ?? undefined,
    areaSqm:          row.area_sqm ?? undefined,
    propertyType:     row.property_type as PropertyType | undefined,
    notes:            row.notes ?? undefined,
    matchingStrategy: (row.matching_strategy ?? 'scheduled') as MatchingStrategy,
    paymentStatus:    row.payment_status as PaymentStatus,
    beforePhotoUrl:   row.before_photo_url ?? undefined,
    afterPhotoUrl:    row.after_photo_url ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  }
}

const ACTIVE_STATUSES = `('searching_worker','pending_acceptances','pending_worker_acceptance','worker_assigned','worker_on_the_way','in_progress')`

const SELECT_COLS = `
  o.id, o.user_id, o.worker_id, u.name as worker_name,
  o.service, o.status, o.address, o.scheduled_date,
  o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
  o.property_type, o.notes, o.matching_strategy, o.payment_status,
  o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at`

const JOIN_WORKER = `
  LEFT JOIN workers w ON w.id = o.worker_id
  LEFT JOIN users   u ON u.id = w.user_id`

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady
  const params = req.nextUrl.searchParams

  if (session.is_worker && params.get('scheduled') === '1') {
    const workerRow = (await db.query(
      'SELECT id, specialty, is_available, is_active FROM workers WHERE user_id = $1',
      [session.sub],
    )).rows[0] as { id: string; specialty: string | null; is_available: boolean; is_active: boolean } | undefined

    if (!workerRow || !workerRow.is_available || !workerRow.is_active || !workerRow.specialty) {
      return NextResponse.json({ success: true, data: [] })
    }
    const rows = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.status = 'pending_acceptances'
        AND o.matching_strategy = 'scheduled'
        AND o.service = $1
        AND o.user_id != $3
        AND NOT EXISTS (
          SELECT 1 FROM order_acceptances oa
          WHERE oa.order_id = o.id AND oa.worker_id = $2
        )
      ORDER BY o.created_at DESC
    `, [workerRow.specialty, workerRow.id, session.sub])).rows as OrderRow[]
    return NextResponse.json({ success: true, data: rows.map(toOrder) })
  }

  if (session.is_worker && params.get('worker_active') === '1') {
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1',
      [session.sub],
    )).rows[0] as { id: string } | undefined
    if (!workerRow) return NextResponse.json({ success: true, data: null })
    const row = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.worker_id = $1
        AND o.status IN ('worker_assigned', 'worker_on_the_way', 'in_progress')
      ORDER BY o.updated_at DESC LIMIT 1
    `, [workerRow.id])).rows[0] as OrderRow | undefined
    return NextResponse.json({ success: true, data: row ? toOrder(row) : null })
  }

  if (session.is_worker && params.get('offered') === '1') {
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1',
      [session.sub],
    )).rows[0] as { id: string } | undefined
    if (!workerRow) return NextResponse.json({ success: true, data: [] })
    const rows = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.worker_id = $1 AND o.status = 'pending_worker_acceptance' AND o.matching_strategy = 'instant'
      ORDER BY o.created_at DESC
    `, [workerRow.id])).rows as OrderRow[]
    return NextResponse.json({ success: true, data: rows.map(toOrder) })
  }

  if (params.get('active') === '1') {
    const row = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.user_id = $1 AND o.status IN ${ACTIVE_STATUSES}
      ORDER BY o.created_at DESC LIMIT 1
    `, [session.sub])).rows[0] as OrderRow | undefined
    return NextResponse.json({ success: true, data: row ? toOrder(row) : null })
  }

  const rows = (await db.query(`
    SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
  `, [session.sub])).rows as OrderRow[]
  return NextResponse.json({ success: true, data: rows.map(toOrder) })
}

const createSchema = z.object({
  service:          z.string().min(1),
  address:          z.string().min(1),
  scheduledDate:    z.string().min(1),
  hours:            z.number().int().min(1).max(24),
  totalAmount:      z.number().int().min(0),
  urgent:           z.boolean().optional(),
  rooms:            z.number().int().min(1).max(20).optional(),
  areaSqm:          z.number().int().min(1).optional(),
  propertyType:     z.enum(['house', 'apartment', 'office']).optional(),
  notes:            z.string().optional(),
  matchingStrategy: z.enum(['instant', 'scheduled']).optional().default('scheduled'),
})

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      { status: 400 },
    )
  }

  const {
    service, address, scheduledDate, hours, totalAmount,
    urgent, rooms, areaSqm, propertyType, notes, matchingStrategy,
  } = parsed.data

  const initialStatus = matchingStrategy === 'instant' ? 'searching_worker' : 'pending_acceptances'

  await dbReady
  try {
    const result = (await db.query(`
      INSERT INTO orders
        (user_id, service, status, address, scheduled_date,
         hours, total_amount, urgent, rooms, area_sqm, property_type, notes, matching_strategy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      session.sub, service, initialStatus, address, scheduledDate,
      hours, totalAmount, urgent ?? false,
      rooms ?? null, areaSqm ?? null, propertyType ?? null, notes ?? null,
      matchingStrategy,
    ])).rows[0] as { id: string }

    return NextResponse.json({ success: true, data: { id: String(result.id), matchingStrategy } }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: 'Захиалга үүсгэхэд алдаа гарлаа' }, { status: 500 })
  }
}
