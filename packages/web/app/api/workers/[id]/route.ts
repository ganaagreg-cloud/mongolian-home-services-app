import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  price_per_hour: number; rating: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
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

  await dbReady
  const row = (await db.query(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    WHERE  w.id = $1
  `, [id])).rows[0] as WorkerRow | undefined

  if (!row) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  const worker: Worker = {
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

  return NextResponse.json({ success: true, data: worker })
}
