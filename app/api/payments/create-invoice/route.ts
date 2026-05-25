import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const schema = z.object({
  orderId: z.string().min(1),
})

const BANKS = [
  { name: 'Хаан банк',   description: 'Хаан банкны аппликейшнээр төлөх',   scheme: 'khanbank'   },
  { name: 'Голомт банк', description: 'Голомт банкны аппликейшнээр төлөх',  scheme: 'golomt'     },
  { name: 'ХХБ (TDB)',   description: 'ХХБ аппликейшнээр төлөх',            scheme: 'tdbbank'    },
  { name: 'Төрийн банк', description: 'Төрийн банкны аппликейшнээр төлөх',  scheme: 'statebank'  },
  { name: 'Хас банк',    description: 'Хас банкны аппликейшнээр төлөх',     scheme: 'xacbank'    },
]

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
    return NextResponse.json({ success: false, error: 'orderId шаардлагатай' }, { status: 400 })
  }

  const { orderId } = parsed.data

  await dbReady
  const order = (await db.query(
    'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, session.sub],
  )).rows[0]

  if (!order) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  const invoice_id = `INV-${orderId}-${Date.now()}`
  const qr_text = `QPay|${invoice_id}|homeservices|pay`
  // Placeholder base64 1x1 transparent PNG
  const qr_image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  const urls = BANKS.map(({ name, description, scheme }) => ({
    name,
    description,
    link: `${scheme}://qpay?id=${invoice_id}`,
  }))

  await db.query(
    `UPDATE orders SET payment_gateway = 'qpay', gateway_invoice_id = $1, updated_at = NOW() WHERE id = $2`,
    [invoice_id, orderId],
  )

  return NextResponse.json({
    success: true,
    data: { invoice_id, qr_text, qr_image, urls },
  })
}
