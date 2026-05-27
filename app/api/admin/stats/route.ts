import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { AdminStats, AdminRecentOrder } from '@/lib/types'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  await dbReady

  const todayOrders = Number((await db.query(
    `SELECT COUNT(*) as count FROM orders WHERE created_at::date = CURRENT_DATE`,
  )).rows[0].count)

  const totalRevenue = Number((await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'`,
  )).rows[0].total)

  const activeWorkers = Number((await db.query(
    `SELECT COUNT(*) as count FROM workers WHERE is_active = true AND deleted_at IS NULL`,
  )).rows[0].count)

  const openDisputes = Number((await db.query(
    `SELECT COUNT(*) as count FROM disputes WHERE status = 'open'`,
  )).rows[0].count)

  const recentRows = (await db.query(`
    SELECT o.id, u1.name as customer_name, u2.name as worker_name,
           o.service, o.status, o.total_amount
    FROM   orders o
    JOIN   users u1 ON u1.id = o.user_id   AND u1.deleted_at IS NULL
    LEFT JOIN workers w  ON w.id  = o.worker_id AND w.deleted_at IS NULL
    LEFT JOIN users   u2 ON u2.id = w.user_id   AND u2.deleted_at IS NULL
    ORDER  BY o.created_at DESC
    LIMIT  5
  `)).rows as { id: string; customer_name: string; worker_name: string | null; service: string; status: string; total_amount: number }[]

  const recentOrders: AdminRecentOrder[] = recentRows.map((r) => ({
    id:           String(r.id),
    customerName: r.customer_name,
    workerName:   r.worker_name ?? '—',
    service:      r.service,
    status:       r.status,
    totalAmount:  r.total_amount,
  }))

  const data: AdminStats = { todayOrders, totalRevenue, activeWorkers, openDisputes, recentOrders }
  return NextResponse.json({ success: true, data })
}
