import { Router } from 'express'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import type { Worker } from '@homeservices/shared'

const router = Router()

type WorkerRow = {
  id: string; user_id: string; name: string; specialty: string
  price_per_hour: number; rating: number; review_count: number
  is_available: boolean; is_active: boolean; dan_verified: boolean; created_at: string
}

function toWorker(row: WorkerRow): Worker {
  return {
    id:           String(row.id),
    userId:       String(row.user_id),
    name:         row.name,
    specialty:    row.specialty,
    pricePerHour: row.price_per_hour,
    rating:       row.rating,
    reviewCount:  row.review_count,
    isAvailable:  Boolean(row.is_available),
    isActive:     Boolean(row.is_active),
    danVerified:  Boolean(row.dan_verified),
    createdAt:    row.created_at,
  }
}

// GET /api/workers
router.get('/workers', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const q         = String(req.query.q         ?? '')
    const specialty = String(req.query.specialty  ?? '')
    const sort      = String(req.query.sort       ?? 'rating')
    const skipAvailabilityFilter = req.query.available === '0'

    const conditions: string[] = ['w.is_active = true', 'w.rejected_at IS NULL']
    const qParams: unknown[]   = []
    let pIdx = 1

    if (!skipAvailabilityFilter) conditions.push('w.is_available = true')
    if (q) {
      conditions.push(`(u.name ILIKE $${pIdx} OR w.specialty ILIKE $${pIdx + 1})`)
      qParams.push(`%${q}%`, `%${q}%`)
      pIdx += 2
    }
    if (specialty) {
      conditions.push(`w.specialty = $${pIdx}`)
      qParams.push(specialty)
      pIdx += 1
    }

    const orderBy =
      sort === 'price_asc'  ? 'w.price_per_hour ASC'  :
      sort === 'price_desc' ? 'w.price_per_hour DESC'  :
      'w.rating DESC, w.review_count DESC'

    await dbReady
    const rows = (await db.query(`
      SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
             w.rating, w.review_count, w.is_available, w.is_active,
             u.dan_verified, w.created_at
      FROM   workers w
      JOIN   users   u ON u.id = w.user_id
      WHERE  ${conditions.join(' AND ')}
      ORDER  BY ${orderBy}
      LIMIT  50
    `, qParams)).rows as WorkerRow[]

    res.json({ success: true, data: rows.map(toWorker) })
  } catch (err) {
    console.error('[workers GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/workers/:id
router.get('/workers/:id', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const row = (await db.query(`
      SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
             w.rating, w.review_count, w.is_available, w.is_active,
             u.dan_verified, w.created_at
      FROM   workers w
      JOIN   users   u ON u.id = w.user_id
      WHERE  w.id = $1
    `, [req.params.id])).rows[0] as WorkerRow | undefined

    if (!row) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }
    res.json({ success: true, data: toWorker(row) })
  } catch (err) {
    console.error('[workers/:id GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const SPECIALTIES = [
  'цэвэрлэгээ', 'угаалга', 'ерөнхий засвар',
  'сантехник', 'цахилгаан', 'будаг', 'цонх/хаалга',
] as const

const registerSchema = z.object({
  imei:               z.string().length(15),
  policeFile:         z.string().min(1),
  specialty:          z.enum(SPECIALTIES),
  pricePerHour:       z.number().int().min(1000).max(500000),
  bankName:           z.string().min(1),
  accountNumber:      z.string().regex(/^\d{10,20}$/),
  accountHolderName:  z.string().min(3),
  iban:               z.string().regex(/^MN\d{2}[A-Z0-9]{18}$/),
  accountType:        z.enum(['checking', 'savings']),
})

// POST /api/workers/register
router.post('/workers/register', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    await dbReady
    const existing = (await db.query('SELECT id FROM workers WHERE user_id = $1', [session.sub])).rows[0]
    if (existing) { res.status(409).json({ success: false, error: 'Та ажилтнаар аль хэдийн бүртгүүлсэн байна' }); return }

    const { imei, policeFile, specialty, pricePerHour, bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data
    const client = await db.connect()
    let workerId: string
    try {
      await client.query('BEGIN')
      const workerResult = (await client.query(
        `INSERT INTO workers (user_id, specialty, price_per_hour, rating, review_count, imei, police_file, is_available, is_active)
         VALUES ($1, $2, $3, 0, 0, $4, $5, true, false)
         RETURNING id`,
        [session.sub, specialty, pricePerHour, imei, policeFile],
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

    res.json({ success: true, data: { workerId } })
  } catch (err) {
    console.error('[workers/register POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const workerMePatchSchema = z.object({
  specialty:    z.enum(SPECIALTIES).optional(),
  pricePerHour: z.number().int().min(1000).max(500000).optional(),
}).refine(
  (d) => d.specialty !== undefined || d.pricePerHour !== undefined,
  { message: 'Хамгийн багадаа нэг талбар шаардлагатай' },
)

// GET /api/workers/me
router.get('/workers/me', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const row = (await db.query(`
      SELECT w.id, w.user_id, u.name, w.specialty, w.price_per_hour,
             w.rating, w.review_count, w.is_available, w.is_active,
             u.dan_verified, w.created_at
      FROM   workers w
      JOIN   users   u ON u.id = w.user_id
      WHERE  w.user_id = $1
    `, [session.sub])).rows[0] as WorkerRow | undefined

    if (!row) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }
    res.json({ success: true, data: toWorker(row) })
  } catch (err) {
    console.error('[workers/me GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/workers/me
router.patch('/workers/me', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = workerMePatchSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    await dbReady
    const workerRow = (await db.query('SELECT id FROM workers WHERE user_id = $1', [session.sub])).rows[0] as { id: string } | undefined
    if (!workerRow) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }

    const sets: string[] = []
    const vals: unknown[] = []
    let idx = 1
    if (parsed.data.specialty    !== undefined) { sets.push(`specialty = $${idx++}`);      vals.push(parsed.data.specialty) }
    if (parsed.data.pricePerHour !== undefined) { sets.push(`price_per_hour = $${idx++}`); vals.push(parsed.data.pricePerHour) }
    vals.push(workerRow.id)

    await db.query(`UPDATE workers SET ${sets.join(', ')} WHERE id = $${idx}`, vals)
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[workers/me PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/workers/me/availability
router.patch('/workers/me/availability', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const parsed = z.object({ isAvailable: z.boolean() }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Буруу өгөгдөл' }); return }

    await dbReady
    const result = await db.query(
      'UPDATE workers SET is_available = $1 WHERE user_id = $2',
      [parsed.data.isAvailable, session.sub],
    )
    if (!result.rowCount) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[workers/me/availability PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

type BankingRow = {
  id: string; worker_id: string; bank_name: string; account_number: string
  account_holder_name: string; iban: string; account_type: string
  verified: boolean; updated_at: string
}

const bankingUpsertSchema = z.object({
  bankName:          z.string().min(1),
  accountNumber:     z.string().regex(/^\d{10,20}$/),
  accountHolderName: z.string().min(3),
  iban:              z.string().regex(/^MN\d{2}[A-Z0-9]{18}$/),
  accountType:       z.enum(['checking', 'savings']),
})

// GET /api/workers/me/banking
router.get('/workers/me/banking', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const workerRow = (await db.query('SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL', [session.sub])).rows[0] as { id: string } | undefined
    if (!workerRow) { res.json({ success: true, data: null }); return }

    const row = (await db.query('SELECT * FROM banking_info WHERE worker_id = $1', [workerRow.id])).rows[0] as BankingRow | undefined
    res.json({ success: true, data: row ? {
      id: String(row.id), workerId: String(row.worker_id), bankName: row.bank_name,
      accountNumber: row.account_number, accountHolderName: row.account_holder_name,
      iban: row.iban, accountType: row.account_type, verified: Boolean(row.verified), updatedAt: row.updated_at,
    } : null })
  } catch (err) {
    console.error('[workers/me/banking GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PUT /api/workers/me/banking
router.put('/workers/me/banking', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const workerRow = (await db.query('SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL', [session.sub])).rows[0] as { id: string } | undefined
    if (!workerRow) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }

    const parsed = bankingUpsertSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    const { bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data
    await db.query(`
      INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      ON CONFLICT (worker_id) DO UPDATE
        SET bank_name = EXCLUDED.bank_name, account_number = EXCLUDED.account_number,
            account_holder_name = EXCLUDED.account_holder_name, iban = EXCLUDED.iban,
            account_type = EXCLUDED.account_type, verified = false, updated_at = NOW()
    `, [workerRow.id, bankName, accountNumber, accountHolderName, iban, accountType])

    const updated = (await db.query('SELECT * FROM banking_info WHERE worker_id = $1', [workerRow.id])).rows[0] as BankingRow
    res.json({ success: true, data: {
      id: String(updated.id), workerId: String(updated.worker_id), bankName: updated.bank_name,
      accountNumber: updated.account_number, accountHolderName: updated.account_holder_name,
      iban: updated.iban, accountType: updated.account_type, verified: Boolean(updated.verified), updatedAt: updated.updated_at,
    } })
  } catch (err) {
    console.error('[workers/me/banking PUT]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/workers/me/earnings
router.get('/workers/me/earnings', async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    await dbReady
    const workerRow = (await db.query('SELECT id FROM workers WHERE user_id = $1', [session.sub])).rows[0] as { id: string } | undefined
    if (!workerRow) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }

    const wid = workerRow.id
    const [totalRow, monthRow, pendingRow, txRows] = await Promise.all([
      db.query(
        `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
         FROM orders WHERE worker_id = $1 AND status IN ('completed', 'rated')`,
        [wid],
      ),
      db.query(
        `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
         FROM orders WHERE worker_id = $1 AND status IN ('completed', 'rated')
           AND DATE_TRUNC('month', updated_at) = DATE_TRUNC('month', NOW())`,
        [wid],
      ),
      db.query(
        `SELECT COALESCE(FLOOR(SUM(total_amount)::NUMERIC * 83 / 100), 0)::INTEGER AS total
         FROM orders WHERE worker_id = $1 AND status IN ('completed', 'rated') AND payment_status = 'paid'`,
        [wid],
      ),
      db.query(
        `SELECT id, worker_id, amount, type, service, created_at
         FROM transactions WHERE worker_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [wid],
      ),
    ])

    res.json({
      success: true,
      data: {
        totalEarned:     Number(totalRow.rows[0]?.total   ?? 0),
        thisMonthEarned: Number(monthRow.rows[0]?.total   ?? 0),
        pendingPayout:   Number(pendingRow.rows[0]?.total ?? 0),
        transactions: txRows.rows.map((r) => ({
          id: String(r.id), workerId: String(r.worker_id), amount: r.amount,
          type: r.type, service: r.service, createdAt: r.created_at,
        })),
      },
    })
  } catch (err) {
    console.error('[workers/me/earnings GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
