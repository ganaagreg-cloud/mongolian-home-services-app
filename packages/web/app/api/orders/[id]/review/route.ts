import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
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

  await dbReady

  const order = (await db.query(
    `SELECT id, worker_id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
    [orderId, session.sub],
  )).rows[0] as { id: string; worker_id: string } | undefined

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' },
      { status: 404 },
    )
  }

  const existing = (await db.query('SELECT id FROM reviews WHERE order_id = $1', [orderId])).rows[0]
  if (existing) {
    return NextResponse.json({ success: false, error: 'Та аль хэдийн үнэлсэн байна' }, { status: 409 })
  }

  const { rating, comment } = parsed.data

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      'INSERT INTO reviews (order_id, worker_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [orderId, order.worker_id, rating, comment ?? null],
    )

    const stats = (await client.query(
      'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE worker_id = $1',
      [order.worker_id],
    )).rows[0] as { avg: number; cnt: number }

    await client.query(
      'UPDATE workers SET rating = $1, review_count = $2 WHERE id = $3',
      [Math.round(stats.avg * 10) / 10, stats.cnt, order.worker_id],
    )

    await client.query(
      `UPDATE orders SET status = 'rated', updated_at = NOW() WHERE id = $1`,
      [orderId],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return NextResponse.json({ success: true, data: undefined }, { status: 201 })
}
