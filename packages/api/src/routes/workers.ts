import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import type { Worker, BankingInfo, AccountType, Transaction, TransactionType } from '@homeservices/shared'

const router = new Hono()

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  service_type_id: string | null
  price_per_hour: number; rating_sum: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
}

type BankingRow = {
  id: string; worker_id: string; bank_name: string; account_number: string
  account_holder_name: string; iban: string; account_type: string
  verified: boolean; updated_at: string
}

function toWorker(row: WorkerRow): Worker {
  return {
    id:            String(row.id),
    userId:        String(row.user_id),
    name:          row.name,
    specialty:     row.specialty ?? '',
    serviceTypeId: row.service_type_id ? Number(row.service_type_id) : undefined,
    pricePerHour:  row.price_per_hour,
    rating:        row.review_count > 0 ? Math.round(row.rating_sum / row.review_count * 10) / 10 : 0,
    reviewCount:   row.review_count,
    isAvailable:   Boolean(row.is_available),
    isActive:      Boolean(row.is_active),
    danVerified:   Boolean(row.dan_verified),
    createdAt:     row.created_at,
  }
}

function toBankingInfo(row: BankingRow): BankingInfo {
  return {
    id:                String(row.id),
    workerId:          String(row.worker_id),
    bankName:          row.bank_name,
    accountNumber:     row.account_number,
    accountHolderName: row.account_holder_name,
    iban:              row.iban,
    accountType:       row.account_type as AccountType,
    verified:          Boolean(row.verified),
    updatedAt:         row.updated_at,
  }
}

// GET /api/workers
router.get('/api/workers', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const q         = c.req.query('q') ?? ''
  const specialty = c.req.query('specialty') ?? ''
  const sort      = c.req.query('sort') ?? 'rating'
  const skipAvailabilityFilter = c.req.query('available') === '0'

  const conditions: string[] = ['w.is_active = true', 'w.rejected_at IS NULL']
  const qParams: unknown[]   = []
  let pIdx = 1

  if (!skipAvailabilityFilter) {
    conditions.push('w.is_available = true')
  }
  if (q) {
    conditions.push(`(u.name ILIKE $${pIdx} OR st.name_mn ILIKE $${pIdx + 1})`)
    qParams.push(`%${q}%`, `%${q}%`)
    pIdx += 2
  }
  if (specialty) {
    const stId = parseInt(specialty, 10)
    if (!isNaN(stId) && stId > 0) {
      conditions.push(`w.service_type_id = $${pIdx}`)
      qParams.push(stId)
      pIdx += 1
    }
  }

  const orderBy =
    sort === 'price_asc'  ? 'w.price_per_hour ASC'  :
    sort === 'price_desc' ? 'w.price_per_hour DESC'  :
    '(w.rating_sum::float / NULLIF(w.review_count, 0)) DESC NULLS LAST, w.review_count DESC'

  await dbReady
  const rows = (await db.query(`
    SELECT w.id, w.user_id, u.name, COALESCE(st.name_mn, '') AS specialty,
           w.service_type_id, w.price_per_hour,
           w.rating_sum, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    LEFT JOIN service_types st ON st.id = w.service_type_id
    WHERE  ${conditions.join(' AND ')}
    ORDER  BY ${orderBy}
    LIMIT  50
  `, qParams)).rows as WorkerRow[]

  return c.json({ success: true, data: rows.map(toWorker) })
})

