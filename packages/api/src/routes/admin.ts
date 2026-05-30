import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAdmin, hashPassword } from '../auth'
import { getSettings } from '../lib/settings'
import type {
  AdminStats, AdminRecentOrder, AdminPendingWorker,
  AdminDispute, AdminBankingWorker,
} from '@homeservices/shared'

const router = new Hono()

// GET /api/admin/stats
router.get('/api/admin/stats', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  await dbReady

  const [
    todayOrdersRow, todayRevenueRow, totalRevenueRow,
    activeWorkersRow, openDisputesRow, pendingWorkersRow, recentRows,
  ] = await Promise.all([
    db.query(`SELECT COUNT(*) as count FROM orders WHERE created_at::date = CURRENT_DATE`),
    db.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ('completed','rated') AND created_at::date = CURRENT_DATE`),
    db.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ('completed','rated')`),
    db.query(`SELECT COUNT(*) as count FROM workers WHERE is_active = true AND rejected_at IS NULL`),
    db.query(`SELECT COUNT(*) as count FROM disputes WHERE status = 'open'`),
    db.query(`SELECT COUNT(*) as count FROM workers WHERE is_active = false AND rejected_at IS NULL`),
    db.query(`
      SELECT o.id, u1.name as customer_name, u2.name as worker_name,
             COALESCE(st.name_mn, '') AS service, o.status, o.total_amount, o.created_at
      FROM   orders o
      JOIN   users u1 ON u1.id = o.user_id
      LEFT JOIN workers w  ON w.id  = o.worker_id AND w.rejected_at IS NULL
      LEFT JOIN users   u2 ON u2.id = w.user_id
      LEFT JOIN service_types st ON st.id = o.service_type_id
      ORDER  BY o.created_at DESC
      LIMIT  20
    `),
  ])

  const todayOrders    = Number(todayOrdersRow.rows[0].count)
  const todayRevenue   = Number(todayRevenueRow.rows[0].total)
  const totalRevenue   = Number(totalRevenueRow.rows[0].total)
  const activeWorkers  = Number(activeWorkersRow.rows[0].count)
  const openDisputes   = Number(openDisputesRow.rows[0].count)
  const pendingWorkers = Number(pendingWorkersRow.rows[0].count)

  type RecentRow = { id: string; customer_name: string; worker_name: string | null; service: string; status: string; total_amount: number; created_at: string }

  const recentOrders: AdminRecentOrder[] = (recentRows.rows as RecentRow[]).map((r) => ({
    id:           String(r.id),
    customerName: r.customer_name,
    workerName:   r.worker_name ?? '—',
    service:      r.service,
    status:       r.status,
    totalAmount:  r.total_amount,
    createdAt:    r.created_at,
  }))

  const { commission, damage_fund } = await getSettings(db)

  const data: AdminStats = {
    todayOrders,
    todayRevenue,
    totalRevenue,
    totalCommission:  Math.round(totalRevenue * commission),
    totalDamageFund:  Math.round(totalRevenue * damage_fund),
    activeWorkers,
    openDisputes,
    pendingWorkers,
    recentOrders,
  }
  return c.json({ success: true, data })
})

// GET /api/admin/workers — list all workers with filters
router.get('/api/admin/workers', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const q         = c.req.query('q') ?? ''
  const status    = c.req.query('status') ?? 'all'
  const specialty = c.req.query('specialty') ?? ''
  const page      = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit     = 20
  const offset    = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[]    = []
  let   idx = 1

  if (status === 'pending')   { conditions.push(`w.is_active = false AND w.rejected_at IS NULL`) }
  if (status === 'active')    { conditions.push(`w.is_active = true  AND w.rejected_at IS NULL`) }
  if (status === 'suspended') { conditions.push(`w.rejected_at IS NOT NULL`) }

  if (q) {
    conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1})`)
    params.push(`%${q}%`, `%${q}%`)
    idx += 2
  }
  if (specialty) {
    const stId = parseInt(specialty, 10)
    if (!isNaN(stId) && stId > 0) {
      conditions.push(`w.service_type_id = $${idx}`)
      params.push(stId)
      idx += 1
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  await dbReady
  const [rowsResult, countResult] = await Promise.all([
    db.query(`
      SELECT w.id, u.name, u.phone, COALESCE(st.name_mn, '') AS specialty, w.price_per_hour,
             w.rating, w.review_count, w.is_active, w.is_available,
             w.rejected_at, w.created_at,
             bi.verified as banking_verified,
             u.dan_verified, w.police_file
      FROM   workers w
      JOIN   users   u  ON u.id  = w.user_id
      LEFT JOIN service_types st ON st.id = w.service_type_id
      LEFT JOIN banking_info bi ON bi.worker_id = w.id
      ${where}
      ORDER BY w.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params),
    db.query(`
      SELECT COUNT(*) as total FROM workers w JOIN users u ON u.id = w.user_id ${where}
    `, params),
  ])

  return c.json({
    success: true,
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pages: Math.ceil(Number(countResult.rows[0].total) / limit),
  })
})

