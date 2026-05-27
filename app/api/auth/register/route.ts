import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db, dbReady } from '@/lib/db'
import { normalizePhone, validateMongolianPhone, phoneToEmail } from '@/lib/phone'

const schema = z.object({
  firstName:       z.string().min(1),
  lastName:        z.string().min(1),
  phone:           z.string().min(1),
  password:        z.string().min(8, 'Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой'),
  confirmPassword: z.string().min(1),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Нууц үг таарахгүй байна',
  path:    ['confirmPassword'],
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

  const { firstName, lastName, password } = parsed.data
  const phone = normalizePhone(parsed.data.phone)

  if (!validateMongolianPhone(phone)) {
    return NextResponse.json({ success: false, error: 'Утасны дугаар буруу байна' }, { status: 400 })
  }

  await dbReady

  // Reject if phone already registered
  const existing = (await db.query('SELECT id FROM users WHERE phone = $1', [phone])).rows[0]
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Энэ утасны дугаартай хэрэглэгч аль хэдийн бүртгэлтэй байна' },
      { status: 409 },
    )
  }

  const email = phoneToEmail(phone)
  const name  = `${firstName} ${lastName}`

  try {
    await auth.api.signUpEmail({
      body:    { name, email, password },
      headers: req.headers,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Бүртгэл үүсгэхэд алдаа гарлаа' },
      { status: 500 },
    )
  }

  // Provision phone + name breakdown on the users row the hook just inserted
  try {
    await db.query(
      `UPDATE users SET phone = $1, first_name = $2, last_name = $3
       WHERE email = $4`,
      [phone, firstName, lastName, email],
    )
  } catch {
    // Non-fatal: user is created, phone can be added in onboarding
  }

  return NextResponse.json({ success: true })
}
