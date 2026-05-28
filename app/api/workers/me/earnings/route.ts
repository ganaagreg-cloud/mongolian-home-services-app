import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Transaction, TransactionType } from '@/lib/types'

type EarningsRow = { total: string }
type TxRow = {
  id: string; worker_id: string; amount: number
  type: string; service: string; created_at: string
}

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  const wid = workerRow.id

  const [totalRow, monthRow, pendingRow, txRows] = await Promise.all([
    db.query<EarningsRow>(
      `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
       FROM orders
       WHERE worker_id = $1 AND status IN ('completed', 'rated')`,
      [wid],
    ),
    db.query<EarningsRow>(
      `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
       FROM orders
       WHERE worker_id = $1
         AND status IN ('completed', 'rated')
         AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())`,
      [wid],
    ),
    db.query<EarningsRow>(
      `SELECT COALESCE(
         FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0
       )::INTEGER AS total
       FROM orders
       WHERE worker_id = $1
         AND status IN ('completed', 'rated')
         AND payment_status = 'paid'`,
      [wid],
    ),
    db.query<TxRow>(
      `SELECT id, worker_id, amount, type, service, created_at
       FROM transactions
       WHERE worker_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [wid],
    ),
  ])

  const transactions: Transaction[] = txRows.rows.map((r) => ({
    id:        String(r.id),
    workerId:  String(r.worker_id),
    amount:    r.amount,
    type:      r.type as TransactionType,
    service:   r.service,
    createdAt: r.created_at,
  }))

  return NextResponse.json({
    success: true,
    data: {
      totalEarned:    Number(totalRow.rows[0]?.total   ?? 0),
      thisMonthEarned: Number(monthRow.rows[0]?.total  ?? 0),
      pendingPayout:  Number(pendingRow.rows[0]?.total ?? 0),
      transactions,
    },
  })
}
