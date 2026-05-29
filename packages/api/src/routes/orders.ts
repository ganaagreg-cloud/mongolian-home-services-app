import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import type { Order, OrderStatus, PaymentStatus, PropertyType, MatchingStrategy } from '@homeservices/shared'

const router = Router()

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
  o.service, o.status, o.address, o.scheduled_date,
  o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
  o.property_type, o.notes, o.matching_strategy, o.payment_status,
  o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at`

const JOIN_WORKER = `
  LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
  LEFT JOIN users   u ON u.id = w.user_id  `

// GET /api/orders
router.get('/orders', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady

    if (session.is_worker && req.query.scheduled === '1') {
      const workerRow = (await db.query(
        'SELECT id, specialty, is_available, is_active FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
        [session.sub],
      )).rows[0] as { id: string; specialty: string | null; is_available: boolean; is_active: boolean } | undefined

      if (!workerRow || !workerRow.is_available || !workerRow.is_active || !workerRow.specialty) {
        res.json({ success: true, data: [] }); return
      }
      const rows = (await db.query(`
        SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
        WHERE o.status = 'pending_acceptances'
          AND o.matching_strategy = 'scheduled'
          AND o.service = $1
          AND o.user_id != $3
          AND NOT EXISTS (
            SELECT 1 FROM order_acceptances oa
            WHERE oa.order_id = o.id AND oa.worker_id = $2
          )
        ORDER BY o.created_at DESC
      `, [workerRow.specialty, workerRow.id, session.sub])).rows as OrderRow[]
      res.json({ success: true, data: rows.map(toOrder) }); return
    }

    if (session.is_worker && req.query.worker_active === '1') {
      const workerRow = (await db.query(
        'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
        [session.sub],
      )).rows[0] as { id: string } | undefined
      if (!workerRow) { res.json({ success: true, data: null }); return }
      const row = (await db.query(`
        SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
        WHERE o.worker_id = $1
          AND o.status IN ('worker_assigned', 'worker_on_the_way', 'in_progress')
        ORDER BY o.updated_at DESC LIMIT 1
      `, [workerRow.id])).rows[0] as OrderRow | undefined
      res.json({ success: true, data: row ? toOrder(row) : null }); return
    }

    if (session.is_worker && req.query.offered === '1') {
      const workerRow = (await db.query(
        'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
        [session.sub],
      )).rows[0] as { id: string } | undefined
      if (!workerRow) { res.json({ success: true, data: [] }); return }
      const rows = (await db.query(`
        SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
        WHERE o.worker_id = $1 AND o.status = 'pending_worker_acceptance' AND o.matching_strategy = 'instant'
        ORDER BY o.created_at DESC
      `, [workerRow.id])).rows as OrderRow[]
      res.json({ success: true, data: rows.map(toOrder) }); return
    }

    if (req.query.active === '1') {
      const row = (await db.query(`
        SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
        WHERE o.user_id = $1 AND o.status IN ${ACTIVE_STATUSES}
        ORDER BY o.created_at DESC LIMIT 1
      `, [session.sub])).rows[0] as OrderRow | undefined
      res.json({ success: true, data: row ? toOrder(row) : null }); return
    }

    const rows = (await db.query(`
      SELECT ${SELECT_COLS} FROM orders o ${JOIN_WORKER}
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC
    `, [session.sub])).rows as OrderRow[]
    res.json({ success: true, data: rows.map(toOrder) })
  } catch (err) {
    console.error('[orders GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const createSchema = z.object({
  service:          z.string().min(1),
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
router.post('/orders', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    const {
      service, address, scheduledDate, hours, totalAmount,
      urgent, rooms, areaSqm, propertyType, notes, matchingStrategy,
    } = parsed.data

    const initialStatus = matchingStrategy === 'instant' ? 'searching_worker' : 'pending_acceptances'

    await dbReady
    const result = (await db.query(`
      INSERT INTO orders
        (user_id, service, status, address, scheduled_date,
         hours, total_amount, urgent, rooms, area_sqm, property_type, notes, matching_strategy)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      session.sub, service, initialStatus, address, scheduledDate,
      hours, totalAmount, urgent ?? false,
      rooms ?? null, areaSqm ?? null, propertyType ?? null, notes ?? null,
      matchingStrategy,
    ])).rows[0] as { id: string }

    res.status(201).json({ success: true, data: { id: String(result.id), matchingStrategy } })
  } catch (err) {
    console.error('[orders POST]', err)
    res.status(500).json({ success: false, error: 'Захиалга үүсгэхэд алдаа гарлаа' })
  }
})

