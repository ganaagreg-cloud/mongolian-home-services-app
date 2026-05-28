import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const sp      = req.nextUrl.searchParams
  const q       = sp.get('q') ?? ''
  const status  = sp.get('status') ?? ''
  const service = sp.get('service') ?? ''
  const from    = sp.get('from') ?? ''
  const to      = sp.get('to') ?? ''
  const page    = Math.max(1, Number(sp.get('page') ?? 1))
  const limit   = 20
  const offset  = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[]    = []
  let   idx = 1

  if (status)  { conditions.push(`o.status = $${idx++}`)              ; params.push(status) }
  if (service) { conditions.push(`o.service ILIKE $${idx++}`)         ; params.push(`%${service}%`) }
  if (from)    { conditions.push(`o.created_at >= $${idx++}`)         ; params.push(from) }
  if (to)      { conditions.push(`o.created_at <= $${idx++}`)         ; params.push(to + 'T23:59:59Z') }
  if (q)       {
    conditions.push(`(u1.name ILIKE $${idx} OR u2.name ILIKE $${idx + 1} OR o.address ILIKE $${idx + 2})`)
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    idx += 3
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  await dbReady
  const [rowsResult, countResult] = await Promise.all([
    db.query(`
      SELECT o.id, o.service, o.status, o.address, o.total_amount,
             o.payment_status, o.scheduled_date, o.created_at,
             o.matching_strategy, o.urgent,
             u1.name as customer_name, u2.name as worker_name
      FROM   orders o
      JOIN   users u1 ON u1.id = o.user_id
      LEFT JOIN workers w  ON w.id  = o.worker_id
      LEFT JOIN users   u2 ON u2.id = w.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params),
    db.query(
      `SELECT COUNT(*) as total FROM orders o
       JOIN users u1 ON u1.id = o.user_id
       LEFT JOIN workers w ON w.id = o.worker_id
       LEFT JOIN users u2 ON u2.id = w.user_id
       ${where}`, params
    ),
  ])

  return NextResponse.json({
    success: true,
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pages: Math.ceil(Number(countResult.rows[0].total) / limit),
  })
}
