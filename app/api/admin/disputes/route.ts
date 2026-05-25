import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { AdminDispute } from '@/lib/types'

type Row = {
  id: string; order_id: string; customer_name: string; worker_name: string | null
  service: string; issue: string; status: string; total_amount: number
  compensation_amount: number | null; created_at: string
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  await dbReady
  const rows = (await db.query(`
    SELECT d.id, d.order_id, d.issue, d.status, d.compensation_amount, d.created_at,
           u1.name as customer_name, u2.name as worker_name,
           o.service, o.total_amount
    FROM   disputes d
    JOIN   orders  o  ON o.id  = d.order_id
    JOIN   users   u1 ON u1.id = o.user_id
    LEFT JOIN workers w  ON w.id  = o.worker_id
    LEFT JOIN users   u2 ON u2.id = w.user_id
    ORDER  BY d.created_at DESC
  `)).rows as Row[]

  const data: AdminDispute[] = rows.map((r) => ({
    id:                 String(r.id),
    orderId:            String(r.order_id),
    customerName:       r.customer_name,
    workerName:         r.worker_name ?? '—',
    service:            r.service,
    issue:              r.issue,
    status:             r.status,
    totalAmount:        r.total_amount,
    compensationAmount: r.compensation_amount,
    createdAt:          r.created_at,
  }))

  return NextResponse.json({ success: true, data })
}
