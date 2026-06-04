import { Hono } from 'hono'
import { z } from 'zod'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { getSettings } from '../lib/settings'
import { notify } from '../lib/notifications'
import type {
  Order, OrderStatus, PaymentStatus, PropertyType, MatchingStrategy, PricingModel,
  SurveyDetails, OrderAcceptance, Message,
} from '@homeservices/shared'

const router = new Hono()

const UPLOAD_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')

type OrderRow = {
  id: string; user_id: string; worker_id: string | null; worker_name: string | null
  service: string; status: string; address: string; scheduled_date: string
  hours: number; total_amount: number; urgent: boolean
  rooms: number | null; area_sqm: number | null
  property_type: string | null; notes: string | null
  matching_strategy: string | null; payment_status: string
  before_photo_url: string | null; after_photo_url: string | null
  pricing_model: string | null; survey_details: SurveyDetails | null
  created_at: string; updated_at: string
}

function toOrder(row: OrderRow): Order {
  return {
    id:               String(row.id),
    userId:           String(row.user_id),
    workerId:         row.worker_id ? String(row.worker_id) : null,
    workerName:       row.worker_name ?? undefined,
    service:          row.service,
    status:           row.status as OrderStatus,
    address:          row.address,
    scheduledDate:    row.scheduled_date,
    hours:            row.hours,
    totalAmount:      row.total_amount,
    urgent:           Boolean(row.urgent),
    rooms:            row.rooms ?? undefined,
    areaSqm:          row.area_sqm ?? undefined,
    propertyType:     row.property_type as PropertyType | undefined,
    notes:            row.notes ?? undefined,
    matchingStrategy: (row.matching_strategy ?? 'scheduled') as MatchingStrategy,
    paymentStatus:    row.payment_status as PaymentStatus,
    beforePhotoUrl:   row.before_photo_url ?? undefined,
    afterPhotoUrl:    row.after_photo_url ?? undefined,
    pricingModel:     (row.pricing_model as PricingModel | null) ?? undefined,
    surveyDetails:    row.survey_details ?? undefined,
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  }
}

const ACTIVE_STATUSES = `('searching_worker','pending_acceptances','awaiting_payment','pending_worker_acceptance','worker_assigned','worker_on_the_way','in_progress','awaiting_quote','quote_submitted')`

const SELECT_COLS = `
  o.id, o.user_id, o.worker_id, u.name as worker_name,
  COALESCE(st.name_mn, '') AS service, o.status, o.address, o.scheduled_date,
  o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
  o.property_type, o.notes, o.matching_strategy, o.payment_status,
  o.before_photo_url, o.after_photo_url,
  st.pricing_model, o.survey_details,
  o.created_at, o.updated_at`

const JOIN_WORKER = `
  LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
  LEFT JOIN users   u ON u.id = w.user_id
  LEFT JOIN service_types st ON st.id = o.service_type_id`

// GET /api/orders
router.get('/api/orders', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  if (session.is_worker && c.req.query('scheduled') === '1') {
    const workerRow = (await db.query(
      'SELECT id, is_available, is_active FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string; is_available: boolean; is_active: boolean } | undefined

    if (!workerRow || !workerRow.is_available || !workerRow.is_active) {
      return c.json({ success: true, data: [] })
    }
    const rows = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.status = 'pending_acceptances'
        AND o.matching_strategy = 'scheduled'
        AND EXISTS (
          SELECT 1 FROM worker_services ws
          WHERE ws.worker_id = $1 AND ws.service_type_id = o.service_type_id
        )
        AND o.user_id != $2
        AND NOT EXISTS (
          SELECT 1 FROM applications a
          WHERE a.order_id = o.id AND a.worker_id = $1 AND a.status != 'withdrawn'
        )
      ORDER BY o.created_at DESC
    `, [workerRow.id, session.sub])).rows as OrderRow[]
    return c.json({ success: true, data: rows.map(toOrder) })
  }

  if (session.is_worker && c.req.query('worker_active') === '1') {
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string } | undefined
    if (!workerRow) return c.json({ success: true, data: null })
    const row = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.worker_id = $1
        AND o.status IN ('worker_assigned', 'worker_on_the_way', 'in_progress', 'awaiting_quote', 'quote_submitted')
      ORDER BY o.updated_at DESC LIMIT 1
    `, [workerRow.id])).rows[0] as OrderRow | undefined
    return c.json({ success: true, data: row ? toOrder(row) : null })
  }

  if (session.is_worker && c.req.query('offered') === '1') {
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string } | undefined
    if (!workerRow) return c.json({ success: true, data: [] })
    const rows = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.worker_id = $1 AND o.status = 'pending_worker_acceptance' AND o.matching_strategy = 'instant'
      ORDER BY o.created_at DESC
    `, [workerRow.id])).rows as OrderRow[]
    return c.json({ success: true, data: rows.map(toOrder) })
  }

  if (c.req.query('active') === '1') {
    const row = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.user_id = $1 AND o.status IN ${ACTIVE_STATUSES}
      ORDER BY o.created_at DESC LIMIT 1
    `, [session.sub])).rows[0] as OrderRow | undefined
    return c.json({ success: true, data: row ? toOrder(row) : null })
  }

  const rows = (await db.query(`
    SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
    WHERE o.user_id = $1
    ORDER BY o.created_at DESC
  `, [session.sub])).rows as OrderRow[]
  return c.json({ success: true, data: rows.map(toOrder) })
})

const surveyDetailsSchema = z.object({
  fromAddress: z.string().min(1),
  toAddress:   z.string().min(1),
  fromFloor:   z.number().int().min(0),
  toFloor:     z.number().int().min(0),
  hasLift:     z.boolean(),
  volumeNote:  z.string(),
})

