import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const schema = z.object({
  phone: z.string().regex(/^\d{8}$/),
  otp: z.string().length(6),
})

type OtpRow = { code: string }
type UserRow = { id: string; phone: string; role: string }

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const { phone, otp } = parsed.data

  // Find a valid, unexpired OTP for this phone
  const record = db
    .prepare(`SELECT code FROM otp_codes WHERE phone = ? AND expires_at > datetime('now')`)
    .get(phone) as OtpRow | undefined

  if (!record || record.code !== otp) {
    return NextResponse.json(
      { success: false, error: 'Код буруу эсвэл хугацаа дууссан байна. Дахин авна уу.' },
      { status: 400 },
    )
  }

  // Consume the OTP
  db.prepare('DELETE FROM otp_codes WHERE phone = ?').run(phone)

  // Find or create user
  let user = db.prepare('SELECT id, phone, role FROM users WHERE phone = ?').get(phone) as UserRow | undefined
  if (!user) {
    const id = crypto.randomUUID()
    db.prepare('INSERT INTO users (id, phone, name, role, dan_verified) VALUES (?, ?, ?, ?, ?)').run(
      id, phone, '', 'user', 0,
    )
    user = { id, phone, role: 'user' }
  }

  await setSessionCookie({ sub: user.id, role: user.role as UserRole, phone: user.phone })

  return NextResponse.json({ success: true, data: undefined })
}