// GET /api/admin/workers/pending — must come before /:id
router.get('/api/admin/workers/pending', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  await dbReady
  type Row = { id: string; name: string; phone: string; specialty: string; dan_verified: boolean; imei: string | null; police_file: string | null; created_at: string }

  const rows = (await db.query(`
    SELECT w.id, u.name, u.phone, COALESCE(st.name_mn, '') AS specialty,
           u.dan_verified, w.imei, w.police_file, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    LEFT JOIN service_types st ON st.id = w.service_type_id
    WHERE  w.is_active = false AND w.rejected_at IS NULL
    ORDER  BY w.created_at ASC
  `)).rows as Row[]

  const data: AdminPendingWorker[] = rows.map((r) => ({
    id:          String(r.id),
    name:        r.name,
    phone:       r.phone,
    specialty:   r.specialty,
    danVerified: r.dan_verified,
    imei:        r.imei,
    policeFile:  r.police_file,
    createdAt:   r.created_at,
  }))

  return c.json({ success: true, data })
})

// GET /api/admin/workers/:id
router.get('/api/admin/workers/:id', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  await dbReady

  const worker = (await db.query(`
    SELECT w.id, w.service_type_id, u.id as user_id, u.name, u.phone, u.email, u.dan_verified,
           COALESCE(st.name_mn, '') AS specialty, w.price_per_hour, w.rating, w.review_count,
           w.is_active, w.is_available, w.rejected_at, w.imei, w.police_file, w.created_at,
           bi.bank_name, bi.account_number, bi.account_holder_name, bi.iban,
           bi.account_type, bi.verified as banking_verified
    FROM   workers w
    JOIN   users   u  ON u.id  = w.user_id
    LEFT JOIN service_types st ON st.id = w.service_type_id
    LEFT JOIN banking_info bi ON bi.worker_id = w.id
    WHERE  w.id = $1
  `, [id])).rows[0]

  if (!worker) return c.json({ success: false, error: 'Олдсонгүй' }, 404)

  const orders = (await db.query(`
    SELECT o.id, COALESCE(st.name_mn, '') AS service, o.status, o.total_amount, o.created_at,
           u.name as customer_name
    FROM   orders o
    JOIN   users u ON u.id = o.user_id
    LEFT JOIN service_types st ON st.id = o.service_type_id
    WHERE  o.worker_id = $1
    ORDER BY o.created_at DESC LIMIT 20
  `, [id])).rows

  return c.json({ success: true, data: { ...worker, orders } })
})

const workerPatchSchema = z.object({
  // workers table
  is_active:                 z.boolean().optional(),
  is_available:              z.boolean().optional(),
  service_type_id:           z.number().int().positive().nullable().optional(),
  price_per_hour:            z.number().int().min(0).max(500000).optional(),
  rejected_at:               z.string().nullable().optional(),
  police_clearance_verified: z.boolean().optional(),
  // users table
  name:                      z.string().min(1).optional(),
  phone:                     z.string().optional(),
  dan_verified:              z.boolean().optional(),
  // banking_info table
  bank_name:                 z.string().optional(),
  account_number:            z.string().optional(),
  account_holder_name:       z.string().optional(),
  iban:                      z.string().optional(),
  account_type:              z.string().optional(),
})

