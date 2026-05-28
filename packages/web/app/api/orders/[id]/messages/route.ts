import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Message } from '@/lib/types'

const ACTIVE_STATUSES = `('searching_worker','pending_acceptances','pending_worker_acceptance','worker_assigned','worker_on_the_way','in_progress')`

type MessageRow = {
  id: string
  order_id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
}

async function resolveAccess(orderId: string, userId: string) {
  const row = (await db.query(
    `SELECT o.user_id, o.worker_id, o.status, w.user_id AS worker_user_id
     FROM orders o
     LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
     WHERE o.id = $1`,
    [orderId],
  )).rows[0] as { user_id: string; worker_id: string | null; status: string; worker_user_id: string | null } | undefined

  if (!row) return null
  const isOwner = String(row.user_id) === String(userId)
  const isWorker = row.worker_user_id != null && String(row.worker_user_id) === String(userId)
  if (!isOwner && !isWorker) return null
  return row
}

// GET /api/orders/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })

  const { id } = await params
  await dbReady

  const order = await resolveAccess(id, session.sub)
  if (!order) return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  if (!ACTIVE_STATUSES.includes(`'${order.status}'`)) {
    return NextResponse.json({ success: false, error: 'Чат зөвхөн идэвхтэй захиалгад боломжтой' }, { status: 403 })
  }

  const rows = (await db.query(
    `SELECT m.id, m.order_id, m.sender_id, u.name AS sender_name, m.text, m.created_at
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.order_id = $1
     ORDER BY m.created_at ASC`,
    [id],
  )).rows as MessageRow[]

  const messages: Message[] = rows.map((r) => ({
    id:         String(r.id),
    orderId:    String(r.order_id),
    senderId:   String(r.sender_id),
    senderName: r.sender_name,
    text:       r.text,
    createdAt:  r.created_at,
  }))

  return NextResponse.json({ success: true, data: messages })
}

// POST /api/orders/[id]/messages
const sendSchema = z.object({ text: z.string().min(1).max(1000) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Мессеж хоосон байж болохгүй' }, { status: 400 })
  }

  const { id } = await params
  await dbReady

  const order = await resolveAccess(id, session.sub)
  if (!order) return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  if (!ACTIVE_STATUSES.includes(`'${order.status}'`)) {
    return NextResponse.json({ success: false, error: 'Чат зөвхөн идэвхтэй захиалгад боломжтой' }, { status: 403 })
  }

  const row = (await db.query(
    `INSERT INTO messages (order_id, sender_id, text)
     VALUES ($1, $2, $3)
     RETURNING id, order_id, sender_id, text, created_at`,
    [id, session.sub, parsed.data.text],
  )).rows[0] as { id: string; order_id: string; sender_id: string; text: string; created_at: string }

  const nameRow = (await db.query('SELECT name FROM users WHERE id = $1', [session.sub]))
    .rows[0] as { name: string }

  const message: Message = {
    id:         String(row.id),
    orderId:    String(row.order_id),
    senderId:   String(row.sender_id),
    senderName: nameRow.name,
    text:       row.text,
    createdAt:  row.created_at,
  }

  return NextResponse.json({ success: true, data: message }, { status: 201 })
}