const createSchema = z.object({
  invoiceId:        z.string().min(1).optional(),
  serviceTypeId:    z.number().int().positive(),
  address:          z.string().min(1),
  scheduledDate:    z.string().min(1),
  hours:            z.number().int().min(1).max(24),
  totalAmount:      z.number().int().min(0).optional(), // ignored — server recomputes
  urgent:           z.boolean().optional(),
  rooms:            z.number().int().min(1).max(20).optional(),
  areaSqm:          z.number().int().min(1).optional(),
  propertyType:     z.enum(['house', 'apartment', 'office']).optional(),
  notes:            z.string().optional(),
  matchingStrategy: z.enum(['instant', 'scheduled']).optional().default('scheduled'),
  surveyDetails:    surveyDetailsSchema.optional(),
})

// POST /api/orders
router.post('/api/orders', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field = issue?.path.join('.') ?? '?'
    const msg   = issue?.message ?? 'Буруу өгөгдөл'
    return c.json({ success: false, error: `[${field}] ${msg}` }, 400)
  }

  const {
    invoiceId, serviceTypeId, address, scheduledDate, hours,
    urgent, rooms, areaSqm, propertyType, notes, matchingStrategy, surveyDetails,
  } = parsed.data

  await dbReady
  try {
    // Verify the payment intent exists and has been confirmed before touching orders
    const intent = (await db.query(
      `SELECT id FROM payment_intents WHERE id = $1 AND user_id = $2 AND paid_at IS NOT NULL`,
      [invoiceId, session.sub],
    )).rows[0]
    if (!intent) {
      return c.json({ success: false, error: 'Төлбөр баталгаажаагүй байна' }, 402)
    }

    // Recompute total server-side — never trust client's totalAmount
    const stRow = (await db.query<{ pricing_model: string; base_rate: number; min_charge: number }>(
      'SELECT pricing_model, base_rate, min_charge FROM service_types WHERE id = $1',
      [serviceTypeId],
    )).rows[0]
    if (!stRow) return c.json({ success: false, error: 'Үйлчилгээний төрөл олдсонгүй' }, 400)

    const { urgent_surcharge } = await getSettings(db)

    const qty = areaSqm ?? 0
    let subtotal: number
    if (stRow.pricing_model === 'area' || stRow.pricing_model === 'unit') {
      subtotal = Math.max(Math.round(qty * stRow.base_rate), stRow.min_charge)
    } else if (stRow.pricing_model === 'inspection') {
      subtotal = stRow.base_rate
    } else {
      subtotal = 0 // survey — estimate phase
    }
    const urgentSurcharge = urgent ? Math.round(subtotal * urgent_surcharge) : 0
    const serverTotal     = subtotal + urgentSurcharge

    const isSurveyModel = stRow.pricing_model === 'survey'
    const initialStatus = (stRow.pricing_model === 'inspection' || isSurveyModel)
      ? 'awaiting_quote'
      : matchingStrategy === 'instant' ? 'searching_worker' : 'pending_acceptances'

    // Bid orders (scheduled, area/unit pricing) are posted without upfront payment.
    // Instant + inspection/survey orders require a confirmed payment_intent.
    const isBidOrder = initialStatus === 'pending_acceptances'
    if (!isBidOrder) {
      if (!invoiceId) return c.json({ success: false, error: 'Төлбөр баталгаажаагүй байна' }, 402)
      const intent = (await db.query(
        'SELECT id FROM payment_intents WHERE id = $1 AND user_id = $2 AND paid_at IS NOT NULL',
        [invoiceId, session.sub],
      )).rows[0]
      if (!intent) return c.json({ success: false, error: 'Төлбөр баталгаажаагүй байна' }, 402)
    }

    const paymentStatus = isBidOrder ? 'unpaid' : 'paid'

    const result = (await db.query(`
      INSERT INTO orders
        (user_id, service_type_id, status, address, scheduled_date,
         hours, total_amount, urgent, rooms, area_sqm, property_type, notes, matching_strategy,
         survey_details, gateway_invoice_id, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      session.sub, serviceTypeId, initialStatus, address, scheduledDate,
      hours, serverTotal, urgent ?? false,
      rooms ?? null, areaSqm ?? null, propertyType ?? null, notes ?? null,
      matchingStrategy,
      surveyDetails ? JSON.stringify(surveyDetails) : null,
      isBidOrder ? null : (invoiceId ?? null),
      paymentStatus,
    ])).rows[0] as { id: string }

    if (!isBidOrder && invoiceId) {
      // Consume the intent — one invoice pays for exactly one order
      await db.query('DELETE FROM payment_intents WHERE id = $1', [invoiceId])
      void notify(session.sub, 'payment_confirmed', { orderId: Number(result.id), amount: serverTotal })
    }

    return c.json({ success: true, data: { id: String(result.id), matchingStrategy, totalAmount: serverTotal } }, 201)
  } catch {
    return c.json({ success: false, error: 'Захиалга үүсгэхэд алдаа гарлаа' }, 500)
  }
})

// GET /api/orders/:id
router.get('/api/orders/:id', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const id = c.req.param('id')

  await dbReady
  const row = (await db.query(`
    SELECT o.id, o.user_id, o.worker_id, u.name as worker_name,
           COALESCE(st.name_mn, '') AS service, o.status, o.address, o.scheduled_date,
           o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
           o.property_type, o.notes, o.payment_status,
           o.before_photo_url, o.after_photo_url,
           st.pricing_model, o.survey_details,
           o.created_at, o.updated_at
    FROM   orders o
    LEFT JOIN workers w  ON w.id  = o.worker_id AND w.rejected_at IS NULL
    LEFT JOIN users   u  ON u.id  = w.user_id
    LEFT JOIN service_types st ON st.id = o.service_type_id
    WHERE  o.id = $1 AND (o.user_id = $2 OR w.user_id = $2)
  `, [id, session.sub])).rows[0] as (OrderRow & { matching_strategy: null }) | undefined

  if (!row) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  return c.json({ success: true, data: toOrder({ ...row, matching_strategy: null }) })
})

// PATCH /api/orders/:id — user picks a worker from scheduled acceptors
router.patch('/api/orders/:id', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = body as { workerId?: unknown }
  if (typeof parsed.workerId !== 'string' && typeof parsed.workerId !== 'number') {
    return c.json({ success: false, error: 'workerId шаардлагатай' }, 400)
  }
  const workerId = String(parsed.workerId)

  const id = c.req.param('id')

  await dbReady

  const orderRow = (await db.query(
    'SELECT id, status, worker_id FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string; status: string; worker_id: string | null } | undefined

  if (!orderRow) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  if (orderRow.status === 'worker_assigned' && String(orderRow.worker_id) === String(workerId)) {
    return c.json({ success: true, data: undefined })
  }
  if (orderRow.status !== 'pending_acceptances') {
    return c.json({ success: false, error: 'Энэ захиалга өөрчлөх боломжгүй' }, 409)
  }

  const accepted = (await db.query(
    'SELECT id FROM order_acceptances WHERE order_id = $1 AND worker_id = $2',
    [id, workerId],
  )).rows[0]

  if (!accepted) {
    return c.json({ success: false, error: 'Ажилтан энэ захиалгыг хүлээж аваагүй байна' }, 400)
  }

  await db.query(
    `UPDATE orders SET worker_id = $1, status = 'worker_assigned', updated_at = NOW() WHERE id = $2`,
    [workerId, id],
  )
  await db.query(
    'UPDATE order_acceptances SET picked_at = NOW() WHERE order_id = $1 AND worker_id = $2',
    [id, workerId],
  )

  return c.json({ success: true, data: undefined })
})

// POST /api/orders/:id/match
router.post('/api/orders/:id/match', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const id = c.req.param('id')

  await dbReady

  const order = (await db.query(
    'SELECT id, status, matching_strategy, service_type_id FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string; status: string; matching_strategy: string; service_type_id: number | null } | undefined

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (order.status !== 'searching_worker' && order.status !== 'pending_worker_acceptance') {
    return c.json({ success: false, error: 'Энэ захиалга аль хэдийн боловсруулагдсан' }, 409)
  }
  if (!order.service_type_id) {
    return c.json({ success: false, error: 'Захиалга үйлчилгээний төрөлгүй байна' }, 409)
  }

  if (order.status === 'pending_worker_acceptance') {
    const stale = (await db.query(
      `SELECT id, offered_at FROM order_match_attempts
       WHERE order_id = $1 AND status = 'offered'
       ORDER BY offered_at DESC LIMIT 1`,
      [id],
    )).rows[0] as { id: number; offered_at: string } | undefined

    if (stale) {
      const ageMs = Date.now() - new Date(stale.offered_at).getTime()
      if (ageMs < 70_000) {
        return c.json({ success: false, error: 'Ажилтан хариу өгөхийг хүлээж байна' }, 409)
      }
      await db.query(
        `UPDATE order_match_attempts SET status = 'timeout', responded_at = NOW() WHERE id = $1`,
        [stale.id],
      )
      await db.query(
        `UPDATE orders SET worker_id = NULL, status = 'searching_worker', updated_at = NOW() WHERE id = $1`,
        [id],
      )
    }
  }

  const countRow = (await db.query(
    `SELECT COUNT(*) as cnt FROM order_match_attempts WHERE order_id = $1 AND status != 'offered'`,
    [id],
  )).rows[0] as { cnt: string }
  const completedCount = Number(countRow.cnt)

  if (completedCount >= 5) {
    await db.query(
      `UPDATE orders SET status = 'no_workers_found', updated_at = NOW() WHERE id = $1`,
      [id],
    )
    return c.json({ success: true, data: { status: 'no_workers_found' } })
  }

  const attemptedRows = (await db.query(
    'SELECT worker_id FROM order_match_attempts WHERE order_id = $1',
    [id],
  )).rows as { worker_id: number }[]
  const attempted = new Set(attemptedRows.map((r) => r.worker_id))

  type WorkerMatchRow = { id: number; name: string; specialty: string; price_per_hour: number; rating: number }

  const allEligible = (await db.query(`
    SELECT w.id, u.name, w.specialty, w.price_per_hour, w.rating
    FROM   workers w
    JOIN   users        u  ON u.id  = w.user_id
    JOIN   banking_info bi ON bi.worker_id = w.id
    WHERE  w.is_available = true
      AND  w.is_active    = true
      AND  w.rating       >= 4.0
      AND  bi.verified    = true
      AND  w.user_id      != $1
      AND  EXISTS (
        SELECT 1 FROM worker_services ws
        WHERE ws.worker_id = w.id AND ws.service_type_id = $2
      )
  `, [session.sub, order.service_type_id])).rows as WorkerMatchRow[]
  const eligible = allEligible.filter((w) => !attempted.has(w.id))

  if (eligible.length === 0) {
    await db.query(
      `UPDATE orders SET status = 'no_workers_found', updated_at = NOW() WHERE id = $1`,
      [id],
    )
    return c.json({ success: true, data: { status: 'no_workers_found' } })
  }

  const worker = eligible[Math.floor(Math.random() * eligible.length)]!

  await db.query(
    `INSERT INTO order_match_attempts (order_id, worker_id, status) VALUES ($1, $2, 'offered')`,
    [id, worker.id],
  )
  await db.query(
    `UPDATE orders SET status = 'pending_worker_acceptance', worker_id = $1, updated_at = NOW() WHERE id = $2`,
    [worker.id, id],
  )

  return c.json({
    success: true,
    data: {
      status: 'pending_acceptance',
      attemptNumber: completedCount + 1,
      worker: {
        workerId:     String(worker.id),
        name:         worker.name,
        rating:       worker.rating,
        specialty:    worker.specialty,
        pricePerHour: worker.price_per_hour,
      },
    },
  })
})

// POST /api/orders/:id/quote — assigned worker submits a repair quote
const quoteSchema = z.object({
  amount:      z.number().int().positive(),
  description: z.string().trim().min(1).refine(
    (v) => !/<[^>]+>/.test(v),
    { message: 'Тайлбарт HTML тэмдэгт хориглоно' },
  ),
})

router.post('/api/orders/:id/quote', async (c) => {
  // Step 1 — Validate input
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }
  const parsed = quoteSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }, 400)
  }
  const { amount, description } = parsed.data

  // Step 2 — Auth
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const orderId = c.req.param('id')
  await dbReady

  try {
    // Step 3 — Ownership: caller must be the assigned worker on this order
    const orderRow = (await db.query<{ worker_id: string; status: string }>(
      `SELECT o.worker_id, o.status
       FROM   orders  o
       JOIN   workers w ON w.id = o.worker_id
       WHERE  o.id = $1 AND w.user_id = $2 AND w.rejected_at IS NULL`,
      [orderId, session.sub],
    )).rows[0]

    if (!orderRow) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
    if (orderRow.status !== 'awaiting_quote') {
      return c.json({ success: false, error: 'Захиалга үнийн санал хүлээхгүй байна' }, 409)
    }

    // Step 4 — Insert quote row + flip order status (atomic transaction)
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `INSERT INTO order_quotes (order_id, worker_id, amount, description)
         VALUES ($1, $2, $3, $4)`,
        [orderId, orderRow.worker_id, amount, description],
      )
      await client.query(
        `UPDATE orders SET status = 'quote_submitted', updated_at = NOW() WHERE id = $1`,
        [orderId],
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    // Notify user — SWR polling (refreshInterval 10 s) delivers the status change
    return c.json({ success: true, data: { orderId, amount, status: 'quote_submitted' } }, 201)
  } catch {
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  }
})

// GET /api/orders/:id/quote — latest quote (user or assigned worker)
router.get('/api/orders/:id/quote', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const orderId = c.req.param('id')
  await dbReady
  try {
    const orderRow = (await db.query(
      `SELECT o.id FROM orders o
       LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
       WHERE o.id = $1 AND (o.user_id = $2 OR w.user_id = $2)`,
      [orderId, session.sub],
    )).rows[0]
    if (!orderRow) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

    const quoteRow = (await db.query<{
      id: string; order_id: string; worker_id: string;
      amount: number; description: string; status: string; created_at: string;
    }>(
      `SELECT id, order_id, worker_id, amount, description, status, created_at
       FROM order_quotes WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    )).rows[0]
    if (!quoteRow) return c.json({ success: false, error: 'Үнийн санал олдсонгүй' }, 404)

    return c.json({ success: true, data: {
      id:          String(quoteRow.id),
      orderId:     String(quoteRow.order_id),
      workerId:    String(quoteRow.worker_id),
      amount:      quoteRow.amount,
      description: quoteRow.description,
      status:      quoteRow.status,
      createdAt:   quoteRow.created_at,
    }})
  } catch {
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  }
})