// PATCH /api/admin/workers/:id
router.patch('/api/admin/workers/:id', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = workerPatchSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message }, 400)
  }

  await dbReady
  const d = parsed.data

  const workerRow = (await db.query(
    'SELECT user_id, police_file FROM workers WHERE id = $1', [id],
  )).rows[0] as { user_id: number; police_file: string | null } | undefined
  if (!workerRow) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)
  const { user_id, police_file } = workerRow

  // Update workers table
  const wSets: string[] = []
  const wVals: unknown[] = []
  let wi = 1

  if (d.is_active       !== undefined) { wSets.push(`is_active = $${wi++}`)       ; wVals.push(d.is_active) }
  if (d.is_available    !== undefined) { wSets.push(`is_available = $${wi++}`)    ; wVals.push(d.is_available) }
  if (d.service_type_id !== undefined) { wSets.push(`service_type_id = $${wi++}`); wVals.push(d.service_type_id) }
  if (d.price_per_hour  !== undefined) { wSets.push(`price_per_hour = $${wi++}`) ; wVals.push(d.price_per_hour) }
  if ('rejected_at' in d)              { wSets.push(`rejected_at = $${wi++}`)     ; wVals.push(d.rejected_at ?? null) }
  if (d.police_clearance_verified !== undefined) {
    wSets.push(`police_file = $${wi++}`)
    wVals.push(d.police_clearance_verified ? (police_file ?? 'admin_verified') : null)
  }

  if (wSets.length > 0) {
    wVals.push(id)
    await db.query(`UPDATE workers SET ${wSets.join(', ')} WHERE id = $${wi}`, wVals)
  }

  // Update users table
  const uSets: string[] = []
  const uVals: unknown[] = []
  let ui = 1

  if (d.name         !== undefined) { uSets.push(`name = $${ui++}`)        ; uVals.push(d.name) }
  if (d.phone        !== undefined) { uSets.push(`phone = $${ui++}`)       ; uVals.push(d.phone) }
  if (d.dan_verified !== undefined) { uSets.push(`dan_verified = $${ui++}`); uVals.push(d.dan_verified) }
  if (d.is_active    !== undefined) { uSets.push(`is_worker = $${ui++}`)   ; uVals.push(d.is_active) }

  if (uSets.length > 0) {
    uVals.push(user_id)
    await db.query(`UPDATE users SET ${uSets.join(', ')} WHERE id = $${ui}`, uVals)
  }

  // Upsert banking_info
  const hasBankUpdate = [d.bank_name, d.account_number, d.account_holder_name, d.iban, d.account_type]
    .some(v => v !== undefined)

  if (hasBankUpdate) {
    const existingBank = (await db.query(
      'SELECT id FROM banking_info WHERE worker_id = $1', [id],
    )).rows[0]

    if (existingBank) {
      const bSets: string[] = []
      const bVals: unknown[] = []
      let bi = 1
      if (d.bank_name           !== undefined) { bSets.push(`bank_name = $${bi++}`)           ; bVals.push(d.bank_name) }
      if (d.account_number      !== undefined) { bSets.push(`account_number = $${bi++}`)      ; bVals.push(d.account_number) }
      if (d.account_holder_name !== undefined) { bSets.push(`account_holder_name = $${bi++}`) ; bVals.push(d.account_holder_name) }
      if (d.iban                !== undefined) { bSets.push(`iban = $${bi++}`)                ; bVals.push(d.iban) }
      if (d.account_type        !== undefined) { bSets.push(`account_type = $${bi++}`)        ; bVals.push(d.account_type) }
      bSets.push(`updated_at = NOW()`)
      if (bSets.length > 1) {
        bVals.push(id)
        await db.query(`UPDATE banking_info SET ${bSets.join(', ')} WHERE worker_id = $${bi}`, bVals)
      }
    } else if (d.bank_name && d.account_number && d.account_holder_name && d.iban) {
      await db.query(
        `INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, d.bank_name, d.account_number, d.account_holder_name, d.iban, d.account_type ?? 'checking'],
      )
    }
  }

  return c.json({ success: true, data: null })
})

const verifySchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

// PATCH /api/admin/workers/:id/verify
router.patch('/api/admin/workers/:id/verify', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)

  const id = c.req.param('id')
  const { action } = parsed.data

  await dbReady
  const worker = (await db.query('SELECT id FROM workers WHERE id = $1', [id])).rows[0]
  if (!worker) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  if (action === 'approve') {
    await db.query('UPDATE workers SET is_active = true, rejected_at = NULL WHERE id = $1', [id])
    await db.query(
      'UPDATE users SET is_worker = true WHERE id = (SELECT user_id FROM workers WHERE id = $1)',
      [id],
    )
  } else {
    await db.query('UPDATE workers SET rejected_at = NOW() WHERE id = $1', [id])
    await db.query(
      'UPDATE users SET is_worker = false WHERE id = (SELECT user_id FROM workers WHERE id = $1)',
      [id],
    )
  }

  return c.json({ success: true, data: undefined })
})

const workerCreateSchema = z.object({
  name:                      z.string().min(1),
  phone:                     z.string().min(8),
  service_type_id:           z.number().int().positive().optional(),
  price_per_hour:            z.number().int().min(0).max(500000).optional(),
  is_available:              z.boolean().optional(),
  is_active:                 z.boolean().optional(),
  dan_verified:              z.boolean().optional(),
  police_clearance_verified: z.boolean().optional(),
  bank_name:                 z.string().optional(),
  account_number:            z.string().optional(),
  account_holder_name:       z.string().optional(),
  iban:                      z.string().optional(),
  account_type:              z.string().optional(),
})

// POST /api/admin/workers
router.post('/api/admin/workers', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = workerCreateSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message }, 400)
  }

  await dbReady
  const d = parsed.data
  const isActive  = d.is_active ?? false
  const policeFile = d.police_clearance_verified ? 'admin_verified' : null

  // Find or create user by phone
  const existingUser = (await db.query(
    'SELECT id FROM users WHERE phone = $1', [d.phone],
  )).rows[0] as { id: number } | undefined

  let userId: number
  if (existingUser) {
    userId = existingUser.id
    await db.query(
      'UPDATE users SET name = $1, dan_verified = $2, is_worker = $3 WHERE id = $4',
      [d.name, d.dan_verified ?? false, isActive, userId],
    )
  } else {
    const newUser = (await db.query(
      `INSERT INTO users (phone, name, dan_verified, is_worker) VALUES ($1, $2, $3, $4) RETURNING id`,
      [d.phone, d.name, d.dan_verified ?? false, isActive],
    )).rows[0] as { id: number }
    userId = newUser.id
  }

  // Reject if this user already has a worker profile
  const existingWorker = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1', [userId],
  )).rows[0]
  if (existingWorker) {
    return c.json({ success: false, error: 'Энэ утасны дугаартай ажилтан аль хэдийн бүртгэгдсэн байна' }, 409)
  }

  const worker = (await db.query(
    `INSERT INTO workers (user_id, service_type_id, price_per_hour, is_available, is_active, police_file)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [userId, d.service_type_id ?? null, d.price_per_hour ?? 0, d.is_available ?? true, isActive, policeFile],
  )).rows[0] as { id: number }

  if (d.bank_name && d.account_number && d.account_holder_name && d.iban) {
    await db.query(
      `INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [worker.id, d.bank_name, d.account_number, d.account_holder_name, d.iban, d.account_type ?? 'checking'],
    )
  }

  return c.json({ success: true, data: { id: String(worker.id) } }, 201)
})

// GET /api/admin/orders
router.get('/api/admin/orders', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const q       = c.req.query('q') ?? ''
  const status  = c.req.query('status') ?? ''
  const service = c.req.query('service') ?? ''
  const from    = c.req.query('from') ?? ''
  const to      = c.req.query('to') ?? ''
  const page    = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit   = 20
  const offset  = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[]    = []
  let   idx = 1

  if (status) { conditions.push(`o.status = $${idx++}`)         ; params.push(status) }
  if (service) {
    const stId = parseInt(service, 10)
    if (!isNaN(stId) && stId > 0) {
      conditions.push(`o.service_type_id = $${idx++}`)
      params.push(stId)
    }
  }
  if (from) { conditions.push(`o.created_at >= $${idx++}`)      ; params.push(from) }
  if (to)   { conditions.push(`o.created_at <= $${idx++}`)      ; params.push(to + 'T23:59:59Z') }
  if (q) {
    conditions.push(`(u1.name ILIKE $${idx} OR u2.name ILIKE $${idx + 1} OR o.address ILIKE $${idx + 2})`)
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    idx += 3
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  await dbReady
  const [rowsResult, countResult] = await Promise.all([
    db.query(`
      SELECT o.id, COALESCE(st.name_mn, '') AS service, o.status, o.address, o.total_amount,
             o.payment_status, o.scheduled_date, o.created_at,
             o.matching_strategy, o.urgent,
             u1.name as customer_name, u2.name as worker_name
      FROM   orders o
      JOIN   users u1 ON u1.id = o.user_id
      LEFT JOIN workers w  ON w.id  = o.worker_id
      LEFT JOIN users   u2 ON u2.id = w.user_id
      LEFT JOIN service_types st ON st.id = o.service_type_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params),
    db.query(
      `SELECT COUNT(*) as total FROM orders o
       JOIN users u1 ON u1.id = o.user_id
       LEFT JOIN workers w ON w.id = o.worker_id
       LEFT JOIN users u2 ON u2.id = w.user_id
       ${where}`, params
    ),
  ])

  return c.json({
    success: true,
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pages: Math.ceil(Number(countResult.rows[0].total) / limit),
  })
})

