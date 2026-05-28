import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const paramsSchema = z.object({ worker_id: z.coerce.number().int().positive() })

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ worker_id: string }> },
) {
  const { worker_id: rawId } = await params
  const paramParsed = paramsSchema.safeParse({ worker_id: rawId })
  if (!paramParsed.success) {
    return NextResponse.json({ success: false, error: 'Буруу ажилтны ID' }, { status: 400 })
  }

  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  await db.query(
    'DELETE FROM saved_workers WHERE user_id = $1 AND worker_id = $2',
    [session.sub, paramParsed.data.worker_id],
  )

  return NextResponse.json({ success: true, data: undefined })
}