// POST /api/orders/:id/quote/respond — user approves or rejects the worker's quote
const quoteRespondSchema = z.object({
  action: z.enum(['approve', 'reject']),
})

router.post('/api/orders/:id/quote/respond', async (c) => {
  // Step 1 — Validate
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }
  const parsed = quoteRespondSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'action шаардлагатай' }, 400)
  const { action } = parsed.data

  // Step 2 — Auth
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const orderId = c.req.param('id')
  await dbReady
  try {
    // Step 3 — Ownership: only the order's creator can respond
    const orderRow = (await db.query<{
      user_id: string; worker_id: string | null; status: string;
      service_type_id: string | null; total_amount: number;
    }>(
      'SELECT user_id, worker_id, status, service_type_id, total_amount FROM orders WHERE id = $1',
      [orderId],
    )).rows[0]

    if (!orderRow || String(orderRow.user_id) !== String(session.sub)) {
      return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
    }
    if (orderRow.status !== 'quote_submitted') {
      return c.json({ success: false, error: 'Захиалга зөвшөөрөл хүлээхгүй байна' }, 409)
    }

    // Fetch latest submitted quote
    const quoteRow = (await db.query<{ id: string; worker_id: string; amount: number }>(
      `SELECT id, worker_id, amount FROM order_quotes
       WHERE order_id = $1 AND status = 'submitted'
       ORDER BY created_at DESC LIMIT 1`,
      [orderId],
    )).rows[0]
    if (!quoteRow) return c.json({ success: false, error: 'Үнийн санал олдсонгүй' }, 404)

    const settings = await getSettings(db)

    // Step 4 — Atomic transaction
    const client = await db.connect()
    try {
      await client.query('BEGIN')

      if (action === 'approve') {
        const openDispute = (await client.query(
          `SELECT id FROM disputes WHERE order_id = $1 AND status != 'resolved'`,
          [orderId],
        )).rows[0]
        if (openDispute) {
          await client.query('ROLLBACK')
          return c.json({ success: false, error: 'Маргаан шийдвэрлэгдэх хүртэл төлбөр гарахгүй' }, 409)
        }

        // finalTotal = amount already escrowed at booking + worker's quote.
        // inspection: escrowed = call-out fee, survey: escrowed = 0 (full quote charged now).
        const amountAlreadyEscrowed = orderRow.total_amount
        const finalTotal            = amountAlreadyEscrowed + quoteRow.amount
        const platformFee           = Math.floor(finalTotal * settings.commission)
        const damageFund            = Math.floor(finalTotal * settings.damage_fund)
        const workerEarning         = finalTotal - platformFee - damageFund
        const invoiceId             = `INV-QUOTE-${orderId}-${Date.now()}`

        await client.query(
          `UPDATE order_quotes SET status = 'approved' WHERE id = $1`,
          [quoteRow.id],
        )
        await client.query(
          `UPDATE orders SET status = 'quote_approved', total_amount = $1,
           payment_status = 'paid', gateway_invoice_id = $2, updated_at = NOW()
           WHERE id = $3`,
          [finalTotal, invoiceId, orderId],
        )
        if (orderRow.worker_id) {
          await client.query(
            `INSERT INTO transactions (worker_id, amount, type, service_type_id)
             VALUES ($1, $2, 'earning', $3)`,
            [orderRow.worker_id, workerEarning, orderRow.service_type_id],
          )
        }
      } else {
        // reject: amount already escrowed stays with worker as an earning (0 for survey)
        const amountAlreadyEscrowed = orderRow.total_amount
        const platformFee           = Math.floor(amountAlreadyEscrowed * settings.commission)
        const damageFund            = Math.floor(amountAlreadyEscrowed * settings.damage_fund)
        const workerCallout         = amountAlreadyEscrowed - platformFee - damageFund

        await client.query(
          `UPDATE order_quotes SET status = 'rejected' WHERE id = $1`,
          [quoteRow.id],
        )
        await client.query(
          `UPDATE orders SET status = 'quote_rejected', updated_at = NOW() WHERE id = $1`,
          [orderId],
        )
        if (orderRow.worker_id) {
          await client.query(
            `INSERT INTO transactions (worker_id, amount, type, service_type_id)
             VALUES ($1, $2, 'earning', $3)`,
            [orderRow.worker_id, workerCallout, orderRow.service_type_id],
          )
        }
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return c.json({
      success: true,
      data: { orderId, action, status: action === 'approve' ? 'quote_approved' : 'quote_rejected' },
    })
  } catch {
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  }
})