// GET /api/admin/orders/:id
router.get('/api/admin/orders/:id', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  await dbReady

  const order = (await db.query(`
    SELECT o.id, o.user_id, o.worker_id, o.service_type_id, o.status, o.address,
           o.scheduled_date, o.hours, o.total_amount, o.urgent, o.rooms, o.area_sqm,
           o.property_type, o.notes, o.matching_strategy, o.payment_status,
           o.before_photo_url, o.after_photo_url, o.created_at, o.updated_at,
           COALESCE(st.name_mn, '') AS service,
           u1.name as customer_name, u1.phone as customer_phone,
           u2.name as worker_name,
           COALESCE(wst.name_mn, '') as worker_specialty, w.price_per_hour
    FROM   orders o
    JOIN   users u1 ON u1.id = o.user_id
    LEFT JOIN workers w   ON w.id  = o.worker_id
    LEFT JOIN users   u2  ON u2.id = w.user_id
    LEFT JOIN service_types st  ON st.id  = o.service_type_id
    LEFT JOIN service_types wst ON wst.id = w.service_type_id
    WHERE  o.id = $1
  `, [id])).rows[0]

  if (!order) return c.json({ success: false, error: 'Олдсонгүй' }, 404)

  const [messages, transactions] = await Promise.all([
    db.query(`
      SELECT m.text, m.created_at, u.name as sender_name
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.order_id = $1 ORDER BY m.created_at
    `, [id]),
    db.query(`
      SELECT t.amount, t.type, t.created_at
      FROM transactions t WHERE t.worker_id = (
        SELECT worker_id FROM orders WHERE id = $1
      ) ORDER BY t.created_at DESC LIMIT 20
    `, [id]),
  ])

  return c.json({
    success: true,
    data: { ...order, messages: messages.rows, transactions: transactions.rows },
  })
})

