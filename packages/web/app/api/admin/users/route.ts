import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const sp     = req.nextUrl.searchParams
  const q      = sp.get('q') ?? ''
  const role   = sp.get('role') ?? ''
  const page   = Math.max(1, Number(sp.get('page') ?? 1))
  const limit  = 20
  const offset = (page - 1) * limit

  const conditions: string[] = ['u.better_auth_id IS NOT NULL OR u.phone IS NOT NULL']
  const params: unknown[]    = []
  let   idx = 1

  if (q) {
    conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1} OR u.email ILIKE $${idx + 2})`)
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    idx += 3
  }
  if (role) {
    conditions.push(`u.role = $${idx}`)
    params.push(role)
    idx += 1
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const [rowsResult, countResult] = await Promise.all([
    dbReady.then(() => db.query(`
      SELECT u.id, u.name, u.phone, u.email, u.role, u.is_worker,
             u.active_mode, u.dan_verified, u.avatar_url, u.deleted_at,
             u.created_at, u.better_auth_id,
             (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count,
             (SELECT a."providerId" FROM account a JOIN "user" bu ON bu.id = a."userId"
              WHERE bu.id = u.better_auth_id LIMIT 1) as auth_method
      FROM users u
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params)),
    dbReady.then(() => db.query(
      `SELECT COUNT(*) as total FROM users u ${where}`, params
    )),
  ])

  return NextResponse.json({
    success: true,
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pages: Math.ceil(Number(countResult.rows[0].total) / limit),
  })
}
