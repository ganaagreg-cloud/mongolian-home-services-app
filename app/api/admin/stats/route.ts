import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { AdminStats, AdminRecentOrder } from '@/lib/types'

type CountRow = { count: number }
type SumRow   = { total: number }
type OrderRow = {
  id: string
  customer_name: string
  worker_name: string | null
  service: string
  status: string
  total_amount: number
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  const { count: todayOrders } = db.prepare(
    `SELECT COUNT(*) as count FROM orders WHERE date(created_at) = date('now')`,
  ).get() as CountRow

  const { total: totalRevenue } = db.prepare(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'`,
  ).get() as SumRow

  const { count: activeWorkers } = db.prepare(
    `SELECT COUNT(*) as count FROM workers WHERE is_active = 1`,
  ).get() as CountRow

  const { count: openDisputes } = db.prepare(
    `SELECT COUNT(*) as count FROM disputes WHERE status = 'open'`,
  ).get() as CountRow

  const rows = db.prepare(`
    SELECT o.id, u1.name as customer_name, u2.name as worker_name,
           o.service, o.status, o.total_amount
    FROM   orders o
    JOIN   users u1 ON u1.id = o.user_id
    LEFT JOIN workers w  ON w.id  = o.worker_id
    LEFT JOIN users   u2 ON u2.id = w.user_id
    ORDER  BY o.created_at DESC
    LIMIT  5
  `).all() as OrderRow[]

  const recentOrders: AdminRecentOrder[] = rows.map((r) => ({
    id:           r.id,
    customerName: r.customer_name,
    workerName:   r.worker_name ?? '—',
    service:      r.service,
    status:       r.status,
    totalAmount:  r.total_amount,
  }))

  const data: AdminStats = { todayOrders, totalRevenue, activeWorkers, openDisputes, recentOrders }
  return NextResponse.json({ success: true, data })
}
