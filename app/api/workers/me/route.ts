import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

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
  const row = (await db.query(`
    SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
           w.rating, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    WHERE  w.user_id = $1
      AND  w.deleted_at IS NULL
      AND  u.deleted_at IS NULL
  `, [session.sub])).rows[0] as WorkerRow | undefined

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

const patchSchema = z.object({
  specialty:    z.enum([
    'цэвэрлэгээ', 'угаалга', 'сантехник', 'цахилгаанчин',
    'будагч', 'тавилгачин', 'гагнуурчин', 'нүүлгэлт',
  ]).optional(),
  pricePerHour: z.number().int().min(1000).optional(),
}).refine((d) => d.specialty !== undefined || d.pricePerHour !== undefined, {
  message: 'specialty эсвэл pricePerHour хамгийн нэгийг оруулна уу',
})

export async function PATCH(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      { status: 400 },
    )
  }

  await dbReady

  const worker = (await db.query('SELECT id FROM workers WHERE user_id = $1 AND deleted_at IS NULL', [session.sub])).rows[0] as { id: number } | undefined
  if (!worker) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  const { specialty, pricePerHour } = parsed.data
  if (specialty !== undefined && pricePerHour !== undefined) {
    await db.query('UPDATE workers SET specialty = $1, price_per_hour = $2 WHERE id = $3', [specialty, pricePerHour, worker.id])
  } else if (specialty !== undefined) {
    await db.query('UPDATE workers SET specialty = $1 WHERE id = $2', [specialty, worker.id])
  } else {
    await db.query('UPDATE workers SET price_per_hour = $1 WHERE id = $2', [pricePerHour, worker.id])
  }

  return NextResponse.json({ success: true, data: undefined })
}
