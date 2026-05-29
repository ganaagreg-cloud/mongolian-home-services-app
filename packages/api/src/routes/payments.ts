import { Router } from 'express'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'

const router = Router()

const BANKS = [
  { name: 'Хаан банк',   description: 'Хаан банкны аппликейшнээр төлөх',   scheme: 'khanbank'  },
  { name: 'Голомт банк', description: 'Голомт банкны аппликейшнээр төлөх',  scheme: 'golomt'    },
  { name: 'ХХБ (TDB)',   description: 'ХХБ аппликейшнээр төлөх',            scheme: 'tdbbank'   },
  { name: 'Төрийн банк', description: 'Төрийн банкны аппликейшнээр төлөх',  scheme: 'statebank' },
  { name: 'Хас банк',    description: 'Хас банкны аппликейшнээр төлөх',     scheme: 'xacbank'   },
]

// POST /api/payments/create-invoice
router.post('/payments/create-invoice', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ orderId: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'orderId шаардлагатай' }); return }

    const { orderId } = parsed.data
    await dbReady

    const order = (await db.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [orderId, session.sub],
    )).rows[0]
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }

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

    res.json({ success: true, data: { invoice_id, qr_text, qr_image, urls } })
  } catch (err) {
    console.error('[payments/create-invoice POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/payments/dev-sim-pay
router.post('/payments/dev-sim-pay', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ invoiceId: z.string().min(1) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'invoiceId шаардлагатай' }); return }

    const parts   = parsed.data.invoiceId.split('-')
    const orderId = parts[1]
    if (!orderId) { res.status(400).json({ success: false, error: 'Буруу invoiceId формат' }); return }

    await dbReady
    await db.query(
      `UPDATE orders SET payment_status = 'paid', updated_at = NOW() WHERE id = $1`,
      [orderId],
    )

    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[payments/dev-sim-pay POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