// POST /api/orders/:id/accept — worker accepts a scheduled order
router.post('/api/orders/:id/accept', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)
  if (!session.is_worker) {
    return c.json({ success: false, error: 'Зөвхөн ажилтан хүлээж авах боломжтой' }, 403)
  }

  const id = c.req.param('id')

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: number } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Ажилтны бүртгэл олдсонгүй' }, 404)

  const order = (await db.query(
    'SELECT id, status, user_id FROM orders WHERE id = $1',
    [id],
  )).rows[0] as { id: string; status: string; user_id: string } | undefined

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (String(order.user_id) === String(session.sub)) {
    return c.json({ success: false, error: 'Өөрийн захиалгаа авах боломжгүй' }, 403)
  }
  if (order.status !== 'pending_acceptances') {
    return c.json({ success: false, error: 'Энэ захиалга хүлээж авах боломжгүй' }, 409)
  }

  try {
    await db.query(
      'INSERT INTO order_acceptances (order_id, worker_id) VALUES ($1, $2) ON CONFLICT (order_id, worker_id) DO NOTHING',
      [id, workerRow.id],
    )
  } catch {
    return c.json({ success: false, error: 'Хүлээж авахад алдаа гарлаа' }, 500)
  }

  void (async () => {
    try {
      const nameRow = (await db.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.sub])).rows[0]
      void notify(Number(order.user_id), 'order_accepted', { orderId: Number(id), workerName: nameRow?.name ?? '' })
    } catch {}
  })()

  return c.json({ success: true, data: undefined }, 201)
})

