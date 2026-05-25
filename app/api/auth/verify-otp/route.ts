import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { setSessionCookie } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const schema = z.object({
  phone: z.string().regex(/^\d{8}$/),
  otp:   z.string().length(6),
})

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

  await dbReady

  const user = (await db.query(
    'SELECT id, phone, role FROM users WHERE phone = $1',
    [phone],
  )).rows[0] as { id: string; phone: string; role: string } | undefined

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Бүртгэлгүй утасны дугаар. Эхлээд бүртгүүлнэ үү.' },
      { status: 404 },
    )
  }

  const record = (await db.query(
    'SELECT code FROM otp_codes WHERE phone = $1 AND expires_at > NOW()',
    [phone],
  )).rows[0] as { code: string } | undefined

  if (!record || record.code !== otp) {
    return NextResponse.json(
      { success: false, error: 'Код буруу эсвэл хугацаа дууссан байна. Дахин авна уу.' },
      { status: 400 },
    )
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query('DELETE FROM otp_codes WHERE phone = $1', [phone])
    await client.query('UPDATE users SET is_verified = true WHERE id = $1', [user.id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  await setSessionCookie({ sub: String(user.id), role: user.role as UserRole, phone: user.phone })
  return NextResponse.json({ success: true, data: undefined })
}
