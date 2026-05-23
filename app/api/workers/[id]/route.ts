import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  price_per_hour: number; rating: number; review_count: number
  is_available: number; is_active: number; dan_verified: number; created_at: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const { id } = await params

  const row = db.prepare(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    WHERE  w.id = ?
  `).get(id) as WorkerRow | undefined

  if (!row) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  const worker: Worker = {
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

  return NextResponse.json({ success: true, data: worker })
}
