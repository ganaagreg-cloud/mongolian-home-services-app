import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth, auth } from '@/lib/auth'
import { normalizePhone, validateMongolianPhone } from '@/lib/phone'

const patchSchema = z.object({
  name:       z.string().min(2, 'Нэр 2-50 тэмдэгт байх ёстой').max(50).optional(),
  email:      z.string().email('Имэйл хаяг буруу байна').optional(),
  avatar_url: z.string().url('Зурагны URL буруу байна').optional(),
  phone:      z.string().optional(),
  password:   z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой').optional(),
}).refine(
  (d) => Object.values(d).some((v) => v !== undefined),
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
  )).rows[0] as { id: string; phone: string | null; name: string; email: string; avatar_url: string } | undefined

  if (!user) {
    return NextResponse.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      id:        String(user.id),
      phone:     user.phone ?? '',
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

  const { name, email, avatar_url, phone: rawPhone, password } = parsed.data

  // Validate phone if provided
  let normalizedPhone: string | undefined
  if (rawPhone !== undefined) {
    normalizedPhone = normalizePhone(rawPhone)
    if (!validateMongolianPhone(normalizedPhone)) {
      return NextResponse.json({ success: false, error: 'Утасны дугаар буруу байна' }, { status: 400 })
    }
  }

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

  if (normalizedPhone !== undefined) {
    const conflict = (await db.query(
      `SELECT id FROM users WHERE phone = $1 AND id != $2`,
      [normalizedPhone, session.sub],
    )).rows[0]
    if (conflict) {
      return NextResponse.json(
        { success: false, error: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй' },
        { status: 409 },
      )
    }
  }

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1
  if (name !== undefined)            { sets.push(`name = $${idx++}`);       vals.push(name) }
  if (email !== undefined)           { sets.push(`email = $${idx++}`);      vals.push(email) }
  if (avatar_url !== undefined)      { sets.push(`avatar_url = $${idx++}`); vals.push(avatar_url) }
  if (normalizedPhone !== undefined) { sets.push(`phone = $${idx++}`);      vals.push(normalizedPhone) }
  vals.push(session.sub)

  if (sets.length > 0) {
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, vals)
  }

  // Set password via Better Auth (for OAuth users adding a password)
  if (password !== undefined) {
    try {
      await auth.api.setPassword({
        body:    { newPassword: password },
        headers: req.headers,
      })
    } catch {
      return NextResponse.json({ success: false, error: 'Нууц үг тохируулахад алдаа гарлаа' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true, data: undefined })
}
