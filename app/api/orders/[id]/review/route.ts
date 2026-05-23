import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

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

  const { id: orderId } = await params

  // Verify the order belongs to this user and is completed
  const order = db.prepare(
    `SELECT id, worker_id FROM orders WHERE id = ? AND user_id = ? AND status = 'completed'`,
  ).get(orderId, session.sub) as { id: string; worker_id: string } | undefined

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' },
      { status: 404 },
    )
  }

  // Prevent duplicate reviews
  const existing = db.prepare('SELECT id FROM reviews WHERE order_id = ?').get(orderId)
  if (existing) {
    return NextResponse.json({ success: false, error: 'Та аль хэдийн үнэлсэн байна' }, { status: 409 })
  }

  const { rating, comment } = parsed.data

  db.transaction(() => {
    db.prepare(
      'INSERT INTO reviews (id, order_id, worker_id, rating, comment) VALUES (?, ?, ?, ?, ?)',
    ).run(crypto.randomUUID(), orderId, order.worker_id, rating, comment ?? null)

    // Recalculate worker rating average
    const stats = db.prepare(
      'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE worker_id = ?',
    ).get(order.worker_id) as { avg: number; cnt: number }

    db.prepare('UPDATE workers SET rating = ?, review_count = ? WHERE id = ?').run(
      Math.round(stats.avg * 10) / 10,
      stats.cnt,
      order.worker_id,
    )
  })()

  return NextResponse.json({ success: true, data: undefined }, { status: 201 })
}
