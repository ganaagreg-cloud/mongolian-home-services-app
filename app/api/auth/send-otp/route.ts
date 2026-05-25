import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
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
  const otp = process.env.NODE_ENV === 'development'
    ? '123456'
    : String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

  await dbReady
  await db.query(
    `INSERT INTO otp_codes (phone, code, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at`,
    [phone, otp, expiresAt],
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
