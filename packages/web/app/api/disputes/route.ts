import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  order_id:    z.number().int().positive(),
  reason:      z.enum(['хохирол', 'чанар муу', 'ажилтан ирээгүй', 'бусад']),
  description: z.string().min(20, 'Тайлбар хамгийн багадаа 20 тэмдэгт байх ёстой'),
  photo_urls:  z.array(z.string().url()).max(3).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
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

  const { order_id, reason, description, photo_urls } = parsed.data

  await dbReady

  const order = (await db.query(
    `SELECT id, updated_at FROM orders WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
    [order_id, session.sub],
  )).rows[0] as { id: string; updated_at: string } | undefined

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' },
      { status: 404 },
    )
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (new Date(order.updated_at) < sevenDaysAgo) {
    return NextResponse.json(
      { success: false, error: 'Захиалга дууссанаас хойш 7 хоног өнгөрсөн байна' },
      { status: 400 },
    )
  }

  const existing = (await db.query('SELECT id FROM disputes WHERE order_id = $1', [order_id])).rows[0]
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Энэ захиалгад аль хэдийн гомдол гаргасан байна' },
      { status: 409 },
    )
  }

  const issue = `${reason}: ${description}`
  const photoUrlsArr = photo_urls ?? []

  let result: { id: string }
  try {
    result = (await db.query(
      `INSERT INTO disputes (order_id, issue, status, photo_urls) VALUES ($1, $2, 'open', $3) RETURNING id`,
      [order_id, issue, photoUrlsArr],
    )).rows[0] as { id: string }
  } catch {
    return NextResponse.json({ success: false, error: 'Алдаа гарлаа' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { id: String(result.id) } }, { status: 201 })
}
