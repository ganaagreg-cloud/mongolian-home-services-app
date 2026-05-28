import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const Schema = z.object({ password: z.string().min(8) })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Нууц үг 8-аас дээш тэмдэгт байх ёстой' }, { status: 400 })
  }

  await dbReady
  const user = (await db.query(
    `SELECT better_auth_id FROM users WHERE id = $1`, [id]
  )).rows[0] as { better_auth_id: string | null } | undefined

  if (!user?.better_auth_id) {
    return NextResponse.json({ success: false, error: 'Энэ хэрэглэгч нэвтрэх данс байхгүй' }, { status: 404 })
  }

  // Update the credential account row in BA's account table
  const hash = hashPassword(parsed.data.password)
  await db.query(
    `UPDATE account SET password = $1, "updatedAt" = NOW()
     WHERE "userId" = $2 AND "providerId" = 'credential'`,
    [hash, user.better_auth_id],
  )

  return NextResponse.json({ success: true, data: null })
}
