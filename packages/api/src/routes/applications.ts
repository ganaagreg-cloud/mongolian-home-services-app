import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { notify } from '../lib/notifications'

const router = new Hono()

// Exported for use by the background expiry job in index.ts.
// Atomically frees the pending_payment slot and re-lists the order.
// Returns true if the order was expired, false if it was already in another state.
export async function expireOrder(orderId: string): Promise<boolean> {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query<{ status: string }>(
      `SELECT status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    )
    if (!rows[0] || rows[0].status !== 'awaiting_payment') {
      await client.query('ROLLBACK')
      return false
    }
    await client.query(
      `DELETE FROM worker_schedule WHERE order_id = $1 AND status = 'pending_payment'`,
      [orderId],
    )
    await client.query(
      `DELETE FROM payment_intents WHERE id LIKE ('INV-BID-' || $1::text || '-%') AND paid_at IS NULL`,
      [orderId],
    )
    await client.query(
      `UPDATE orders
       SET status           = 'pending_acceptances',
           worker_id        = NULL,
           payment_deadline = NULL,
           updated_at       = NOW()
       WHERE id = $1`,
      [orderId],
    )
    await client.query('COMMIT')
    return true
  } catch {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    return false
  } finally {
    client.release()
  }
}

const BANKS = [
  { name: 'Хаан банк',   description: 'Хаан банкны аппликейшнээр төлөх',  scheme: 'khanbank'  },
  { name: 'Голомт банк', description: 'Голомт банкны аппликейшнээр төлөх', scheme: 'golomt'    },
  { name: 'ХХБ (TDB)',   description: 'ХХБ аппликейшнээр төлөх',           scheme: 'tdbbank'   },
  { name: 'Төрийн банк', description: 'Төрийн банкны аппликейшнээр төлөх', scheme: 'statebank' },
  { name: 'Хас банк',    description: 'Хас банкны аппликейшнээр төлөх',    scheme: 'xacbank'   },
]

type ApplicationRow = {
  id: number; worker_id: number; status: string; created_at: string
  worker_name: string; worker_rating: number; worker_review_count: number
  worker_specialty: string; worker_price_per_hour: number
}

// GET /api/orders/:id/applications — customer views who has applied
router.get('/api/orders/:id/applications', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const orderId = c.req.param('id')
  await dbReady

  const order = (await db.query(
    'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, session.sub],
  )).rows[0]
  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  const rows = (await db.query<ApplicationRow>(`
    SELECT
      a.id, a.worker_id, a.status, a.created_at,
      u.name           AS worker_name,
      w.rating         AS worker_rating,
      w.review_count   AS worker_review_count,
      w.specialty      AS worker_specialty,
      w.price_per_hour AS worker_price_per_hour
    FROM  applications a
    JOIN  workers w ON w.id  = a.worker_id AND w.rejected_at IS NULL
    JOIN  users   u ON u.id  = w.user_id
    WHERE a.order_id = $1 AND a.status = 'pending'
    ORDER BY a.created_at ASC
  `, [orderId])).rows

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id:                 String(r.id),
      workerId:           String(r.worker_id),
      status:             r.status,
      workerName:         r.worker_name,
      workerRating:       r.worker_rating,
      workerReviewCount:  r.worker_review_count,
      workerSpecialty:    r.worker_specialty,
      workerPricePerHour: r.worker_price_per_hour,
      appliedAt:          r.created_at,
    })),
  })
})

// POST /api/orders/:id/apply — worker applies (non-binding, no calendar write)
router.post('/api/orders/:id/apply', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)
  if (!session.is_worker) return c.json({ success: false, error: 'Зөвхөн ажилтан өргөдлөө хийх боломжтой' }, 403)

  const orderId = c.req.param('id')
  await dbReady

  const workerRow = (await db.query<{ id: number }>(
    `SELECT id FROM workers
     WHERE user_id = $1 AND rejected_at IS NULL AND is_active = true AND is_available = true`,
    [session.sub],
  )).rows[0]
  if (!workerRow) return c.json({ success: false, error: 'Идэвхтэй ажилтны бүртгэл олдсонгүй' }, 403)

  const order = (await db.query<{
    id: string; status: string; user_id: string
    matching_strategy: string; service_type_id: number | null
  }>(
    'SELECT id, status, user_id, matching_strategy, service_type_id FROM orders WHERE id = $1',
    [orderId],
  )).rows[0]

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  // Self-match guard
  if (String(order.user_id) === String(session.sub)) {
    return c.json({ success: false, error: 'Өөрийн захиалгад өргөдлөө хийх боломжгүй' }, 403)
  }
  if (order.status !== 'pending_acceptances') {
    return c.json({ success: false, error: 'Энэ захиалга өргөдлөө хүлээхгүй байна' }, 409)
  }
  if (order.matching_strategy !== 'scheduled') {
    return c.json({ success: false, error: 'Захиалгын төрөл буруу байна' }, 409)
  }

  if (order.service_type_id) {
    const svc = (await db.query(
      'SELECT 1 FROM worker_services WHERE worker_id = $1 AND service_type_id = $2',
      [workerRow.id, order.service_type_id],
    )).rows[0]
    if (!svc) return c.json({ success: false, error: 'Энэ үйлчилгээг гүйцэтгэх эрхгүй байна' }, 403)
  }

  // Idempotent: re-applying after withdrawal re-activates the application
  await db.query(
    `INSERT INTO applications (worker_id, order_id)
     VALUES ($1, $2)
     ON CONFLICT (worker_id, order_id) DO UPDATE
       SET status = 'pending', updated_at = NOW()
       WHERE applications.status = 'withdrawn'`,
    [workerRow.id, orderId],
  )

  return c.json({ success: true, data: undefined }, 201)
})

// POST /api/orders/:id/select-worker — customer selects a worker and initiates payment.
// The worker_schedule INSERT (with exclusion constraint) runs BEFORE the QPay invoice is
// created — so money never moves for a slot we cannot honour.
const selectWorkerSchema = z.object({
  workerId: z.number().int().positive(),
})

router.post('/api/orders/:id/select-worker', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }
  const parsed = selectWorkerSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'workerId шаардлагатай' }, 400)
  const { workerId } = parsed.data

  const orderId = c.req.param('id')
  await dbReady

  const order = (await db.query<{
    id: string; status: string; user_id: string
    scheduled_date: string; hours: number; service_type_id: number | null
  }>(
    'SELECT id, status, user_id, scheduled_date, hours, service_type_id FROM orders WHERE id = $1',
    [orderId],
  )).rows[0]

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (String(order.user_id) !== String(session.sub)) {
    return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  }
  if (order.status !== 'pending_acceptances') {
    return c.json({ success: false, error: 'Ажилтан сонгох боломжгүй байна' }, 409)
  }

  const app = (await db.query(
    `SELECT id FROM applications WHERE order_id = $1 AND worker_id = $2 AND status = 'pending'`,
    [orderId, workerId],
  )).rows[0]
  if (!app) return c.json({ success: false, error: 'Ажилтан энэ захиалгад өргөдлөө хийгээгүй байна' }, 400)

  const invoiceId = `INV-BID-${orderId}-${Date.now()}`

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // INSERT worker_schedule FIRST — exclusion constraint is the conflict gate.
    // If 23P01 fires, no invoice is created and no money moves.
    await client.query(
      `INSERT INTO worker_schedule (worker_id, order_id, time_range, status)
       VALUES ($1, $2,
         tstzrange(
           $3::timestamptz,
           $3::timestamptz + ($4 * interval '1 hour') + interval '60 minutes'
         ),
         'pending_payment')`,
      [workerId, orderId, order.scheduled_date, order.hours],
    )

    await client.query(
      `UPDATE orders
       SET status           = 'awaiting_payment',
           worker_id        = $1,
           payment_deadline = NOW() + INTERVAL '30 minutes',
           updated_at       = NOW()
       WHERE id = $2`,
      [workerId, orderId],
    )

    await client.query(
      'INSERT INTO payment_intents (id, user_id) VALUES ($1, $2)',
      [invoiceId, session.sub],
    )

    await client.query('COMMIT')
  } catch (err: unknown) {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    const pgErr = err as { code?: string }
    if (pgErr.code === '23P01') {
      return c.json({ success: false, error: 'Ажилтан энэ цагт боломжгүй болсон байна' }, 409)
    }
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  } finally {
    client.release()
  }

  const qrText  = `QPay|${invoiceId}|homeservices|pay`
  const qrImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const urls    = BANKS.map(({ name, description, scheme }) => ({
    name, description, link: `${scheme}://qpay?id=${invoiceId}`,
  }))

  return c.json({ success: true, data: { invoice_id: invoiceId, qr_text: qrText, qr_image: qrImage, urls } })
})