const orderAdminPatchSchema = z.object({
  status: z.enum(['cancelled_by_admin']).optional(),
  cancel_reason: z.string().optional(),
})

// PATCH /api/admin/orders/:id
router.patch('/api/admin/orders/:id', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = orderAdminPatchSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message }, 400)
  }

  await dbReady
  await db.query(
    `UPDATE orders SET status = 'cancelled_by_admin', updated_at = NOW() WHERE id = $1`,
    [id],
  )

  return c.json({ success: true, data: null })
})

// GET /api/admin/disputes
router.get('/api/admin/disputes', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  await dbReady
  type Row = {
    id: string; order_id: string; customer_name: string; worker_name: string | null
    service: string; issue: string; status: string; total_amount: number
    compensation_amount: number | null; created_at: string
    photo_urls: string[]; before_photo_url: string | null; after_photo_url: string | null
  }

  const rows = (await db.query(`
    SELECT d.id, d.order_id, d.issue, d.status, d.compensation_amount, d.created_at,
           d.photo_urls,
           u1.name as customer_name, u2.name as worker_name,
           o.service, o.total_amount, o.before_photo_url, o.after_photo_url
    FROM   disputes d
    JOIN   orders  o  ON o.id  = d.order_id
    JOIN   users   u1 ON u1.id = o.user_id
    LEFT JOIN workers w  ON w.id  = o.worker_id AND w.rejected_at IS NULL
    LEFT JOIN users   u2 ON u2.id = w.user_id
    ORDER  BY d.created_at DESC
  `)).rows as Row[]

  const data: AdminDispute[] = rows.map((r) => ({
    id:                 String(r.id),
    orderId:            String(r.order_id),
    customerName:       r.customer_name,
    workerName:         r.worker_name ?? '—',
    service:            r.service,
    issue:              r.issue,
    status:             r.status,
    totalAmount:        r.total_amount,
    compensationAmount: r.compensation_amount,
    createdAt:          r.created_at,
    beforePhotoUrl:     r.before_photo_url,
    afterPhotoUrl:      r.after_photo_url,
    disputePhotoUrls:   r.photo_urls ?? [],
  }))

  return c.json({ success: true, data })
})

const resolveDisputeSchema = z.object({
  compensationAmount: z.number().int().min(0).optional(),
})

// PATCH /api/admin/disputes/:id/resolve
router.patch('/api/admin/disputes/:id/resolve', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = resolveDisputeSchema.safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)

  const id = c.req.param('id')
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
    return c.json({ success: false, error: 'Гомдол олдсонгүй эсвэл аль хэдийн шийдэгдсэн' }, 404)
  }

  return c.json({ success: true, data: undefined })
})

// GET /api/admin/users
router.get('/api/admin/users', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const q      = c.req.query('q') ?? ''
  const role   = c.req.query('role') ?? ''
  const page   = Math.max(1, Number(c.req.query('page') ?? 1))
  const limit  = 20
  const offset = (page - 1) * limit

  const conditions: string[] = ['u.better_auth_id IS NOT NULL OR u.phone IS NOT NULL']
  const params: unknown[]    = []
  let   idx = 1

  if (q) {
    conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1} OR u.email ILIKE $${idx + 2})`)
    params.push(`%${q}%`, `%${q}%`, `%${q}%`)
    idx += 3
  }
  if (role) {
    conditions.push(`u.role = $${idx}`)
    params.push(role)
    idx += 1
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  await dbReady
  const [rowsResult, countResult] = await Promise.all([
    db.query(`
      SELECT u.id, u.name, u.phone, u.email, u.role, u.is_worker,
             u.active_mode, u.dan_verified, u.avatar_url, u.deleted_at,
             u.created_at, u.better_auth_id,
             (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) as order_count,
             (SELECT a."providerId" FROM account a JOIN "user" bu ON bu.id = a."userId"
              WHERE bu.id = u.better_auth_id LIMIT 1) as auth_method
      FROM users u
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, params),
    db.query(`SELECT COUNT(*) as total FROM users u ${where}`, params),
  ])

  return c.json({
    success: true,
    data: rowsResult.rows,
    total: Number(countResult.rows[0].total),
    page,
    pages: Math.ceil(Number(countResult.rows[0].total) / limit),
  })
})

