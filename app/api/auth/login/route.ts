import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { verifyPassword, setSessionCookie } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
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

  const { email, password } = parsed.data

  await dbReady
  const user = (await db.query(
    'SELECT id, phone, role, password_hash, is_verified FROM users WHERE email = $1',
    [email],
  )).rows[0] as { id: string; phone: string; role: string; password_hash: string; is_verified: boolean } | undefined

  const passwordValid = user ? verifyPassword(password, user.password_hash) : false

  if (!user || !passwordValid) {
    return NextResponse.json(
      { success: false, error: 'Цахим хаяг эсвэл нууц үг буруу байна.' },
      { status: 401 },
    )
  }

  if (!user.is_verified) {
    return NextResponse.json(
      { success: false, needsVerification: true, phone: user.phone, error: 'Утасны дугаараа баталгаажуулна уу.' },
      { status: 403 },
    )
  }

  await setSessionCookie({ sub: String(user.id), role: user.role as UserRole, phone: user.phone })
  return NextResponse.json({ success: true, data: undefined })
}