// POST /api/payments/bid-confirm — QPay callback: books the slot, funds escrow,
// withdraws the selected worker's conflicting applications. No refund path here.
const bidConfirmSchema = z.object({ invoiceId: z.string().min(1) })

router.post('/api/payments/bid-confirm', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }
  const parsed = bidConfirmSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'invoiceId шаардлагатай' }, 400)
  const { invoiceId } = parsed.data

  // Extract orderId from invoice format: INV-BID-{orderId}-{timestamp}
  const parts = invoiceId.split('-')
  if (parts[0] !== 'INV' || parts[1] !== 'BID' || !parts[2]) {
    return c.json({ success: false, error: 'Нэхэмжлэл олдсонгүй' }, 404)
  }
  const orderId = Number(parts[2])
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return c.json({ success: false, error: 'Нэхэмжлэл олдсонгүй' }, 404)
  }

  await dbReady

  const intent = (await db.query(
    'SELECT id FROM payment_intents WHERE id = $1 AND user_id = $2 AND paid_at IS NULL',
    [invoiceId, session.sub],
  )).rows[0]
  if (!intent) return c.json({ success: false, error: 'Нэхэмжлэл олдсонгүй эсвэл аль хэдийн төлсөн байна' }, 404)

  let totalAmount = 0

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    // Lock the pending_payment row — prevents concurrent confirmations
    const schedRow = (await client.query<{ id: number; worker_id: number; time_range: string }>(
      `SELECT id, worker_id, time_range FROM worker_schedule
       WHERE order_id = $1 AND status = 'pending_payment'
       FOR UPDATE`,
      [orderId],
    )).rows[0]

    if (!schedRow) {
      await client.query('ROLLBACK')
      return c.json({ success: false, error: 'Захиалгын цаг боломжгүй болсон байна' }, 409)
    }

    const order = (await client.query<{
      id: string; status: string; user_id: string; total_amount: number
    }>(
      'SELECT id, status, user_id, total_amount FROM orders WHERE id = $1',
      [orderId],
    )).rows[0]

    if (!order || String(order.user_id) !== String(session.sub) || order.status !== 'awaiting_payment') {
      await client.query('ROLLBACK')
      return c.json({ success: false, error: 'Захиалга олдсонгүй эсвэл төлбөр хүлээхгүй байна' }, 409)
    }
    totalAmount = order.total_amount

    // Slot confirmed — pending_payment → booked
    await client.query(
      `UPDATE worker_schedule SET status = 'booked', updated_at = NOW() WHERE id = $1`,
      [schedRow.id],
    )

    // Fund escrow: mark intent paid + flip order to worker_assigned + payment paid
    await client.query(
      'UPDATE payment_intents SET paid_at = NOW() WHERE id = $1',
      [invoiceId],
    )
    await client.query(
      `UPDATE orders
       SET status         = 'worker_assigned',
           payment_status = 'paid',
           updated_at     = NOW()
       WHERE id = $1`,
      [orderId],
    )

    // Mark this application as selected
    await client.query(
      `UPDATE applications SET status = 'selected', updated_at = NOW()
       WHERE order_id = $1 AND worker_id = $2`,
      [orderId, schedRow.worker_id],
    )

    // Withdraw all other pending applications for this order
    await client.query(
      `UPDATE applications SET status = 'withdrawn', updated_at = NOW()
       WHERE order_id = $1 AND worker_id != $2 AND status = 'pending'`,
      [orderId, schedRow.worker_id],
    )

    // Auto-withdraw this worker's other pending applications whose slot overlaps
    // the now-booked range. Exclusion constraint is the hard backstop; this is UX.
    await client.query(
      `UPDATE applications a
       SET status = 'withdrawn', updated_at = NOW()
       WHERE a.worker_id = $1
         AND a.order_id  != $2
         AND a.status     = 'pending'
         AND EXISTS (
           SELECT 1 FROM orders o
           WHERE o.id = a.order_id
             AND tstzrange(
                   o.scheduled_date,
                   o.scheduled_date + (o.hours * interval '1 hour') + interval '60 minutes'
                 ) && $3::tstzrange
         )`,
      [schedRow.worker_id, orderId, schedRow.time_range],
    )

    await client.query('COMMIT')
  } catch {
    try { await client.query('ROLLBACK') } catch { /* ignore */ }
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  } finally {
    client.release()
  }

  void notify(session.sub, 'payment_confirmed', { orderId, amount: totalAmount })

  return c.json({ success: true, data: undefined })
})