// GET /api/admin/users/:id
router.get('/api/admin/users/:id', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  await dbReady

  const user = (await db.query(`
    SELECT u.id, u.name, u.phone, u.email, u.role, u.is_worker, u.active_mode,
           u.dan_verified, u.avatar_url, u.deleted_at, u.created_at, u.better_auth_id,
           (SELECT a."providerId" FROM account a JOIN "user" bu ON bu.id = a."userId"
            WHERE bu.id = u.better_auth_id LIMIT 1) as auth_method
    FROM users u WHERE u.id = $1
  `, [id])).rows[0]

  if (!user) return c.json({ success: false, error: 'Олдсонгүй' }, 404)

  const orders = (await db.query(`
    SELECT o.id, o.service, o.status, o.total_amount, o.created_at
    FROM orders o WHERE o.user_id = $1
    ORDER BY o.created_at DESC LIMIT 20
  `, [id])).rows

  return c.json({ success: true, data: { ...user, orders } })
})

const userAdminPatchSchema = z.object({
  name:         z.string().min(1).optional(),
  phone:        z.string().optional(),
  email:        z.string().email().optional(),
  role:         z.enum(['user', 'admin']).optional(),
  is_worker:    z.boolean().optional(),
  active_mode:  z.enum(['user', 'worker']).optional(),
  dan_verified: z.boolean().optional(),
  avatar_url:   z.string().optional(),
  suspended:    z.boolean().optional(),
})

// PATCH /api/admin/users/:id
router.patch('/api/admin/users/:id', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = userAdminPatchSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.issues[0]?.message }, 400)
  }

  await dbReady
  const d = parsed.data
  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1

  if (d.name         !== undefined) { sets.push(`name = $${i++}`)        ; vals.push(d.name) }
  if (d.phone        !== undefined) { sets.push(`phone = $${i++}`)       ; vals.push(d.phone) }
  if (d.email        !== undefined) { sets.push(`email = $${i++}`)       ; vals.push(d.email) }
  if (d.role         !== undefined) { sets.push(`role = $${i++}`)        ; vals.push(d.role) }
  if (d.is_worker    !== undefined) { sets.push(`is_worker = $${i++}`)   ; vals.push(d.is_worker) }
  if (d.active_mode  !== undefined) { sets.push(`active_mode = $${i++}`) ; vals.push(d.active_mode) }
  if (d.dan_verified !== undefined) { sets.push(`dan_verified = $${i++}`); vals.push(d.dan_verified) }
  if (d.avatar_url   !== undefined) { sets.push(`avatar_url = $${i++}`)  ; vals.push(d.avatar_url) }
  if (d.suspended    !== undefined) {
    sets.push(`deleted_at = $${i++}`)
    vals.push(d.suspended ? new Date().toISOString() : null)
  }

  if (sets.length === 0) return c.json({ success: true, data: null })

  vals.push(id)
  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals)
  return c.json({ success: true, data: null })
})

const passwordSchema = z.object({ password: z.string().min(8) })

// POST /api/admin/users/:id/password
router.post('/api/admin/users/:id/password', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const id = c.req.param('id')
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = passwordSchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'Нууц үг 8-аас дээш тэмдэгт байх ёстой' }, 400)
  }

  await dbReady
  const user = (await db.query(
    `SELECT better_auth_id FROM users WHERE id = $1`, [id]
  )).rows[0] as { better_auth_id: string | null } | undefined

  if (!user?.better_auth_id) {
    return c.json({ success: false, error: 'Энэ хэрэглэгч нэвтрэх данс байхгүй' }, 404)
  }

  const hash = hashPassword(parsed.data.password)
  await db.query(
    `UPDATE account SET password = $1, "updatedAt" = NOW()
     WHERE "userId" = $2 AND "providerId" = 'credential'`,
    [hash, user.better_auth_id],
  )

  return c.json({ success: true, data: null })
})

// GET /api/admin/banking
router.get('/api/admin/banking', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  await dbReady
  type Row = {
    id: string; worker_id: string; name: string; phone: string
    bank_name: string; account_number: string; account_holder_name: string
    iban: string; account_type: string; updated_at: string
  }

  const rows = (await db.query(`
    SELECT b.id, b.worker_id, u.name, u.phone,
           b.bank_name, b.account_number, b.account_holder_name,
           b.iban, b.account_type, b.updated_at
    FROM   banking_info b
    JOIN   workers w ON w.id = b.worker_id AND w.rejected_at IS NULL
    JOIN   users   u ON u.id = w.user_id
    WHERE  b.verified = false
    ORDER  BY b.updated_at ASC
  `)).rows as Row[]

  const data: AdminBankingWorker[] = rows.map((r) => ({
    id:                String(r.id),
    workerId:          String(r.worker_id),
    workerName:        r.name,
    phone:             r.phone,
    bankName:          r.bank_name,
    accountNumber:     r.account_number,
    accountHolderName: r.account_holder_name,
    iban:              r.iban,
    accountType:       r.account_type as AdminBankingWorker['accountType'],
    submittedAt:       r.updated_at,
  }))

  return c.json({ success: true, data })
})

const bankingVerifySchema = z.object({ action: z.enum(['approve', 'reject']) })