// GET /api/orders/:id/acceptances
router.get('/api/orders/:id/acceptances', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const id = c.req.param('id')

  await dbReady

  const order = (await db.query(
    'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string } | undefined

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  type AcceptanceRow = {
    id: number; order_id: string; worker_id: string; worker_name: string
    worker_rating: number; worker_review_count: number
    worker_specialty: string; worker_price_per_hour: number; created_at: string
  }

  const rows = (await db.query(`
    SELECT
      oa.id, oa.order_id, oa.worker_id, oa.created_at,
      u.name           AS worker_name,
      w.rating         AS worker_rating,
      w.review_count   AS worker_review_count,
      w.specialty      AS worker_specialty,
      w.price_per_hour AS worker_price_per_hour
    FROM  order_acceptances oa
    JOIN  workers w ON w.id   = oa.worker_id
    JOIN  users   u ON u.id   = w.user_id
    WHERE oa.order_id = $1
    ORDER BY oa.created_at ASC
  `, [id])).rows as AcceptanceRow[]

  const acceptances: OrderAcceptance[] = rows.map((r) => ({
    id:                 String(r.id),
    orderId:            String(r.order_id),
    workerId:           String(r.worker_id),
    workerName:         r.worker_name,
    workerRating:       r.worker_rating,
    workerReviewCount:  r.worker_review_count,
    workerSpecialty:    r.worker_specialty,
    workerPricePerHour: r.worker_price_per_hour,
    acceptedAt:         r.created_at,
  }))

  return c.json({ success: true, data: acceptances })
})

// POST /api/orders/:id/accept-instant — worker accepts instant offer
router.post('/api/orders/:id/accept-instant', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: number } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Зөвхөн ажилтан хүлээж авах боломжтой' }, 403)

  const id = c.req.param('id')

  const order = (await db.query(
    `SELECT id, status, user_id FROM orders WHERE id = $1 AND worker_id = $2 AND status = 'pending_worker_acceptance'`,
    [id, workerRow.id],
  )).rows[0] as { id: string; status: string; user_id: string } | undefined

  if (!order) {
    return c.json({ success: false, error: 'Захиалга олдсонгүй эсвэл хүлээгдэж буй байдалд биш байна' }, 404)
  }
  if (String(order.user_id) === String(session.sub)) {
    return c.json({ success: false, error: 'Өөрийн захиалгаа авах боломжгүй' }, 403)
  }

  await db.query(
    `UPDATE order_match_attempts SET status = 'accepted', responded_at = NOW()
     WHERE order_id = $1 AND worker_id = $2 AND status = 'offered'`,
    [id, workerRow.id],
  )
  await db.query(
    `UPDATE orders SET status = 'worker_assigned', updated_at = NOW() WHERE id = $1`,
    [id],
  )

  void (async () => {
    try {
      const nameRow = (await db.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.sub])).rows[0]
      void notify(Number(order.user_id), 'order_accepted', { orderId: Number(id), workerName: nameRow?.name ?? '' })
    } catch {}
  })()

  return c.json({ success: true, data: undefined })
})

