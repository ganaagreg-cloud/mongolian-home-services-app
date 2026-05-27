import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { mockDANVerification } from '@/lib/mocks/dan'
import { requireAuth, setSessionCookie } from '@/lib/auth'
import type { UserRole } from '@/lib/types'

const schema = z.object({
  phone: z.string().regex(/^\d{8}$/).optional(),
  code:  z.string().optional(),
})

export async function GET() {
  // Authorization endpoint — returns a mock auth_url with a pre-filled code
  const state = crypto.randomUUID()
  const auth_url = `/api/auth/dan?code=mock-auth-code&state=${state}`
  return NextResponse.json({ success: true, data: { auth_url, state } })
}

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch { body = {} }

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

  await dbReady

  // If already logged in (worker registration flow), mark their account dan_verified
  const session = await requireAuth(req)
  if (session) {
    const user = (await db.query(
      'SELECT id, name FROM users WHERE id = $1 AND deleted_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string; name: string } | undefined

    if (!user) {
      return NextResponse.json({ success: false, error: 'Хэрэглэгч олдсонгүй' }, { status: 404 })
    }

    await db.query(
      'UPDATE users SET dan_verified = true, is_verified = true WHERE id = $1',
      [user.id],
    )

    const firstname = result.firstname ?? ''
    const lastname  = result.lastname  ?? ''
    const registernumber = result.registernumber ?? ''
    if (firstname || lastname || registernumber) {
      await db.query(
        'UPDATE users SET firstname = $1, lastname = $2, registernumber = $3 WHERE id = $4',
        [firstname, lastname, registernumber, user.id],
      )
    }

    return NextResponse.json({
      success: true,
      data: { firstname, lastname, registernumber, fullName: user.name || result.fullName },
    })
  }

  // Not logged in: upsert user by registernumber or phone
  const phone = parsed.data.phone ?? String(90000000 + Math.floor(Math.random() * 9999999))
  const firstname    = result.firstname    ?? ''
  const lastname     = result.lastname     ?? ''
  const registernumber = result.registernumber ?? ''

  let user = (await db.query(
    'SELECT id, phone, role FROM users WHERE phone = $1 AND deleted_at IS NULL',
    [phone],
  )).rows[0] as { id: string; phone: string; role: string } | undefined

  if (!user) {
    const inserted = (await db.query(
      `INSERT INTO users (phone, name, firstname, lastname, registernumber, role, dan_verified, is_verified)
       VALUES ($1, $2, $3, $4, $5, 'user', true, true)
       RETURNING id`,
      [phone, result.fullName ?? '', firstname, lastname, registernumber],
    )).rows[0] as { id: string }
    user = { id: String(inserted.id), phone, role: 'user' }
  } else {
    await db.query(
      'UPDATE users SET dan_verified = true, is_verified = true, firstname = $1, lastname = $2, registernumber = $3 WHERE id = $4',
      [firstname, lastname, registernumber, user.id],
    )
  }

  await setSessionCookie({ sub: user.id, role: user.role as UserRole, phone: user.phone })
  return NextResponse.json({ success: true, data: { firstname, lastname, registernumber, fullName: result.fullName } })
}
