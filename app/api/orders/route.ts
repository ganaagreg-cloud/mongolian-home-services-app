import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Order, OrderStatus, PropertyType } from '@/lib/types'

type OrderRow = {
  id: string; user_id: string; worker_id: string; worker_name: string | null
  service: string; status: string; address: string; scheduled_date: string
  hours: number; total_amount: number; property_type: string | null; notes: string | null
  created_at: string; updated_at: string
}

function toOrder(row: OrderRow): Order {
  return {
    id:            row.id,
    userId:        row.user_id,
    workerId:      row.worker_id,
    workerName:    row.worker_name ?? undefined,
    service:       row.service,
    status:        row.status as OrderStatus,
    address:       row.address,
    scheduledDate: row.scheduled_date,
    hours:         row.hours,
    totalAmount:   row.total_amount,
    propertyType:  row.property_type as PropertyType | undefined,
    notes:         row.notes ?? undefined,
    createdAt:     row.created_at,
    updatedAt:     row.updated_at,
  }
}

const ACTIVE_STATUSES = `('pending','accepted','arriving','working')`

// GET /api/orders            — all orders for the logged-in user, newest first
// GET /api/orders?active=1   — only the most recent active order (for active-booking screen)
export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const activeOnly = req.nextUrl.searchParams.get('active') === '1'

  const sql = activeOnly
    ? `SELECT o.id, o.user_id, o.worker_id, u.name as worker_name,
              o.service, o.status, o.address, o.scheduled_date,
              o.hours, o.total_amount, o.property_type, o.notes,
              o.created_at, o.updated_at
       FROM   orders o
       LEFT JOIN workers w ON w.id = o.worker_id
       LEFT JOIN users   u ON u.id = w.user_id
       WHERE  o.user_id = ? AND o.status IN ${ACTIVE_STATUSES}
       ORDER  BY o.created_at DESC
       LIMIT  1`
    : `SELECT o.id, o.user_id, o.worker_id, u.name as worker_name,
              o.service, o.status, o.address, o.scheduled_date,
              o.hours, o.total_amount, o.property_type, o.notes,
              o.created_at, o.updated_at
       FROM   orders o
       LEFT JOIN workers w ON w.id = o.worker_id
       LEFT JOIN users   u ON u.id = w.user_id
       WHERE  o.user_id = ?
       ORDER  BY o.created_at DESC`

  if (activeOnly) {
    const row = db.prepare(sql).get(session.sub) as OrderRow | undefined
    return NextResponse.json({ success: true, data: row ? toOrder(row) : null })
  }

  const rows = db.prepare(sql).all(session.sub) as OrderRow[]
  return NextResponse.json({ success: true, data: rows.map(toOrder) })
}

const createSchema = z.object({
  workerId:      z.string().min(1),
  service:       z.string().min(1),
  address:       z.string().min(1),
  scheduledDate: z.string().min(1),
  hours:         z.number().int().min(1).max(24),
  totalAmount:   z.number().int().min(0),
  propertyType:  z.enum(['house', 'apartment', 'office']).optional(),
  notes:         z.string().optional(),
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

  // Verify the worker exists and is active/available
  const worker = db.prepare('SELECT id FROM workers WHERE id = ? AND is_active = 1 AND is_available = 1').get(parsed.data.workerId)
  if (!worker) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй эсвэл боломжгүй' }, { status: 404 })
  }

  const { workerId, service, address, scheduledDate, hours, totalAmount, propertyType, notes } = parsed.data
  const orderId = crypto.randomUUID()

  db.prepare(`
    INSERT INTO orders
      (id, user_id, worker_id, service, status, address,
       scheduled_date, hours, total_amount, property_type, notes)
    VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  `).run(orderId, session.sub, workerId, service, address, scheduledDate, hours, totalAmount, propertyType ?? null, notes ?? null)

  return NextResponse.json({ success: true, data: { id: orderId } }, { status: 201 })
}
