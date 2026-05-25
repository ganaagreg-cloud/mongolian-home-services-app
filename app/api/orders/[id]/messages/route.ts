import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { Message } from '@/lib/types'

type MessageRow = {
  id: string
  order_id: string
  sender_id: string
  sender_name: string
  text: string
  created_at: string
}

async function checkOwnership(orderId: string, userId: string): Promise<boolean> {
  const result = await db.query(`
    SELECT o.id
    FROM   orders o
    LEFT JOIN workers w ON w.id = o.worker_id
    WHERE  o.id = $1 AND (o.user_id = $2 OR w.user_id = $2)
  `, [orderId, userId])
  return result.rows.length > 0
}

function rowToMessage(row: MessageRow): Message {
  return {
    id:         String(row.id),
    orderId:    String(row.order_id),
    senderId:   String(row.sender_id),
    senderName: row.sender_name,
    text:       row.text,
    createdAt:  row.created_at,
  }
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

  const owned = await checkOwnership(id, session.sub)
  if (!owned) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 403 })
  }

  const rows = (await db.query(`
    SELECT m.id, m.order_id, m.sender_id, u.name AS sender_name, m.text, m.created_at
    FROM   messages m
    JOIN   users u ON u.id = m.sender_id
    WHERE  m.order_id = $1
    ORDER  BY m.created_at ASC
  `, [id])).rows as MessageRow[]

  return NextResponse.json({ success: true, data: rows.map(rowToMessage) })
}

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

  const parsed = body as { text?: unknown }
  if (typeof parsed.text !== 'string' || parsed.text.trim().length === 0 || parsed.text.length > 1000) {
    return NextResponse.json({ success: false, error: 'Мессеж буруу байна' }, { status: 400 })
  }
  const text = parsed.text.trim()

  const { id } = await params

  await dbReady

  const owned = await checkOwnership(id, session.sub)
  if (!owned) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 403 })
  }

  const inserted = (await db.query(`
    INSERT INTO messages (order_id, sender_id, text)
    VALUES ($1, $2, $3)
    RETURNING id, order_id, sender_id, text, created_at
  `, [id, session.sub, text])).rows[0] as Omit<MessageRow, 'sender_name'>

  const userRow = (await db.query(
    'SELECT name FROM users WHERE id = $1',
    [session.sub],
  )).rows[0] as { name: string }

  const message: Message = {
    id:         String(inserted.id),
    orderId:    String(inserted.order_id),
    senderId:   String(inserted.sender_id),
    senderName: userRow.name,
    text:       inserted.text,
    createdAt:  inserted.created_at,
  }

  return NextResponse.json({ success: true, data: message }, { status: 201 })
}
