import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  invoiceId: z.string().min(1),
})

export async function POST(req: NextRequest) {
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
    return NextResponse.json({ success: false, error: 'invoiceId шаардлагатай' }, { status: 400 })
  }

  // invoiceId format: INV-{orderId}-{timestamp}
  const parts = parsed.data.invoiceId.split('-')
  const orderId = parts[1]
  if (!orderId) {
    return NextResponse.json({ success: false, error: 'Буруу invoiceId формат' }, { status: 400 })
  }

  await dbReady
  await db.query(
    `UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
    [orderId],
  )

  return NextResponse.json({ success: true, data: undefined })
}
