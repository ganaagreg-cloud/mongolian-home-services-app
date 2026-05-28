import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const q         = sp.get('q') ?? ''
  const status    = sp.get('status') ?? 'all'
  const specialty = sp.get('specialty') ?? ''
  const page      = Math.max(1, Number(sp.get('page') ?? 1))
  const limit     = 20
  const offset    = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[]    = []
  let   idx = 1

  if (status === 'pending')   { conditions.push(`w.is_active = false AND w.rejected_at IS NULL`) }
  if (status === 'active')    { conditions.push(`w.is_active = true  AND w.rejected_at IS NULL`) }
  if (status === 'suspended') { conditions.push(`w.rejected_at IS NOT NULL`) }

  if (q) {
    conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1})`)
    params.push(`%${q}%`, `%${q}%`)
    idx += 2
  }
  if (specialty) {
    conditions.push(`w.specialty ILIKE $${idx}`)
    params.push(`%${specialty}%`)
    idx += 1
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rowsResult, countResult] = await Promise.all([
    dbReady.then(() => db.query(`
      SELECT w.id, u.name, u.phone, w.specialty, w.price_per_hour,
             w.rating, w.review_count, w.is_active, w.is_available,
             w.rejected_at, w.created_at,
             bi.verified as banking_verified,
             u.dan_verified, w.police_file
      FROM   workers w
      JOIN   users   u  ON u.id  = w.user_id
      LEFT JOIN banking_info bi ON bi.worker_id = w.id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params)),
    dbReady.then(() => db.query(`
      SELECT COUNT(*) as total FROM workers w JOIN users u ON u.id = w.user_id ${where}
    `, params)),
  ])

  return NextResponse.json({
    success: true,
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pages: Math.ceil(Number(countResult.rows[0].total) / limit),
  })
}
