import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Order, OrderStatus, PropertyType } from '@/lib/types'

type OrderRow = {
  id: string; user_id: string; worker_id: string; worker_name: string | null
  service: string; status: string; address: string; scheduled_date: string
  hours: number; total_amount: number; property_type: string | null; notes: string | null
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

  const row = db.prepare(`
    SELECT o.id, o.user_id, o.worker_id, u.name as worker_name,
           o.service, o.status, o.address, o.scheduled_date,
           o.hours, o.total_amount, o.property_type, o.notes,
           o.created_at, o.updated_at
    FROM   orders o
    LEFT JOIN workers w ON w.id = o.worker_id
    LEFT JOIN users   u ON u.id = w.user_id
    WHERE  o.id = ? AND (o.user_id = ? OR w.user_id = ?)
  `).get(id, session.sub, session.sub) as OrderRow | undefined

  if (!row) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  const order: Order = {
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

  return NextResponse.json({ success: true, data: order })
}
