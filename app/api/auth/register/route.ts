import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const schema = z.object({
  firstName: z.string().min(1).max(50),
  lastName:  z.string().min(1).max(50),
  email:     z.string().email('Цахим хаяг буруу байна.'),
  phone:     z.string().regex(/^\d{8}$/, 'Утасны дугаар 8 оронтой байх ёстой.'),
  password:  z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.'),
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

  const { firstName, lastName, email, phone, password } = parsed.data

  await dbReady

  const takenEmail = (await db.query('SELECT id FROM users WHERE email = $1', [email])).rows[0]
  if (takenEmail) {
    return NextResponse.json(
      { success: false, error: 'Энэ цахим хаяг аль хэдийн бүртгэлтэй байна.' },
      { status: 409 },
    )
  }

  const takenPhone = (await db.query('SELECT id FROM users WHERE phone = $1', [phone])).rows[0]
  if (takenPhone) {
    return NextResponse.json(
      { success: false, error: 'Энэ утасны дугаар аль хэдийн бүртгэлтэй байна.' },
      { status: 409 },
    )
  }

  const passwordHash = hashPassword(password)
  const displayName = `${firstName} ${lastName}`.trim()

  try {
    await db.query(
      `INSERT INTO users (phone, name, username, password_hash, first_name, last_name, email, role)
       VALUES ($1, $2, '', $3, $4, $5, $6, 'user')`,
      [phone, displayName, passwordHash, firstName, lastName, email],
    )
  } catch {
    return NextResponse.json({ success: false, error: 'Бүртгэхэд алдаа гарлаа.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: undefined })
}
