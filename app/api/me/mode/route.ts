import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  mode: z.enum(['user', 'worker']),
})

export async function PATCH(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

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

  const { mode } = parsed.data

  await dbReady

  if (mode === 'worker' && !session.is_worker) {
    return NextResponse.json({ success: false, error: 'Та ажилтан биш байна' }, { status: 403 })
  }

  await db.query('UPDATE users SET active_mode = $1 WHERE id = $2', [mode, session.sub])

  return NextResponse.json({ success: true, data: { activeMode: mode } })
}
