import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  price_per_hour: number; rating: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
}

function toWorker(row: WorkerRow): Worker {
  return {
    id:           String(row.id),
    userId:       String(row.user_id),
    name:         row.name,
    specialty:    row.specialty,
    pricePerHour: row.price_per_hour,
    rating:       row.rating,
    reviewCount:  row.review_count,
    isAvailable:  Boolean(row.is_available),
    isActive:     Boolean(row.is_active),
    danVerified:  Boolean(row.dan_verified),
    createdAt:    row.created_at,
  }
}

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const sp = req.nextUrl.searchParams
  const q         = sp.get('q') ?? ''
  const specialty = sp.get('specialty') ?? ''
  const sort      = sp.get('sort') ?? 'rating'
  const skipAvailabilityFilter = sp.get('available') === '0'

  const conditions: string[] = ['w.is_active = true', 'w.rejected_at IS NULL']
  const qParams: unknown[]   = []
  let pIdx = 1

  if (!skipAvailabilityFilter) {
    conditions.push('w.is_available = true')
  }
  if (q) {
    conditions.push(`(u.name ILIKE $${pIdx} OR w.specialty ILIKE $${pIdx + 1})`)
    qParams.push(`%${q}%`, `%${q}%`)
    pIdx += 2
  }
  if (specialty) {
    conditions.push(`w.specialty = $${pIdx}`)
    qParams.push(specialty)
    pIdx += 1
  }

  const orderBy =
    sort === 'price_asc'  ? 'w.price_per_hour ASC'  :
    sort === 'price_desc' ? 'w.price_per_hour DESC'  :
    'w.rating DESC, w.review_count DESC'

  await dbReady
  const rows = (await db.query(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    WHERE  ${conditions.join(' AND ')}
    ORDER  BY ${orderBy}
    LIMIT  50
  `, qParams)).rows as WorkerRow[]

  return NextResponse.json({ success: true, data: rows.map(toWorker) })
}
