import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const patchSchema = z.object({
  name:       z.string().min(2, 'Нэр 2-50 тэмдэгт байх ёстой').max(50, 'Нэр 2-50 тэмдэгт байх ёстой').optional(),
  email:      z.string().email('Имэйл хаяг буруу байна').optional(),
  avatar_url: z.string().url('Зурагны URL буруу байна').optional(),
}).refine(
  (d) => d.name !== undefined || d.email !== undefined || d.avatar_url !== undefined,
  { message: 'Хамгийн багадаа нэг талбар шаардлагатай' },
)

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const user = (await db.query(
    'SELECT id, phone, name, email, avatar_url FROM users WHERE id = $1',
    [session.sub],
  )).rows[0] as { id: string; phone: string; name: string; email: string; avatar_url: string } | undefined

  if (!user) {
    return NextResponse.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      id:        String(user.id),
      phone:     user.phone,
      name:      user.name,
      email:     user.email,
      avatarUrl: user.avatar_url,
    },
  })
}

export async function PATCH(req: NextRequest) {
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

  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const { name, email, avatar_url } = parsed.data

  await dbReady

  if (email !== undefined) {
    const conflict = (await db.query(
      `SELECT id FROM users WHERE email = $1 AND id != $2 AND email != ''`,
      [email, session.sub],
    )).rows[0]
    if (conflict) {
      return NextResponse.json(
        { success: false, error: 'Энэ имэйл хаяг аль хэдийн бүртгэлтэй' },
        { status: 409 },
      )
    }
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1
  if (name !== undefined)       { sets.push(`name = $${idx++}`);       vals.push(name) }
  if (email !== undefined)      { sets.push(`email = $${idx++}`);      vals.push(email) }
  if (avatar_url !== undefined) { sets.push(`avatar_url = $${idx++}`); vals.push(avatar_url) }
  vals.push(session.sub)

  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, vals)

  return NextResponse.json({ success: true, data: undefined })
}