// PATCH /api/admin/banking/:worker_id/verify
router.patch('/api/admin/banking/:worker_id/verify', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, 403)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = bankingVerifySchema.safeParse(body)
  if (!parsed.success) {
    return c.json({ success: false, error: 'action нь "approve" эсвэл "reject" байх ёстой' }, 400)
  }

  const worker_id = c.req.param('worker_id')
  await dbReady

  const row = (await db.query(
    'SELECT id FROM banking_info WHERE worker_id = $1',
    [worker_id],
  )).rows[0] as { id: string } | undefined

  if (!row) return c.json({ success: false, error: 'Банкны мэдээлэл олдсонгүй' }, 404)

  if (parsed.data.action === 'approve') {
    await db.query(
      'UPDATE banking_info SET verified = true, updated_at = NOW() WHERE worker_id = $1',
      [worker_id],
    )
  } else {
    await db.query('DELETE FROM banking_info WHERE worker_id = $1', [worker_id])
  }

  return c.json({ success: true, data: undefined })
})

// GET /api/admin/finance
router.get('/api/admin/finance', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  await dbReady

  const [totalRev, monthRev, payouts, txRows] = await Promise.all([
    db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status IN ('completed','rated')`),
    db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders
              WHERE status IN ('completed','rated') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),
    db.query(`
      SELECT u.name, w.id as worker_id,
             COALESCE(SUM(CASE WHEN t.type='earning' THEN t.amount ELSE 0 END),0) as total_earned,
             COALESCE(SUM(CASE WHEN t.type='withdrawal' THEN t.amount ELSE 0 END),0) as total_withdrawn
      FROM workers w
      JOIN users u ON u.id = w.user_id
      LEFT JOIN transactions t ON t.worker_id = w.id
      WHERE w.is_active = true AND w.rejected_at IS NULL
      GROUP BY u.name, w.id
      ORDER BY total_earned DESC
    `),
    db.query(`
      SELECT t.id, t.amount, t.type, t.service, t.created_at, u.name as worker_name
      FROM transactions t
      LEFT JOIN workers w ON w.id = t.worker_id
      LEFT JOIN users   u ON u.id = w.user_id
      ORDER BY t.created_at DESC LIMIT 50
    `),
  ])

  const { commission, damage_fund } = await getSettings(db)
  const totalRevenue = Number(totalRev.rows[0].total)
  const monthRevenue = Number(monthRev.rows[0].total)

  return c.json({
    success: true,
    data: {
      totalRevenue,
      monthRevenue,
      totalCommission:  Math.round(totalRevenue * commission),
      totalDamageFund:  Math.round(totalRevenue * damage_fund),
      payouts: payouts.rows.map((r) => ({
        ...r,
        total_earned:    Number(r.total_earned),
        total_withdrawn: Number(r.total_withdrawn),
        pending:         Number(r.total_earned) - Number(r.total_withdrawn),
      })),
      transactions: txRows.rows,
    },
  })
})

// GET /api/admin/master-data
router.get('/api/admin/master-data', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  await dbReady

  const [serviceTypes, districts, pricingRules, settings] = await Promise.all([
    db.query(`SELECT st.*, pr.base_rate, pr.peak_multiplier, pr.holiday_multiplier
              FROM service_types st
              LEFT JOIN pricing_rules pr ON pr.service_type_id = st.id
              ORDER BY st.sort_order`),
    db.query(`SELECT * FROM districts ORDER BY name_mn`),
    db.query(`SELECT pr.*, st.name_mn FROM pricing_rules pr JOIN service_types st ON st.id = pr.service_type_id`),
    db.query(`SELECT * FROM app_settings ORDER BY key`),
  ])

  return c.json({
    success: true,
    data: {
      serviceTypes:  serviceTypes.rows,
      districts:     districts.rows,
      pricingRules:  pricingRules.rows,
      settings:      Object.fromEntries(settings.rows.map((r: { key: string; value: string }) => [r.key, r.value])),
    },
  })
})

const ALLOWED_TYPES_MD = ['service_types', 'districts', 'pricing_rules', 'app_settings'] as const
type AllowedTypeMD = typeof ALLOWED_TYPES_MD[number]
function isAllowed(t: string): t is AllowedTypeMD {
  return (ALLOWED_TYPES_MD as readonly string[]).includes(t)
}

// POST /api/admin/master-data/:type
router.post('/api/admin/master-data/:type', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const type = c.req.param('type')
  if (!isAllowed(type)) return c.json({ success: false, error: 'Буруу төрөл' }, 400)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  await dbReady

  if (type === 'service_types') {
    const s = z.object({ name_mn: z.string().min(1), icon: z.string().min(1), sort_order: z.number().int().optional() }).safeParse(body)
    if (!s.success) return c.json({ success: false, error: s.error.issues[0]?.message }, 400)
    const row = (await db.query(
      `INSERT INTO service_types (name_mn, icon, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [s.data.name_mn, s.data.icon, s.data.sort_order ?? 0],
    )).rows[0]
    await db.query(`INSERT INTO pricing_rules (service_type_id) VALUES ($1)`, [row.id])
    return c.json({ success: true, data: row })
  }

  if (type === 'districts') {
    const s = z.object({ name_mn: z.string().min(1) }).safeParse(body)
    if (!s.success) return c.json({ success: false, error: s.error.issues[0]?.message }, 400)
    const row = (await db.query(`INSERT INTO districts (name_mn) VALUES ($1) RETURNING *`, [s.data.name_mn])).rows[0]
    return c.json({ success: true, data: row })
  }

  return c.json({ success: false, error: 'POST дэмжигдэхгүй' }, 400)
})