// POST /api/workers/register — must come before /:id
router.post('/api/workers/register', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const schema = z.object({
    imei:               z.string().length(15),
    policeFile:         z.string().min(1),
    serviceTypeId:      z.number().int().positive(),
    pricePerHour:       z.number().int().min(1000).max(500000),
    bankName:           z.string().min(1),
    accountNumber:      z.string().regex(/^\d{10,20}$/),
    accountHolderName:  z.string().min(3),
    iban:               z.string().regex(/^MN\d{2}[A-Z0-9]{18}$/),
    accountType:        z.enum(['checking', 'savings']),
  })

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  await dbReady

  const existing = (await db.query('SELECT id FROM workers WHERE user_id = $1', [session.sub])).rows[0]
  if (existing) {
    return c.json({ success: false, error: 'Та ажилтнаар аль хэдийн бүртгүүлсэн байна' }, 409)
  }

  const { imei, policeFile, serviceTypeId, pricePerHour, bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data

  const client = await db.connect()
  let workerId: string
  try {
    await client.query('BEGIN')

    const workerResult = (await client.query(
      `INSERT INTO workers (user_id, service_type_id, price_per_hour, rating, review_count, imei, police_file, is_available, is_active)
       VALUES ($1, $2, $3, 0, 0, $4, $5, true, false)
       RETURNING id`,
      [session.sub, serviceTypeId, pricePerHour, imei, policeFile],
    )).rows[0] as { id: string }
    workerId = String(workerResult.id)

    await client.query(
      `INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [workerId, bankName, accountNumber, accountHolderName, iban, accountType],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return c.json({ success: true, data: { workerId } })
})

// GET/PATCH /api/workers/me — must come before /:id
router.get('/api/workers/me', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady
  const row = (await db.query(`
    SELECT w.id, w.user_id, u.name, COALESCE(st.name_mn, '') AS specialty,
           w.service_type_id, w.price_per_hour,
           w.rating_sum, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    LEFT JOIN service_types st ON st.id = w.service_type_id
    WHERE  w.user_id = $1
  `, [session.sub])).rows[0] as WorkerRow | undefined

  if (!row) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  return c.json({ success: true, data: toWorker(row) })
})

const workerMePatchSchema = z.object({
  serviceTypeId: z.number().int().positive().optional(),
  pricePerHour:  z.number().int().min(1000).max(500000).optional(),
}).refine(
  (d) => d.serviceTypeId !== undefined || d.pricePerHour !== undefined,
  { message: 'Хамгийн багадаа нэг талбар шаардлагатай' },
)

router.patch('/api/workers/me', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = workerMePatchSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  const sets: string[] = []
  const vals: unknown[] = []
  let idx = 1
  if (parsed.data.serviceTypeId !== undefined) { sets.push(`service_type_id = $${idx++}`); vals.push(parsed.data.serviceTypeId) }
  if (parsed.data.pricePerHour  !== undefined) { sets.push(`price_per_hour = $${idx++}`);  vals.push(parsed.data.pricePerHour) }
  vals.push(workerRow.id)

  await db.query(`UPDATE workers SET ${sets.join(', ')} WHERE id = $${idx}`, vals)

  return c.json({ success: true, data: undefined })
})

// PATCH /api/workers/me/availability
router.patch('/api/workers/me/availability', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = z.object({ isAvailable: z.boolean() }).safeParse(body)
  if (!parsed.success) return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)

  await dbReady

  const workerRow2 = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow2) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  if (parsed.data.isAvailable) {
    const { cnt } = (await db.query(
      'SELECT COUNT(*) AS cnt FROM worker_services WHERE worker_id = $1',
      [workerRow2.id],
    )).rows[0] as { cnt: string }

    if (Number(cnt) === 0) {
      return c.json({ success: false, error: 'Та эхлээд үйлчилгээгээ сонгоно уу.' }, 400)
    }
  }

  await db.query(
    'UPDATE workers SET is_available = $1 WHERE id = $2',
    [parsed.data.isAvailable, workerRow2.id],
  )

  return c.json({ success: true, data: undefined })
})

// GET /api/workers/me/banking
router.get('/api/workers/me/banking', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady
  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: true, data: null })

  const row = (await db.query('SELECT * FROM banking_info WHERE worker_id = $1', [workerRow.id]))
    .rows[0] as BankingRow | undefined

  return c.json({ success: true, data: row ? toBankingInfo(row) : null })
})

const upsertBankingSchema = z.object({
  bankName:          z.string().min(1),
  accountNumber:     z.string().regex(/^\d{10,20}$/),
  accountHolderName: z.string().min(3),
  iban:              z.string().regex(/^MN\d{2}[A-Z0-9]{18}$/),
  accountType:       z.enum(['checking', 'savings']),
})

// PUT /api/workers/me/banking
router.put('/api/workers/me/banking', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady
  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = upsertBankingSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const { bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data

  await db.query(`
    INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
    VALUES ($1, $2, $3, $4, $5, $6, false)
    ON CONFLICT (worker_id) DO UPDATE
      SET bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          account_holder_name = EXCLUDED.account_holder_name,
          iban = EXCLUDED.iban,
          account_type = EXCLUDED.account_type,
          verified = false,
          updated_at = NOW()
  `, [workerRow.id, bankName, accountNumber, accountHolderName, iban, accountType])

  const updated = (await db.query('SELECT * FROM banking_info WHERE worker_id = $1', [workerRow.id]))
    .rows[0] as BankingRow
  return c.json({ success: true, data: toBankingInfo(updated) })
})

// GET /api/workers/me/earnings
router.get('/api/workers/me/earnings', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  const wid = workerRow.id

  type EarningsRow = { total: string }
  type TxRow = { id: string; worker_id: string; amount: number; type: string; service: string | null; created_at: string }

  const [totalRow, monthRow, pendingRow, txRows] = await Promise.all([
    db.query<EarningsRow>(
      `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
       FROM orders WHERE worker_id = $1 AND status IN ('completed', 'rated')`,
      [wid],
    ),
    db.query<EarningsRow>(
      `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
       FROM orders WHERE worker_id = $1 AND status IN ('completed', 'rated')
         AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())`,
      [wid],
    ),
    db.query<EarningsRow>(
      `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
       FROM orders WHERE worker_id = $1 AND status IN ('completed', 'rated') AND payment_status = 'paid'
         AND NOT EXISTS (
           SELECT 1 FROM disputes WHERE order_id = orders.id AND status != 'resolved_release'
         )`,
      [wid],
    ),
    db.query<TxRow>(
      `SELECT t.id, t.worker_id, t.amount, t.type, COALESCE(st.name_mn, '') AS service, t.created_at
       FROM transactions t
       LEFT JOIN service_types st ON st.id = t.service_type_id
       WHERE t.worker_id = $1 ORDER BY t.created_at DESC LIMIT 50`,
      [wid],
    ),
  ])

  const transactions: Transaction[] = txRows.rows.map((r: TxRow) => ({
    id:        String(r.id),
    workerId:  String(r.worker_id),
    amount:    r.amount,
    type:      r.type as TransactionType,
    service:   r.service ?? '',
    createdAt: r.created_at,
  }))

  return c.json({
    success: true,
    data: {
      totalEarned:     Number(totalRow.rows[0]?.total  ?? 0),
      thisMonthEarned: Number(monthRow.rows[0]?.total  ?? 0),
      pendingPayout:   Number(pendingRow.rows[0]?.total ?? 0),
      transactions,
    },
  })
})

// GET /api/workers/me/services
router.get('/api/workers/me/services', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady
  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  const rows = (await db.query(
    'SELECT service_type_id FROM worker_services WHERE worker_id = $1 ORDER BY service_type_id',
    [workerRow.id],
  )).rows as { service_type_id: number }[]

  return c.json({ success: true, data: { serviceTypeIds: rows.map((r) => r.service_type_id) } })
})

const workerServicesSchema = z.object({
  serviceTypeIds: z.array(z.number().int().positive()),
})

// PUT /api/workers/me/services — replace-set: delete missing, insert new, in one transaction
router.put('/api/workers/me/services', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = workerServicesSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady
  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  const uniqueIds = [...new Set(parsed.data.serviceTypeIds)]
  const client = await db.connect()
  try {
    await client.query('BEGIN')

    if (uniqueIds.length > 0) {
      const validRows = (await client.query(
        'SELECT id FROM service_types WHERE id = ANY($1::int[])',
        [uniqueIds],
      )).rows as { id: number }[]

      if (validRows.length !== uniqueIds.length) {
        await client.query('ROLLBACK')
        return c.json({ success: false, error: 'Буруу үйлчилгээний төрөл' }, 400)
      }
    }

    await client.query('DELETE FROM worker_services WHERE worker_id = $1', [workerRow.id])

    if (uniqueIds.length > 0) {
      const placeholders = uniqueIds.map((_, i) => `($1, $${i + 2})`).join(', ')
      await client.query(
        `INSERT INTO worker_services (worker_id, service_type_id) VALUES ${placeholders}`,
        [workerRow.id, ...uniqueIds],
      )
    }

    await client.query('COMMIT')
  } catch {
    await client.query('ROLLBACK')
    return c.json({ error: 'Request failed' }, 500)
  } finally {
    client.release()
  }

  return c.json({ success: true, data: { serviceTypeIds: uniqueIds } })
})

// GET /api/workers/me/schedule?from=<ISO>&to=<ISO>
// Returns this worker's worker_schedule entries that overlap the requested range.
router.get('/api/workers/me/schedule', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  await dbReady
  const workerRow = (await db.query<{ id: number }>(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0]
  if (!workerRow) return c.json({ success: true, data: [] })

  const fromStr = c.req.query('from')
  const toStr   = c.req.query('to')

  const now   = new Date()
  const from  = fromStr ? new Date(fromStr) : (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d })()
  const to    = toStr   ? new Date(toStr)   : (() => { const d = new Date(from); d.setDate(d.getDate() + 7); return d })()

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return c.json({ success: false, error: 'Буруу огноо' }, 400)
  }

  type ScheduleRow = {
    id: number; order_id: number; worker_id: number; status: string
    range_start: string; range_end: string; hours: number
    service_name: string; address: string
  }

  const rows = (await db.query<ScheduleRow>(`
    SELECT
      ws.id,
      ws.order_id,
      ws.worker_id,
      ws.status,
      lower(ws.time_range) AS range_start,
      upper(ws.time_range) AS range_end,
      o.hours,
      COALESCE(st.name_mn, 'Үйлчилгээ') AS service_name,
      o.address
    FROM  worker_schedule ws
    JOIN  orders       o  ON o.id  = ws.order_id
    LEFT JOIN service_types st ON st.id = o.service_type_id
    WHERE ws.worker_id = $1
      AND ws.time_range && tstzrange($2::timestamptz, $3::timestamptz)
    ORDER BY lower(ws.time_range) ASC
  `, [workerRow.id, from.toISOString(), to.toISOString()])).rows

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id:          r.id,
      orderId:     r.order_id,
      workerId:    r.worker_id,
      status:      r.status,
      rangeStart:  r.range_start,
      rangeEnd:    r.range_end,
      jobHours:    r.hours,
      serviceName: r.service_name,
      address:     r.address,
    })),
  })
})

// GET /api/workers/:id
router.get('/api/workers/:id', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const id = c.req.param('id')

  await dbReady
  const row = (await db.query(`
    SELECT w.id, w.user_id, u.name, COALESCE(st.name_mn, '') AS specialty,
           w.service_type_id, w.price_per_hour,
           w.rating_sum, w.review_count, w.is_available, w.is_active,
           u.dan_verified, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    LEFT JOIN service_types st ON st.id = w.service_type_id
    WHERE  w.id = $1
  `, [id])).rows[0] as WorkerRow | undefined

  if (!row) return c.json({ success: false, error: 'Ажилтан олдсонгүй' }, 404)

  return c.json({ success: true, data: toWorker(row) })
})

export default router
