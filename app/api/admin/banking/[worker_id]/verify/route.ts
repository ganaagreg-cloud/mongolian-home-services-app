import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({ action: z.enum(['approve', 'reject']) })

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ worker_id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'action нь "approve" эсвэл "reject" байх ёстой' }, { status: 400 })
  }

  const { worker_id } = await params
  await dbReady

  const row = (await db.query(
    'SELECT id FROM banking_info WHERE worker_id = $1',
    [worker_id],
  )).rows[0] as { id: string } | undefined

  if (!row) {
    return NextResponse.json({ success: false, error: 'Банкны мэдээлэл олдсонгүй' }, { status: 404 })
  }

  if (parsed.data.action === 'approve') {
    await db.query(
      'UPDATE banking_info SET verified = true, updated_at = NOW() WHERE worker_id = $1',
      [worker_id],
    )
  } else {
    // reject: delete so the worker can re-submit fresh banking info
    await db.query('DELETE FROM banking_info WHERE worker_id = $1', [worker_id])
  }

  return NextResponse.json({ success: true, data: undefined })
}