// PATCH /api/admin/master-data/:type
router.patch('/api/admin/master-data/:type', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const type = c.req.param('type')
  if (!isAllowed(type)) return c.json({ success: false, error: 'Буруу төрөл' }, 400)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  await dbReady

  if (type === 'service_types') {
    const s = z.object({ id: z.number(), name_mn: z.string().optional(), icon: z.string().optional(), is_active: z.boolean().optional(), sort_order: z.number().int().optional() }).safeParse(body)
    if (!s.success) return c.json({ success: false, error: s.error.issues[0]?.message }, 400)
    const { id, ...rest } = s.data
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (rest.name_mn    !== undefined) { sets.push(`name_mn = $${i++}`)   ; vals.push(rest.name_mn) }
    if (rest.icon       !== undefined) { sets.push(`icon = $${i++}`)      ; vals.push(rest.icon) }
    if (rest.is_active  !== undefined) { sets.push(`is_active = $${i++}`) ; vals.push(rest.is_active) }
    if (rest.sort_order !== undefined) { sets.push(`sort_order = $${i++}`); vals.push(rest.sort_order) }
    if (!sets.length) return c.json({ success: true, data: null })
    vals.push(id)
    await db.query(`UPDATE service_types SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return c.json({ success: true, data: null })
  }

  if (type === 'districts') {
    const s = z.object({ id: z.number(), name_mn: z.string().optional(), is_active: z.boolean().optional() }).safeParse(body)
    if (!s.success) return c.json({ success: false, error: s.error.issues[0]?.message }, 400)
    const { id, ...rest } = s.data
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (rest.name_mn   !== undefined) { sets.push(`name_mn = $${i++}`)   ; vals.push(rest.name_mn) }
    if (rest.is_active !== undefined) { sets.push(`is_active = $${i++}`) ; vals.push(rest.is_active) }
    if (!sets.length) return c.json({ success: true, data: null })
    vals.push(id)
    await db.query(`UPDATE districts SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return c.json({ success: true, data: null })
  }

  if (type === 'pricing_rules') {
    const s = z.object({ id: z.number(), base_rate: z.number().int().optional(), peak_multiplier: z.number().int().optional(), holiday_multiplier: z.number().int().optional() }).safeParse(body)
    if (!s.success) return c.json({ success: false, error: s.error.issues[0]?.message }, 400)
    const { id, ...rest } = s.data
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (rest.base_rate          !== undefined) { sets.push(`base_rate = $${i++}`)          ; vals.push(rest.base_rate) }
    if (rest.peak_multiplier    !== undefined) { sets.push(`peak_multiplier = $${i++}`)    ; vals.push(rest.peak_multiplier) }
    if (rest.holiday_multiplier !== undefined) { sets.push(`holiday_multiplier = $${i++}`) ; vals.push(rest.holiday_multiplier) }
    if (!sets.length) return c.json({ success: true, data: null })
    vals.push(id); sets.push(`updated_at = NOW()`)
    await db.query(`UPDATE pricing_rules SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return c.json({ success: true, data: null })
  }

  if (type === 'app_settings') {
    const s = z.object({ key: z.string(), value: z.string() }).safeParse(body)
    if (!s.success) return c.json({ success: false, error: s.error.issues[0]?.message }, 400)
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [s.data.key, s.data.value],
    )
    return c.json({ success: true, data: null })
  }

  return c.json({ success: false, error: 'PATCH дэмжигдэхгүй' }, 400)
})

// DELETE /api/admin/master-data/:type
router.delete('/api/admin/master-data/:type', async (c) => {
  const session = await requireAdmin(c)
  if (!session) return c.json({ success: false, error: 'Зөвхөн админ' }, 403)

  const type = c.req.param('type')
  const id = c.req.query('id')
  if (!id) return c.json({ success: false, error: 'id шаардлагатай' }, 400)

  await dbReady

  if (type === 'service_types') {
    await db.query(`UPDATE service_types SET is_active = false WHERE id = $1`, [id])
    return c.json({ success: true, data: null })
  }
  if (type === 'districts') {
    await db.query(`UPDATE districts SET is_active = false WHERE id = $1`, [id])
    return c.json({ success: true, data: null })
  }

  return c.json({ success: false, error: 'DELETE дэмжигдэхгүй' }, 400)
})

export default router
