import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

type TxRow = {
  id: number
  amount: number
  type: string
  service: string
  created_at: string
}

type SumRow = { total: string | null }

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND deleted_at IS NULL',
    [session.sub],
  )).rows[0] as { id: number } | undefined

  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  const wid = workerRow.id

  const [totalRow, monthRow, weekRow, withdrawRow, txRows] = await Promise.all([
    db.query<SumRow>(
      `SELECT SUM(amount)::TEXT AS total FROM transactions WHERE worker_id = $1 AND type = 'earning'`,
      [wid],
    ),
    db.query<SumRow>(
      `SELECT SUM(amount)::TEXT AS total FROM transactions
       WHERE worker_id = $1 AND type = 'earning'
         AND date_trunc('month', created_at) = date_trunc('month', NOW())`,
      [wid],
    ),
    db.query<SumRow>(
      `SELECT SUM(amount)::TEXT AS total FROM transactions
       WHERE worker_id = $1 AND type = 'earning'
         AND created_at >= date_trunc('week', NOW())`,
      [wid],
    ),
    db.query<SumRow>(
      `SELECT SUM(amount)::TEXT AS total FROM transactions WHERE worker_id = $1 AND type = 'withdrawal'`,
      [wid],
    ),
    db.query<TxRow>(
      `SELECT id, amount, type, service, created_at
       FROM transactions WHERE worker_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [wid],
    ),
  ])

  const totalEarned     = parseInt(totalRow.rows[0]?.total    ?? '0', 10) || 0
  const thisMonthEarned = parseInt(monthRow.rows[0]?.total    ?? '0', 10) || 0
  const thisWeekEarned  = parseInt(weekRow.rows[0]?.total     ?? '0', 10) || 0
  const totalWithdrawn  = parseInt(withdrawRow.rows[0]?.total ?? '0', 10) || 0
  const pendingPayout   = Math.max(0, totalEarned - totalWithdrawn)

  return NextResponse.json({
    success: true,
    data: {
      totalEarned,
      thisMonthEarned,
      thisWeekEarned,
      pendingPayout,
      transactions: txRows.rows.map((r) => ({
        id:        String(r.id),
        amount:    r.amount,
        type:      r.type as 'earning' | 'withdrawal',
        service:   r.service,
        createdAt: r.created_at,
      })),
    },
  })
}
