import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

type WorkerRow = {
  id: string
  user_id: string
  name: string
  specialty: string
  price_per_hour: number
  rating: number
  review_count: number
  is_available: number
  is_active: number
  dan_verified: number
  created_at: string
}

function toWorker(row: WorkerRow): Worker {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    specialty: row.specialty,
    pricePerHour: row.price_per_hour,
    rating: row.rating,
    reviewCount: row.review_count,
    isAvailable: row.is_available === 1,
    isActive: row.is_active === 1,
    danVerified: row.dan_verified === 1,
    createdAt: row.created_at,
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

  const conditions: string[] = ['w.is_active = 1']
  const params: unknown[]    = []

  if (!skipAvailabilityFilter) {
    conditions.push('w.is_available = 1')
  }
  if (q) {
    conditions.push('(u.name LIKE ? OR w.specialty LIKE ?)')
    params.push(`%${q}%`, `%${q}%`)
  }
  if (specialty) {
    conditions.push('w.specialty = ?')
    params.push(specialty)
  }

  const orderBy =
    sort === 'price_asc'  ? 'w.price_per_hour ASC'  :
    sort === 'price_desc' ? 'w.price_per_hour DESC'  :
    'w.rating DESC, w.review_count DESC'

  const rows = db.prepare(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    WHERE  ${conditions.join(' AND ')}
    ORDER  BY ${orderBy}
    LIMIT  50
  `).all(...params) as WorkerRow[]

  return NextResponse.json({ success: true, data: rows.map(toWorker) })
}
