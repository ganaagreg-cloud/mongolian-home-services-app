import { Hono } from 'hono'
import { z } from 'zod'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { getSettings } from '../lib/settings'
import type {
  Order, OrderStatus, PaymentStatus, PropertyType, MatchingStrategy,
  OrderAcceptance, Message,
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
    createdAt:        row.created_at,
    updatedAt:        row.updated_at,
  }
}

const ACTIVE_STATUSES = `('searching_worker','pending_acceptances','pending_worker_acceptance','worker_assigned','worker_on_the_way','in_progress')`

const SELECT_COLS = `
  o.id, o.user_id, o.worker_id, u.name as worker_name,
  COALESCE(st.name_mn, '') AS service, o.status, o.address, o.scheduled_date,
  o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
  o.property_type, o.notes, o.matching_strategy, o.payment_status,
  o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at`

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
      'SELECT id, service_type_id, is_available, is_active FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string; service_type_id: number | null; is_available: boolean; is_active: boolean } | undefined

    if (!workerRow || !workerRow.is_available || !workerRow.is_active || !workerRow.service_type_id) {
      return c.json({ success: true, data: [] })
    }
    const rows = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.status = 'pending_acceptances'
        AND o.matching_strategy = 'scheduled'
        AND o.service_type_id = $1
        AND o.user_id != $3
        AND NOT EXISTS (
          SELECT 1 FROM order_acceptances oa
          WHERE oa.order_id = o.id AND oa.worker_id = $2
        )
      ORDER BY o.created_at DESC
    `, [workerRow.service_type_id, workerRow.id, session.sub])).rows as OrderRow[]
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
        AND o.status IN ('worker_assigned', 'worker_on_the_way', 'in_progress')
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

const createSchema = z.object({
  serviceTypeId:    z.number().int().positive(),
  address:          z.string().min(1),
  scheduledDate:    z.string().min(1),
  hours:            z.number().int().min(1).max(24),
  totalAmount:      z.number().int().min(0),
  urgent:           z.boolean().optional(),
  rooms:            z.number().int().min(1).max(20).optional(),
  areaSqm:          z.number().int().min(1).optional(),
  propertyType:     z.enum(['house', 'apartment', 'office']).optional(),
  notes:            z.string().optional(),
  matchingStrategy: z.enum(['instant', 'scheduled']).optional().default('scheduled'),
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
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const {
    serviceTypeId, address, scheduledDate, hours, totalAmount,
    urgent, rooms, areaSqm, propertyType, notes, matchingStrategy,
  } = parsed.data

  const initialStatus = matchingStrategy === 'instant' ? 'searching_worker' : 'pending_acceptances'

  await dbReady
  try {
    const result = (await db.query(`
      INSERT INTO orders
        (user_id, service_type_id, status, address, scheduled_date,
         hours, total_amount, urgent, rooms, area_sqm, property_type, notes, matching_strategy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      session.sub, serviceTypeId, initialStatus, address, scheduledDate,
      hours, totalAmount, urgent ?? false,
      rooms ?? null, areaSqm ?? null, propertyType ?? null, notes ?? null,
      matchingStrategy,
    ])).rows[0] as { id: string }

    return c.json({ success: true, data: { id: String(result.id), matchingStrategy } }, 201)
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
           o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at
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
    'SELECT id, status, matching_strategy FROM orders WHERE id = $1 AND user_id = $2',
    [id, session.sub],
  )).rows[0] as { id: string; status: string; matching_strategy: string } | undefined

  if (!order) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)
  if (order.status !== 'searching_worker' && order.status !== 'pending_worker_acceptance') {
    return c.json({ success: false, error: 'Энэ захиалга аль хэдийн боловсруулагдсан' }, 409)
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
  `, [session.sub])).rows as WorkerMatchRow[]
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

  const result = isWorker
    ? await db.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND worker_id = $3',
        [status, id, workerRow!.id],
      )
    : await db.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
        [status, id, session.sub],
      )

  if (!result.rowCount) return c.json({ success: false, error: 'Захиалга олдсонгүй' }, 404)

  if (isWorker && status === 'completed') {
    const orderRow = (await db.query(
      'SELECT total_amount, service_type_id FROM orders WHERE id = $1',
      [id],
    )).rows[0] as { total_amount: number; service_type_id: number | null } | undefined

    if (orderRow) {
      const { commission, damage_fund } = await getSettings(db)
      const payout = Math.round(orderRow.total_amount * (1 - commission - damage_fund))
      await db.query(
        'INSERT INTO transactions (worker_id, amount, type, service_type_id) VALUES ($1, $2, $3, $4)',
        [workerRow!.id, payout, 'earning', orderRow.service_type_id ?? null],
      )
    }
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
  'pending_acceptances', 'searching_worker', 'pending_worker_acceptance', 'pending_payment',
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
