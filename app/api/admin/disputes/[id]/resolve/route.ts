import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

const schema = z.object({
  compensationAmount: z.number().int().min(0).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const { id } = await params
  const { compensationAmount } = parsed.data

  await dbReady
  const result = await db.query(`
    UPDATE disputes
    SET    status = 'resolved',
           compensation_amount = $1,
           updated_at = NOW()
    WHERE  id = $2 AND status = 'open'
  `, [compensationAmount ?? null, id])

  if (!result.rowCount) {
    return NextResponse.json({ success: false, error: 'Гомдол олдсонгүй эсвэл аль хэдийн шийдэгдсэн' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: undefined })
}