// POST /api/orders/:id/decline-instant — worker declines instant offer
router.post('/api/orders/:id/decline-instant', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: number } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Зөвхөн ажилтан татгалзах боломжтой' }, 403)

  const id = c.req.param('id')

  const order = (await db.query(
    `SELECT id, status FROM orders WHERE id = $1 AND worker_id = $2 AND status = 'pending_worker_acceptance'`,
    [id, workerRow.id],
  )).rows[0] as { id: string; status: string } | undefined

  if (!order) {
    return c.json({ success: false, error: 'Захиалга олдсонгүй эсвэл хүлээгдэж буй байдалд биш байна' }, 404)
  }

  await db.query(
    `UPDATE order_match_attempts SET status = 'declined', responded_at = NOW()
     WHERE order_id = $1 AND worker_id = $2 AND status = 'offered'`,
    [id, workerRow.id],
  )
  await db.query(
    `UPDATE orders SET status = 'searching_worker', worker_id = NULL, updated_at = NOW() WHERE id = $1`,
    [id],
  )

  return c.json({ success: true, data: undefined })
})

const WORKER_STATUSES = ['worker_on_the_way', 'in_progress', 'completed', 'cancelled_by_worker'] as const
const USER_STATUSES   = ['cancelled_by_user'] as const

const statusSchema = z.object({
  status: z.enum([...WORKER_STATUSES, ...USER_STATUSES]),
})

// PATCH /api/orders/:id/status
router.patch('/api/orders/:id/status', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = statusSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Буруу статус' }, 400)

  const id = c.req.param('id')
  const { status } = parsed.data

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: string } | undefined
  const isWorker = !!workerRow

  if (!isWorker && status !== 'cancelled_by_user') {
    return c.json({ success: false, error: 'Зөвхөн ажилтан статус өөрчлөх боломжтой' }, 403)
  }

  if (isWorker && (USER_STATUSES as readonly string[]).includes(status)) {
    return c.json({ success: false, error: 'Зөвхөн захиалагч цуцлах боломжтой' }, 403)
  }

  if (isWorker && (status === 'in_progress' || status === 'completed')) {
    const photoRow = (await db.query(
      'SELECT before_photo_url, after_photo_url FROM orders WHERE id = $1',
      [id],
    )).rows[0] as { before_photo_url: string | null; after_photo_url: string | null } | undefined

    if (status === 'in_progress' && !photoRow?.before_photo_url) {
      return c.json({ success: false, error: 'Өмнөх зургаа оруулсны дараа ажил эхлүүлнэ үү' }, 422)
    }
    if (status === 'completed' && !photoRow?.after_photo_url) {
      return c.json({ success: false, error: 'Дараах зургаа оруулсны дараа ажлыг дуусгана уу' }, 422)
    }
  }

  // Dispute guard runs before any write — status must never flip to completed with an open dispute
  if (isWorker && status === 'completed') {
    const openDispute = (await db.query(
      `SELECT id FROM disputes WHERE order_id = $1 AND status != 'resolved'`,
      [id],
    )).rows[0]
    if (openDispute) {
      return c.json({ success: false, error: 'Маргаан шийдвэрлэгдэх хүртэл төлбөр гарахгүй' }, 409)
    }
  }

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    const result = isWorker
      ? await client.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND worker_id = $3',
          [status, id, workerRow!.id],
        )
      : await client.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [status, id, session.sub],
        )

    if (!result.rowCount) {
      await client.query('ROLLBACK')
      return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
    }

    if (isWorker && status === 'completed') {
      const orderRow = (await client.query(
        'SELECT total_amount, service_type_id FROM orders WHERE id = $1',
        [id],
      )).rows[0] as { total_amount: number; service_type_id: number | null } | undefined

      if (orderRow) {
        const { commission, damage_fund } = await getSettings(db)
        const platformFee = Math.floor(orderRow.total_amount * commission)
        const dmgFund     = Math.floor(orderRow.total_amount * damage_fund)
        const payout      = orderRow.total_amount - platformFee - dmgFund
        await client.query(
          'INSERT INTO transactions (worker_id, amount, type, service_type_id) VALUES ($1, $2, $3, $4)',
          [workerRow!.id, payout, 'earning', orderRow.service_type_id ?? null],
        )
      }
    }

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  if (status === 'worker_on_the_way' || status === 'completed' || status === 'cancelled_by_worker') {
    void (async () => {
      try {
        const row = (await db.query<{ user_id: string }>('SELECT user_id FROM orders WHERE id = $1', [id])).rows[0]
        if (!row) return
        if (status === 'worker_on_the_way') {
          const nameRow = (await db.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [session.sub])).rows[0]
          void notify(Number(row.user_id), 'worker_on_the_way', { orderId: Number(id), workerName: nameRow?.name ?? '' })
        } else if (status === 'completed') {
          void notify(Number(row.user_id), 'order_completed', { orderId: Number(id) })
        } else {
          void notify(Number(row.user_id), 'order_cancelled', { orderId: Number(id), cancelledBy: 'worker' })
        }
      } catch {}
    })()
  } else if (status === 'cancelled_by_user') {
    void (async () => {
      try {
        const row = (await db.query<{ worker_user_id: string }>(
          `SELECT u.id AS worker_user_id FROM orders o
           JOIN workers w ON o.worker_id = w.id
           JOIN users u ON w.user_id = u.id
           WHERE o.id = $1`,
          [id],
        )).rows[0]
        if (!row) return
        void notify(Number(row.worker_user_id), 'order_cancelled', { orderId: Number(id), cancelledBy: 'user' })
      } catch {}
    })()
  }

  return c.json({ success: true, data: undefined })
})

