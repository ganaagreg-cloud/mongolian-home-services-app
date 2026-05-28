import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

const postSchema = z.object({
  worker_id: z.number().int().positive(),
})

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  price_per_hour: number; rating: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
}

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const rows = (await db.query(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   saved_workers sw
    JOIN   workers w ON w.id = sw.worker_id AND w.rejected_at IS NULL
    JOIN   users   u ON u.id = w.user_id  
    WHERE  sw.user_id = $1
    ORDER  BY sw.created_at DESC
  `, [session.sub])).rows as WorkerRow[]

  const workers: Worker[] = rows.map((r) => ({
    id:           String(r.id),
    userId:       String(r.user_id),
    name:         r.name,
    specialty:    r.specialty,
    pricePerHour: r.price_per_hour,
    rating:       r.rating,
    reviewCount:  r.review_count,
    isAvailable:  Boolean(r.is_available),
    isActive:     Boolean(r.is_active),
    danVerified:  Boolean(r.dan_verified),
    createdAt:    r.created_at,
  }))

  return NextResponse.json({ success: true, data: workers })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      { status: 400 },
    )
  }

  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const worker = (await db.query('SELECT id FROM workers WHERE id = $1 AND rejected_at IS NULL', [parsed.data.worker_id])).rows[0]
  if (!worker) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  await db.query(
    'INSERT INTO saved_workers (user_id, worker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [session.sub, parsed.data.worker_id],
  )

  return NextResponse.json({ success: true, data: undefined }, { status: 201 })
}
