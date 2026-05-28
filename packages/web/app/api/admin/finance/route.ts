import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  await dbReady

  const [totalRev, monthRev, payouts, txRows] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status IN ('completed','rated')`),
    db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders
              WHERE status IN ('completed','rated') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),
    db.query(`
      SELECT u.name, w.id as worker_id,
             COALESCE(SUM(CASE WHEN t.type='earning' THEN t.amount ELSE 0 END),0) as total_earned,
             COALESCE(SUM(CASE WHEN t.type='withdrawal' THEN t.amount ELSE 0 END),0) as total_withdrawn
      FROM workers w
      JOIN users u ON u.id = w.user_id
      LEFT JOIN transactions t ON t.worker_id = w.id
      WHERE w.is_active = true AND w.rejected_at IS NULL
      GROUP BY u.name, w.id
      ORDER BY total_earned DESC
    `),
    db.query(`
      SELECT t.id, t.amount, t.type, t.service, t.created_at, u.name as worker_name
      FROM transactions t
      LEFT JOIN workers w ON w.id = t.worker_id
      LEFT JOIN users   u ON u.id = w.user_id
      ORDER BY t.created_at DESC LIMIT 50
    `),
  ])

  const commission = 0.15
  const damageFund = 0.02
  const totalRevenue   = Number(totalRev.rows[0].total)
  const monthRevenue   = Number(monthRev.rows[0].total)

  return NextResponse.json({
    success: true,
    data: {
      totalRevenue,
      monthRevenue,
      totalCommission:  Math.round(totalRevenue * commission),
      totalDamageFund:  Math.round(totalRevenue * damageFund),
      payouts: payouts.rows.map((r) => ({
        ...r,
        total_earned:    Number(r.total_earned),
        total_withdrawn: Number(r.total_withdrawn),
        pending:         Number(r.total_earned) - Number(r.total_withdrawn),
      })),
      transactions: txRows.rows,
    },
  })
}