const PHOTO_ALLOWED = ['image/jpeg', 'image/png', 'image/webp'] as const
const PHOTO_MAX_BYTES = 5 * 1024 * 1024

// POST /api/orders/:id/upload
router.post('/api/orders/:id/upload', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Зөвхөн ажилтан зураг оруулах боломжтой' }, 403)

  const orderId = c.req.param('id')

  const orderRow = (await db.query(
    'SELECT id FROM orders WHERE id = $1 AND worker_id = $2',
    [orderId, workerRow.id],
  )).rows[0] as { id: string } | undefined

  if (!orderRow) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ success: false, error: 'FormData уншихад алдаа гарлаа' }, 400)
  }

  const type = formData.get('type')
  if (type !== 'before' && type !== 'after') {
    return c.json({ success: false, error: '"type" нь "before" эсвэл "after" байх ёстой' }, 400)
  }

  const file = formData.get('photo')
  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: 'Зураг оруулаагүй байна' }, 400)
  }

  const blob = file as Blob & { name?: string; type: string; size: number }

  if (!(PHOTO_ALLOWED as readonly string[]).includes(blob.type)) {
    return c.json({ success: false, error: 'Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө' }, 400)
  }

  if (blob.size > PHOTO_MAX_BYTES) {
    return c.json({ success: false, error: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой' }, 400)
  }

  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const filename  = `${type}-${Date.now()}.${ext}`
  const uploadDir = path.join(UPLOAD_ROOT, 'orders', orderId)
  const filePath  = path.join(uploadDir, filename)
  const publicUrl = `/uploads/orders/${orderId}/${filename}`

  try {
    await mkdir(uploadDir, { recursive: true })
    const bytes = await blob.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))
  } catch {
    return c.json({ success: false, error: 'Зураг хадгалахад алдаа гарлаа' }, 500)
  }

  const col = type === 'before' ? 'before_photo_url' : 'after_photo_url'
  await db.query(
    `UPDATE orders SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
    [publicUrl, orderId],
  )

  return c.json({ success: true, data: { url: publicUrl } })
})

const FREE_STATUSES = new Set([
  'pending_acceptances', 'awaiting_payment', 'searching_worker', 'pending_worker_acceptance', 'pending_payment',
])
const FEE_STATUSES = new Set(['worker_assigned', 'worker_on_the_way'])

// POST /api/orders/:id/cancel
router.post('/api/orders/:id/cancel', async (c) => {
  const rawId = c.req.param('id')
  const orderId = Number(rawId)
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return c.json({ success: false, error: 'Буруу захиалгын ID' }, 400)
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const order = (await db.query(
    `SELECT id, worker_id, status, scheduled_date, total_amount, service_type_id, payment_status
     FROM orders WHERE id = $1 AND user_id = $2`,
    [orderId, session.sub],
  )).rows[0] as {
    id: string; worker_id: string | null; status: string; scheduled_date: string
    total_amount: number; service_type_id: number | null; payment_status: string
  } | undefined

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  if (!FREE_STATUSES.has(order.status) && !FEE_STATUSES.has(order.status)) {
    return c.json({ success: false, error: 'Энэ захиалгыг цуцлах боломжгүй' }, 403)
  }

  const { late_cancel_fee } = await getSettings(db)
  let fee = 0
  if (FEE_STATUSES.has(order.status)) {
    const scheduledDate = new Date(order.scheduled_date)
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)
    fee = scheduledDate <= oneHourFromNow ? late_cancel_fee : 0
  }

  const refundAmount = Math.max(0, order.total_amount - fee)

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE orders SET status = 'cancelled_by_user', updated_at = NOW() WHERE id = $1`,
      [orderId],
    )

    if (order.payment_status === 'paid') {
      await client.query(
        'INSERT INTO transactions (worker_id, amount, type, service_type_id) VALUES ($1, $2, $3, $4)',
        [order.worker_id ?? null, refundAmount, 'refund', order.service_type_id ?? null],
      )
    }

    await client.query('COMMIT')
  } catch {
    await client.query('ROLLBACK')
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  } finally {
    client.release()
  }

  if (order.worker_id) {
    void (async () => {
      try {
        const workerUserRow = (await db.query<{ user_id: string }>('SELECT user_id FROM workers WHERE id = $1', [order.worker_id])).rows[0]
        if (workerUserRow) {
          void notify(Number(workerUserRow.user_id), 'order_cancelled', { orderId: Number(orderId), cancelledBy: 'user' })
        }
      } catch {}
    })()
  }

  return c.json({ success: true, data: { refundAmount, fee } })
})

