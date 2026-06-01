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

const simPaySchema = z.object({ invoiceId: z.string().min(1) })

// POST /api/payments/create-invoice
// Creates a payment intent (no order row yet — order is only inserted after confirmation).
router.post('/api/payments/create-invoice', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const invoice_id = `INV-${session.sub}-${Date.now()}`
  const qr_text    = `QPay|${invoice_id}|homeservices|pay`
  const qr_image   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

  await db.query(
    'INSERT INTO payment_intents (id, user_id) VALUES ($1, $2)',
    [invoice_id, session.sub],
  )

  const urls = BANKS.map(({ name, description, scheme }) => ({
    name, description, link: `${scheme}://qpay?id=${invoice_id}`,
  }))

  return c.json({ success: true, data: { invoice_id, qr_text, qr_image, urls } })
})

// POST /api/payments/dev-sim-pay
// Dev-only: marks the payment intent as paid. POST /api/orders checks this before inserting.
router.post('/api/payments/dev-sim-pay', async (c) => {
  if (process.env.NODE_ENV === 'production') return c.json({ success: false, error: 'Зөвхөн хөгжүүлэлтийн орчинд' }, 403)

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = simPaySchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'invoiceId шаардлагатай' }, 400)

  await dbReady

  const result = await db.query(
    `UPDATE payment_intents SET paid_at = NOW()
     WHERE id = $1 AND user_id = $2 AND paid_at IS NULL`,
    [parsed.data.invoiceId, session.sub],
  )

  if (!result.rowCount) {
    return c.json({ success: false, error: 'Нэхэмжлэл олдсонгүй эсвэл аль хэдийн төлсөн байна' }, 404)
  }

  return c.json({ success: true, data: undefined })
})

export default router
