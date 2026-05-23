import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { mockDANVerification } from '@/lib/mocks/dan'
import { setSessionCookie } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

// phone optional — in a real DAN OAuth flow the phone comes from DAN, not the user
const schema = z.object({
  phone: z.string().regex(/^\d{8}$/).optional(),
})

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

  const result = await mockDANVerification(parsed.data.phone ?? '')
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error ?? 'ДАН системтэй холбогдоход алдаа гарлаа.' },
      { status: 503 },
    )
  }

  // Use provided phone or generate a unique mock one (DAN would supply it in real flow)
  const phone = parsed.data.phone ?? String(90000000 + Math.floor(Math.random() * 9999999))

  let user = db.prepare('SELECT id, phone, role FROM users WHERE phone = ?').get(phone) as UserRow | undefined
  if (!user) {
    const id = crypto.randomUUID()
    db.prepare('INSERT INTO users (id, phone, name, role, dan_verified) VALUES (?, ?, ?, ?, ?)').run(
      id, phone, result.fullName ?? '', 'user', 1,
    )
    user = { id, phone, role: 'user' }
  } else {
    db.prepare('UPDATE users SET dan_verified = 1 WHERE id = ?').run(user.id)
  }

  await setSessionCookie({ sub: user.id, role: user.role as UserRole, phone: user.phone })

  return NextResponse.json({ success: true, data: { fullName: result.fullName } })
}
