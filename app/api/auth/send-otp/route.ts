import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { mockSMS } from '@/lib/mocks/sms'

const schema = z.object({
  phone: z.string().regex(/^\d{8}$/, 'Утасны дугаар 8 оронтой байх ёстой'),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу утасны дугаар' },
      { status: 400 },
    )
  }

  const { phone } = parsed.data
  const otp = String(Math.floor(100000 + Math.random() * 900000))
  // SQLite datetime('now') format: YYYY-MM-DD HH:MM:SS (UTC)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 19)

  // phone is PRIMARY KEY — replace atomically
  db.prepare('INSERT OR REPLACE INTO otp_codes (phone, code, expires_at) VALUES (?, ?, ?)').run(
    phone,
    otp,
    expiresAt,
  )

  const result = await mockSMS(phone, `Таны баталгаажуулах код: ${otp}`)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'SMS илгээхэд алдаа гарлаа. Дахин оролдоно уу.' },
      { status: 503 },
    )
  }

  return NextResponse.json({ success: true, data: undefined })
}