// GET /api/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const row = (await db.query(`
      SELECT o.id, o.user_id, o.worker_id, u.name as worker_name,
             o.service, o.status, o.address, o.scheduled_date,
             o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
             o.property_type, o.notes, o.payment_status,
             o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at,
             o.matching_strategy, '' as matching_strategy_placeholder
      FROM   orders o
      LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
      LEFT JOIN users   u ON u.id = w.user_id
      WHERE  o.id = $1 AND (o.user_id = $2 OR w.user_id = $2)
    `, [req.params.id, session.sub])).rows[0] as (OrderRow & { payment_status: string }) | undefined

    if (!row) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    res.json({ success: true, data: toOrder(row) })
  } catch (err) {
    console.error('[orders/:id GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/orders/:id — pick a worker from scheduled acceptors
router.patch('/orders/:id', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = req.body as { workerId?: unknown }
    if (typeof parsed.workerId !== 'string' && typeof parsed.workerId !== 'number') {
      res.status(400).json({ success: false, error: 'workerId шаардлагатай' }); return
    }
    const workerId = String(parsed.workerId)

    await dbReady
    const orderRow = (await db.query(
      'SELECT id, status, worker_id FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, session.sub],
    )).rows[0] as { id: string; status: string; worker_id: string | null } | undefined

    if (!orderRow) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    if (orderRow.status === 'worker_assigned' && String(orderRow.worker_id) === workerId) {
      res.json({ success: true, data: undefined }); return
    }
    if (orderRow.status !== 'pending_acceptances') {
      res.status(409).json({ success: false, error: 'Энэ захиалга өөрчлөх боломжгүй' }); return
    }

    const accepted = (await db.query(
      'SELECT id FROM order_acceptances WHERE order_id = $1 AND worker_id = $2',
      [req.params.id, workerId],
    )).rows[0]
    if (!accepted) { res.status(400).json({ success: false, error: 'Ажилтан энэ захиалгыг хүлээж аваагүй байна' }); return }

    await db.query(
      `UPDATE orders SET worker_id = $1, status = 'worker_assigned', updated_at = NOW() WHERE id = $2`,
      [workerId, req.params.id],
    )
    await db.query(
      'UPDATE order_acceptances SET picked_at = NOW() WHERE order_id = $1 AND worker_id = $2',
      [req.params.id, workerId],
    )

    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[orders/:id PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/orders/:id/status
const WORKER_STATUSES = ['worker_on_the_way', 'in_progress', 'completed', 'cancelled_by_worker'] as const
const USER_STATUSES   = ['cancelled_by_user'] as const

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ status: z.enum([...WORKER_STATUSES, ...USER_STATUSES]) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Буруу статус' }); return }

    const { status } = parsed.data
    await dbReady

    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string } | undefined
    const isWorker = !!workerRow

    if (!isWorker && status !== 'cancelled_by_user') {
      res.status(403).json({ success: false, error: 'Зөвхөн ажилтан статус өөрчлөх боломжтой' }); return
    }
    if (isWorker && (USER_STATUSES as readonly string[]).includes(status)) {
      res.status(403).json({ success: false, error: 'Зөвхөн захиалагч цуцлах боломжтой' }); return
    }

    if (isWorker && (status === 'in_progress' || status === 'completed')) {
      const photoRow = (await db.query(
        'SELECT before_photo_url, after_photo_url FROM orders WHERE id = $1',
        [req.params.id],
      )).rows[0] as { before_photo_url: string | null; after_photo_url: string | null } | undefined

      if (status === 'in_progress' && !photoRow?.before_photo_url) {
        res.status(422).json({ success: false, error: 'Өмнөх зургаа оруулсны дараа ажил эхлүүлнэ үү' }); return
      }
      if (status === 'completed' && !photoRow?.after_photo_url) {
        res.status(422).json({ success: false, error: 'Дараах зургаа оруулсны дараа ажлыг дуусгана уу' }); return
      }
    }

    const result = isWorker
      ? await db.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND worker_id = $3',
          [status, req.params.id, workerRow!.id],
        )
      : await db.query(
          'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3',
          [status, req.params.id, session.sub],
        )

    if (!result.rowCount) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[orders/:id/status PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/cancel
const FREE_STATUSES = new Set(['pending_acceptances', 'searching_worker', 'pending_worker_acceptance', 'pending_payment'])
const FEE_STATUSES  = new Set(['worker_assigned', 'worker_on_the_way'])
const LATE_CANCEL_FEE = 5000

router.post('/orders/:id/cancel', async (req, res) => {
  try {
    const paramParsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(req.params)
    if (!paramParsed.success) { res.status(400).json({ success: false, error: 'Буруу захиалгын ID' }); return }

    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const order = (await db.query(
      `SELECT id, worker_id, status, scheduled_date, total_amount, service, payment_status
       FROM orders WHERE id = $1 AND user_id = $2`,
      [paramParsed.data.id, session.sub],
    )).rows[0] as { id: string; worker_id: string | null; status: string; scheduled_date: string; total_amount: number; service: string; payment_status: string } | undefined

    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    if (!FREE_STATUSES.has(order.status) && !FEE_STATUSES.has(order.status)) {
      res.status(403).json({ success: false, error: 'Энэ захиалгыг цуцлах боломжгүй' }); return
    }

    let fee = 0
    if (FEE_STATUSES.has(order.status)) {
      const scheduledDate   = new Date(order.scheduled_date)
      const oneHourFromNow  = new Date(Date.now() + 60 * 60 * 1000)
      fee = scheduledDate <= oneHourFromNow ? LATE_CANCEL_FEE : 0
    }

    const refundAmount = Math.max(0, order.total_amount - fee)
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        `UPDATE orders SET status = 'cancelled_by_user', updated_at = NOW() WHERE id = $1`,
        [paramParsed.data.id],
      )
      if (order.payment_status === 'paid') {
        await client.query(
          'INSERT INTO transactions (worker_id, amount, type, service) VALUES ($1, $2, $3, $4)',
          [order.worker_id ?? null, refundAmount, 'refund', order.service],
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.json({ success: true, data: { refundAmount, fee } })
  } catch (err) {
    console.error('[orders/:id/cancel POST]', err)
    res.status(500).json({ success: false, error: 'Алдаа гарлаа' })
  }
})

// POST /api/orders/:id/match
router.post('/orders/:id/match', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const order = (await db.query(
      'SELECT id, status, matching_strategy FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, session.sub],
    )).rows[0] as { id: string; status: string; matching_strategy: string } | undefined

    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    if (order.status !== 'searching_worker' && order.status !== 'pending_worker_acceptance') {
      res.status(409).json({ success: false, error: 'Энэ захиалга аль хэдийн боловсруулагдсан' }); return
    }

    if (order.status === 'pending_worker_acceptance') {
      const stale = (await db.query(
        `SELECT id, offered_at FROM order_match_attempts
         WHERE order_id = $1 AND status = 'offered'
         ORDER BY offered_at DESC LIMIT 1`,
        [req.params.id],
      )).rows[0] as { id: number; offered_at: string } | undefined

      if (stale) {
        const ageMs = Date.now() - new Date(stale.offered_at).getTime()
        if (ageMs < 70_000) {
          res.status(409).json({ success: false, error: 'Ажилтан хариу өгөхийг хүлээж байна' }); return
        }
        await db.query(
          `UPDATE order_match_attempts SET status = 'timeout', responded_at = NOW() WHERE id = $1`,
          [stale.id],
        )
        await db.query(
          `UPDATE orders SET worker_id = NULL, status = 'searching_worker', updated_at = NOW() WHERE id = $1`,
          [req.params.id],
        )
      }
    }

    const countRow = (await db.query(
      `SELECT COUNT(*) as cnt FROM order_match_attempts WHERE order_id = $1 AND status != 'offered'`,
      [req.params.id],
    )).rows[0] as { cnt: string }
    const completedCount = Number(countRow.cnt)

    if (completedCount >= 5) {
      await db.query(
        `UPDATE orders SET status = 'no_workers_found', updated_at = NOW() WHERE id = $1`,
        [req.params.id],
      )
      res.json({ success: true, data: { status: 'no_workers_found' } }); return
    }

    const attemptedRows = (await db.query(
      'SELECT worker_id FROM order_match_attempts WHERE order_id = $1',
      [req.params.id],
    )).rows as { worker_id: number }[]
    const attempted = new Set(attemptedRows.map((r) => r.worker_id))

    const allEligible = (await db.query(`
      SELECT w.id, u.name, w.specialty, w.price_per_hour, w.rating
      FROM   workers w
      JOIN   users        u  ON u.id  = w.user_id
      JOIN   banking_info bi ON bi.worker_id = w.id
      WHERE  w.is_available = true AND w.is_active = true
        AND  w.rating >= 4.0 AND bi.verified = true AND w.user_id != $1
    `, [session.sub])).rows as { id: number; name: string; specialty: string; price_per_hour: number; rating: number }[]
    const eligible = allEligible.filter((w) => !attempted.has(w.id))

    if (eligible.length === 0) {
      await db.query(
        `UPDATE orders SET status = 'no_workers_found', updated_at = NOW() WHERE id = $1`,
        [req.params.id],
      )
      res.json({ success: true, data: { status: 'no_workers_found' } }); return
    }

    const worker = eligible[Math.floor(Math.random() * eligible.length)]!

    await db.query(
      `INSERT INTO order_match_attempts (order_id, worker_id, status) VALUES ($1, $2, 'offered')`,
      [req.params.id, worker.id],
    )
    await db.query(
      `UPDATE orders SET status = 'pending_worker_acceptance', worker_id = $1, updated_at = NOW() WHERE id = $2`,
      [worker.id, req.params.id],
    )

    res.json({
      success: true,
      data: {
        status: 'pending_acceptance',
        attemptNumber: completedCount + 1,
        worker: {
          workerId: String(worker.id), name: worker.name,
          rating: worker.rating, specialty: worker.specialty, pricePerHour: worker.price_per_hour,
        },
      },
    })
  } catch (err) {
    console.error('[orders/:id/match POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/accept
router.post('/orders/:id/accept', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }
    if (!session.is_worker) { res.status(403).json({ success: false, error: 'Зөвхөн ажилтан хүлээж авах боломжтой' }); return }

    await dbReady
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: number } | undefined
    if (!workerRow) { res.status(404).json({ success: false, error: 'Ажилтны бүртгэл олдсонгүй' }); return }

    const order = (await db.query(
      'SELECT id, status, user_id FROM orders WHERE id = $1',
      [req.params.id],
    )).rows[0] as { id: string; status: string; user_id: string } | undefined
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    if (String(order.user_id) === String(session.sub)) {
      res.status(403).json({ success: false, error: 'Өөрийн захиалгаа авах боломжгүй' }); return
    }
    if (order.status !== 'pending_acceptances') {
      res.status(409).json({ success: false, error: 'Энэ захиалга хүлээж авах боломжгүй' }); return
    }

    await db.query(
      'INSERT INTO order_acceptances (order_id, worker_id) VALUES ($1, $2) ON CONFLICT (order_id, worker_id) DO NOTHING',
      [req.params.id, workerRow.id],
    )
    res.status(201).json({ success: true, data: undefined })
  } catch (err) {
    console.error('[orders/:id/accept POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/orders/:id/acceptances
router.get('/orders/:id/acceptances', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const order = (await db.query(
      'SELECT id FROM orders WHERE id = $1 AND user_id = $2',
      [req.params.id, session.sub],
    )).rows[0]
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }

    const rows = (await db.query(`
      SELECT oa.id, oa.order_id, oa.worker_id, oa.created_at,
             u.name as worker_name, w.rating as worker_rating,
             w.review_count as worker_review_count,
             w.specialty as worker_specialty, w.price_per_hour as worker_price_per_hour
      FROM  order_acceptances oa
      JOIN  workers w ON w.id = oa.worker_id
      JOIN  users   u ON u.id = w.user_id
      WHERE oa.order_id = $1
      ORDER BY oa.created_at ASC
    `, [req.params.id])).rows

    res.json({ success: true, data: rows.map((r) => ({
      id: String(r.id), orderId: String(r.order_id), workerId: String(r.worker_id),
      workerName: r.worker_name, workerRating: r.worker_rating,
      workerReviewCount: r.worker_review_count, workerSpecialty: r.worker_specialty,
      workerPricePerHour: r.worker_price_per_hour, acceptedAt: r.created_at,
    })) })
  } catch (err) {
    console.error('[orders/:id/acceptances GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/accept-instant
router.post('/orders/:id/accept-instant', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: number } | undefined
    if (!workerRow) { res.status(403).json({ success: false, error: 'Зөвхөн ажилтан хүлээж авах боломжтой' }); return }

    const order = (await db.query(
      `SELECT id, status, user_id FROM orders WHERE id = $1 AND worker_id = $2 AND status = 'pending_worker_acceptance'`,
      [req.params.id, workerRow.id],
    )).rows[0] as { id: string; status: string; user_id: string } | undefined
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй эсвэл хүлээгдэж буй байдалд биш байна' }); return }
    if (String(order.user_id) === String(session.sub)) {
      res.status(403).json({ success: false, error: 'Өөрийн захиалгаа авах боломжгүй' }); return
    }

    await db.query(
      `UPDATE order_match_attempts SET status = 'accepted', responded_at = NOW()
       WHERE order_id = $1 AND worker_id = $2 AND status = 'offered'`,
      [req.params.id, workerRow.id],
    )
    await db.query(
      `UPDATE orders SET status = 'worker_assigned', updated_at = NOW() WHERE id = $1`,
      [req.params.id],
    )
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[orders/:id/accept-instant POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/decline-instant
router.post('/orders/:id/decline-instant', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: number } | undefined
    if (!workerRow) { res.status(403).json({ success: false, error: 'Зөвхөн ажилтан татгалзах боломжтой' }); return }

    const order = (await db.query(
      `SELECT id, status FROM orders WHERE id = $1 AND worker_id = $2 AND status = 'pending_worker_acceptance'`,
      [req.params.id, workerRow.id],
    )).rows[0]
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй эсвэл хүлээгдэж буй байдалд биш байна' }); return }

    await db.query(
      `UPDATE order_match_attempts SET status = 'declined', responded_at = NOW()
       WHERE order_id = $1 AND worker_id = $2 AND status = 'offered'`,
      [req.params.id, workerRow.id],
    )
    await db.query(
      `UPDATE orders SET status = 'searching_worker', worker_id = NULL, updated_at = NOW() WHERE id = $1`,
      [req.params.id],
    )
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[orders/:id/decline-instant POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/orders/:id/messages
const ACTIVE_STATUSES_SET = new Set(['searching_worker', 'pending_acceptances', 'pending_worker_acceptance', 'worker_assigned', 'worker_on_the_way', 'in_progress'])

async function resolveOrderAccess(orderId: string, userId: string) {
  const row = (await db.query(
    `SELECT o.user_id, o.worker_id, o.status, w.user_id AS worker_user_id
     FROM orders o
     LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
     WHERE o.id = $1`,
    [orderId],
  )).rows[0] as { user_id: string; worker_id: string | null; status: string; worker_user_id: string | null } | undefined
  if (!row) return null
  const isOwner  = String(row.user_id) === String(userId)
  const isWorker = row.worker_user_id != null && String(row.worker_user_id) === String(userId)
  if (!isOwner && !isWorker) return null
  return row
}

router.get('/orders/:id/messages', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const order = await resolveOrderAccess(req.params.id, session.sub)
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    if (!ACTIVE_STATUSES_SET.has(order.status)) {
      res.status(403).json({ success: false, error: 'Чат зөвхөн идэвхтэй захиалгад боломжтой' }); return
    }

    const rows = (await db.query(
      `SELECT m.id, m.order_id, m.sender_id, u.name AS sender_name, m.text, m.created_at
       FROM messages m
       LEFT JOIN users u ON u.id = m.sender_id
       WHERE m.order_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.id],
    )).rows

    res.json({ success: true, data: rows.map((r) => ({
      id: String(r.id), orderId: String(r.order_id), senderId: String(r.sender_id),
      senderName: r.sender_name, text: r.text, createdAt: r.created_at,
    })) })
  } catch (err) {
    console.error('[orders/:id/messages GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/messages
router.post('/orders/:id/messages', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ text: z.string().min(1).max(1000) }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Мессеж хоосон байж болохгүй' }); return }

    await dbReady
    const order = await resolveOrderAccess(req.params.id, session.sub)
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }
    if (!ACTIVE_STATUSES_SET.has(order.status)) {
      res.status(403).json({ success: false, error: 'Чат зөвхөн идэвхтэй захиалгад боломжтой' }); return
    }

    const row = (await db.query(
      `INSERT INTO messages (order_id, sender_id, text) VALUES ($1, $2, $3)
       RETURNING id, order_id, sender_id, text, created_at`,
      [req.params.id, session.sub, parsed.data.text],
    )).rows[0] as { id: string; order_id: string; sender_id: string; text: string; created_at: string }

    const nameRow = (await db.query('SELECT name FROM users WHERE id = $1', [session.sub])).rows[0] as { name: string }
    res.status(201).json({ success: true, data: {
      id: String(row.id), orderId: String(row.order_id), senderId: String(row.sender_id),
      senderName: nameRow.name, text: row.text, createdAt: row.created_at,
    } })
  } catch (err) {
    console.error('[orders/:id/messages POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/review
router.post('/orders/:id/review', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().optional() }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    await dbReady
    const order = (await db.query(
      `SELECT id, worker_id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
      [req.params.id, session.sub],
    )).rows[0] as { id: string; worker_id: string } | undefined
    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' }); return }

    const existing = (await db.query('SELECT id FROM reviews WHERE order_id = $1', [req.params.id])).rows[0]
    if (existing) { res.status(409).json({ success: false, error: 'Та аль хэдийн үнэлсэн байна' }); return }

    const { rating, comment } = parsed.data
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO reviews (order_id, worker_id, rating, comment) VALUES ($1, $2, $3, $4)',
        [req.params.id, order.worker_id, rating, comment ?? null],
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
        [req.params.id],
      )
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    res.status(201).json({ success: true, data: undefined })
  } catch (err) {
    console.error('[orders/:id/review POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/orders/:id/upload (before/after photos)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES     = 5 * 1024 * 1024
const UPLOADS_DIR   = path.resolve(__dirname, '../../../../web/public/uploads')

const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_BYTES } })

router.post('/orders/:id/upload', uploadMiddleware.single('photo'), async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const workerRow = (await db.query(
      'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
      [session.sub],
    )).rows[0] as { id: string } | undefined
    if (!workerRow) { res.status(403).json({ success: false, error: 'Зөвхөн ажилтан зураг оруулах боломжтой' }); return }

    const orderId = req.params.id
    const orderRow = (await db.query(
      'SELECT id FROM orders WHERE id = $1 AND worker_id = $2',
      [orderId, workerRow.id],
    )).rows[0]
    if (!orderRow) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй' }); return }

    const type = req.body.type as string
    if (type !== 'before' && type !== 'after') {
      res.status(400).json({ success: false, error: '"type" нь "before" эсвэл "after" байх ёстой' }); return
    }

    const file = req.file
    if (!file) { res.status(400).json({ success: false, error: 'Зураг оруулаагүй байна' }); return }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      res.status(400).json({ success: false, error: 'Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө' }); return
    }
    if (file.size > MAX_BYTES) {
      res.status(400).json({ success: false, error: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой' }); return
    }

    const ext       = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'
    const filename  = `${type}-${Date.now()}.${ext}`
    const uploadDir = path.join(UPLOADS_DIR, 'orders', orderId)
    const filePath  = path.join(uploadDir, filename)
    const publicUrl = `/uploads/orders/${orderId}/${filename}`

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, file.buffer)

    const col = type === 'before' ? 'before_photo_url' : 'after_photo_url'
    await db.query(
      `UPDATE orders SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
      [publicUrl, orderId],
    )

    res.json({ success: true, data: { url: publicUrl } })
  } catch (err) {
    console.error('[orders/:id/upload POST]', err)
    res.status(500).json({ success: false, error: 'Зураг хадгалахад алдаа гарлаа' })
  }
})

export default router
