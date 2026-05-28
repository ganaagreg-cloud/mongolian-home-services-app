import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { z } from 'zod'

const PatchSchema = z.object({
  status: z.enum(['cancelled_by_admin']).optional(),
  cancel_reason: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { id } = await params
  await dbReady

  const order = (await db.query(`
    SELECT o.*,
           u1.name as customer_name, u1.phone as customer_phone,
           u2.name as worker_name,
           w.specialty as worker_specialty, w.price_per_hour
    FROM   orders o
    JOIN   users u1 ON u1.id = o.user_id
    LEFT JOIN workers w  ON w.id  = o.worker_id
    LEFT JOIN users   u2 ON u2.id = w.user_id
    WHERE  o.id = $1
  `, [id])).rows[0]

  if (!order) return NextResponse.json({ success: false, error: 'Олдсонгүй' }, { status: 404 })

  const [messages, transactions] = await Promise.all([
    db.query(`
      SELECT m.text, m.created_at, u.name as sender_name
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.order_id = $1 ORDER BY m.created_at
    `, [id]),
    db.query(`
      SELECT t.amount, t.type, t.created_at
      FROM transactions t WHERE t.worker_id = (
        SELECT worker_id FROM orders WHERE id = $1
      ) ORDER BY t.created_at DESC LIMIT 20
    `, [id]),
  ])

  return NextResponse.json({
    success: true,
    data: { ...order, messages: messages.rows, transactions: transactions.rows },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  await dbReady
  await db.query(
    `UPDATE orders SET status = 'cancelled_by_admin', updated_at = NOW() WHERE id = $1`,
    [id],
  )

  return NextResponse.json({ success: true, data: null })
}
