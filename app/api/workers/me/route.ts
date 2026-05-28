import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Worker } from '@/lib/types'

const SPECIALTIES = [
  'цэвэрлэгээ', 'угаалга', 'ерөнхий засвар',
  'сантехник', 'цахилгаан', 'будаг', 'цонх/хаалга',
] as const

const patchSchema = z.object({
  specialty:    z.enum(SPECIALTIES).optional(),
  pricePerHour: z.number().int().min(1000).max(500000).optional(),
}).refine(
  (d) => d.specialty !== undefined || d.pricePerHour !== undefined,
  { message: 'Хамгийн багадаа нэг талбар шаардлагатай' },
)

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

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1
  if (parsed.data.specialty    !== undefined) { sets.push(`specialty = $${idx++}`);     vals.push(parsed.data.specialty) }
  if (parsed.data.pricePerHour !== undefined) { sets.push(`price_per_hour = $${idx++}`); vals.push(parsed.data.pricePerHour) }
  vals.push(workerRow.id)

  await db.query(`UPDATE workers SET ${sets.join(', ')} WHERE id = $${idx}`, vals)

  return NextResponse.json({ success: true, data: undefined })
}