const reviewSchema = z.object({
  rating:  z.number().int().min(1).max(5),
  comment: z.string().optional(),
})

// POST /api/orders/:id/review
router.post('/api/orders/:id/review', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = reviewSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const orderId = c.req.param('id')

  await dbReady

  const order = (await db.query(
    `SELECT id, worker_id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
    [orderId, session.sub],
  )).rows[0] as { id: string; worker_id: string } | undefined

  if (!order) {
    return c.json({ success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' }, 404)
  }

  const existing = (await db.query('SELECT id FROM reviews WHERE order_id = $1', [orderId])).rows[0]
  if (existing) return c.json({ success: false, error: 'Та аль хэдийн үнэлсэн байна' }, 409)

  const { rating, comment } = parsed.data

  const client = await db.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      'INSERT INTO reviews (order_id, worker_id, rating, comment) VALUES ($1, $2, $3, $4)',
      [orderId, order.worker_id, rating, comment ?? null],
    )

    const stats = (await client.query(
      'SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE worker_id = $1',
      [order.worker_id],
    )).rows[0] as { avg: number; cnt: number }

    await client.query(
      'UPDATE workers SET rating = $1, review_count = $2 WHERE id = $3',
      [Math.round(stats.avg * 10) / 10, stats.cnt, order.worker_id],
    )

    await client.query(
      `UPDATE orders SET status = 'rated', updated_at = NOW() WHERE id = $1`,
      [orderId],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return c.json({ success: true, data: undefined }, 201)
})

const ACTIVE_STATUSES_SET = new Set([
  'searching_worker', 'pending_acceptances', 'pending_worker_acceptance',
  'worker_assigned', 'worker_on_the_way', 'in_progress',
])

type MessageRow = {
  id: string; order_id: string; sender_id: string; sender_name: string
  text: string; created_at: string
}

async function resolveMessageAccess(orderId: string, userId: string) {
  const row = (await db.query(
    `SELECT o.user_id, o.worker_id, o.status, w.user_id AS worker_user_id
     FROM orders o
     LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
     WHERE o.id = $1`,
    [orderId],
  )).rows[0] as { user_id: string; worker_id: string | null; status: string; worker_user_id: string | null } | undefined

  if (!row) return null
  const isOwner = String(row.user_id) === String(userId)
  const isWorker = row.worker_user_id != null && String(row.worker_user_id) === String(userId)
  if (!isOwner && !isWorker) return null
  return row
}

// GET /api/orders/:id/messages
router.get('/api/orders/:id/messages', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const id = c.req.param('id')
  await dbReady

  const order = await resolveMessageAccess(id, session.sub)
  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (!ACTIVE_STATUSES_SET.has(order.status)) {
    return c.json({ success: false, error: 'Чат зөвхөн идэвхтэй захиалгад боломжтой' }, 403)
  }

  const rows = (await db.query(
    `SELECT m.id, m.order_id, m.sender_id, u.name AS sender_name, m.text, m.created_at
     FROM messages m
     LEFT JOIN users u ON u.id = m.sender_id
     WHERE m.order_id = $1
     ORDER BY m.created_at ASC`,
    [id],
  )).rows as MessageRow[]

  const messages: Message[] = rows.map((r) => ({
    id:         String(r.id),
    orderId:    String(r.order_id),
    senderId:   String(r.sender_id),
    senderName: r.sender_name,
    text:       r.text,
    createdAt:  r.created_at,
  }))

  return c.json({ success: true, data: messages })
})

// POST /api/orders/:id/messages
router.post('/api/orders/:id/messages', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = z.object({ text: z.string().min(1).max(1000) }).safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Мессеж хоосон байж болохгүй' }, 400)
  }

  const id = c.req.param('id')
  await dbReady

  const order = await resolveMessageAccess(id, session.sub)
  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (!ACTIVE_STATUSES_SET.has(order.status)) {
    return c.json({ success: false, error: 'Чат зөвхөн идэвхтэй захиалгад боломжтой' }, 403)
  }

  const row = (await db.query(
    `INSERT INTO messages (order_id, sender_id, text)
     VALUES ($1, $2, $3)
     RETURNING id, order_id, sender_id, text, created_at`,
    [id, session.sub, parsed.data.text],
  )).rows[0] as { id: string; order_id: string; sender_id: string; text: string; created_at: string }

  const nameRow = (await db.query('SELECT name FROM users WHERE id = $1', [session.sub]))
    .rows[0] as { name: string }

  const message: Message = {
    id:         String(row.id),
    orderId:    String(row.order_id),
    senderId:   String(row.sender_id),
    senderName: nameRow.name,
    text:       row.text,
    createdAt:  row.created_at,
  }

  return c.json({ success: true, data: message }, 201)
})

export default router
