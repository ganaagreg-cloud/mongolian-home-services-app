import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'

const router = new Hono()

const BANKS = [
  { name: 'Хаан банк',   description: 'Хаан банкны аппликейшнээр төлөх',  scheme: 'khanbank'  },
  { name: 'Голомт банк', description: 'Голомт банкны аппликейшнээр төлөх', scheme: 'golomt'    },
  { name: 'ХХБ (TDB)',   description: 'ХХБ аппликейшнээр төлөх',           scheme: 'tdbbank'   },
  { name: 'Төрийн банк', description: 'Төрийн банкны аппликейшнээр төлөх', scheme: 'statebank' },
  { name: 'Хас банк',    description: 'Хас банкны аппликейшнээр төлөх',    scheme: 'xacbank'   },
]

const invoiceSchema = z.object({ orderId: z.string().min(1) })
const simPaySchema  = z.object({ invoiceId: z.string().min(1) })

// POST /api/payments/create-invoice
router.post('/api/payments/create-invoice', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = invoiceSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'orderId шаардлагатай' }, 400)

  const { orderId } = parsed.data

  await dbReady
  const order = (await db.query(
    'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, session.sub],
  )).rows[0]

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  const invoice_id = `INV-${orderId}-${Date.now()}`
  const qr_text    = `QPay|${invoice_id}|homeservices|pay`
  const qr_image   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  const urls = BANKS.map(({ name, description, scheme }) => ({
    name, description, link: `${scheme}://qpay?id=${invoice_id}`,
  }))

  await db.query(
    `UPDATE orders SET payment_gateway = 'qpay', gateway_invoice_id = $1, updated_at = NOW() WHERE id = $2`,
    [invoice_id, orderId],
  )

  return c.json({ success: true, data: { invoice_id, qr_text, qr_image, urls } })
})

// POST /api/payments/dev-sim-pay
router.post('/api/payments/dev-sim-pay', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = simPaySchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'invoiceId шаардлагатай' }, 400)

  const parts = parsed.data.invoiceId.split('-')
  const orderId = parts[1]
  if (!orderId) return c.json({ success: false, error: 'Буруу invoiceId формат' }, 400)

  await dbReady
  await db.query(
    `UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
    [orderId],
  )

  return c.json({ success: true, data: undefined })
})

export default router