// GET /api/orders/:id/pending-invoice — returns the current pending QPay invoice for an
// awaiting_payment order. Used by the confirm screen to re-enter without re-calling select-worker
// (handles React StrictMode double-mount and customer navigating back then forward).
router.get('/api/orders/:id/pending-invoice', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const orderId = c.req.param('id')
  await dbReady

  const order = (await db.query(
    `SELECT id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'awaiting_payment'`,
    [orderId, session.sub],
  )).rows[0]
  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  const row = (await db.query<{ id: string }>(
    `SELECT id FROM payment_intents
     WHERE id LIKE ('INV-BID-' || $1::text || '-%')
       AND user_id = $2
       AND paid_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [orderId, session.sub],
  )).rows[0]

  if (!row) return c.json({ success: false, error: 'Нэхэмжлэл олдсонгүй' }, 404)

  const invoiceId = row.id
  const qrText    = `QPay|${invoiceId}|homeservices|pay`
  const qrImage   = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const urls      = BANKS.map(({ name, description, scheme }) => ({
    name, description, link: `${scheme}://qpay?id=${invoiceId}`,
  }))

  return c.json({ success: true, data: { invoice_id: invoiceId, qr_text: qrText, qr_image: qrImage, urls } })
})

// POST /api/orders/:id/expire-payment — called when payment_deadline has passed.
// Releases the pending_payment slot (frees exclusion constraint) and re-lists
// the order. Nothing was captured so there is NO refund logic.
router.post('/api/orders/:id/expire-payment', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const orderId = c.req.param('id')
  await dbReady

  const order = (await db.query<{
    id: string; status: string; user_id: string; payment_deadline: string | null
  }>(
    'SELECT id, status, user_id, payment_deadline FROM orders WHERE id = $1 AND user_id = $2',
    [orderId, session.sub],
  )).rows[0]

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (order.status !== 'awaiting_payment') {
    return c.json({ success: false, error: 'Захиалга төлбөр хүлээхгүй байна' }, 409)
  }
  if (!order.payment_deadline || new Date(order.payment_deadline) > new Date()) {
    return c.json({ success: false, error: 'Төлбөрийн хугацаа дуусаагүй байна' }, 409)
  }

  const ok = await expireOrder(orderId)
  if (!ok) return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)

  return c.json({ success: true, data: undefined })
})

export default router
