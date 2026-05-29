import { Router } from 'express'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAdmin, hashPassword } from '../auth'

const router = Router()

// GET /api/admin/stats
router.get('/admin/stats', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    await dbReady
    const [todayRow, revenueRow, workersRow, disputesRow, recentRows] = await Promise.all([
      db.query(`SELECT COUNT(*) as count FROM orders WHERE created_at::date = CURRENT_DATE`),
      db.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'completed'`),
      db.query(`SELECT COUNT(*) as count FROM workers WHERE is_active = true AND rejected_at IS NULL`),
      db.query(`SELECT COUNT(*) as count FROM disputes WHERE status = 'open'`),
      db.query(`
        SELECT o.id, u1.name as customer_name, u2.name as worker_name,
               o.service, o.status, o.total_amount
        FROM   orders o JOIN users u1 ON u1.id = o.user_id
        LEFT JOIN workers w  ON w.id  = o.worker_id AND w.rejected_at IS NULL
        LEFT JOIN users   u2 ON u2.id = w.user_id
        ORDER  BY o.created_at DESC LIMIT 5
      `),
    ])

    res.json({ success: true, data: {
      todayOrders:   Number(todayRow.rows[0].count),
      totalRevenue:  Number(revenueRow.rows[0].total),
      activeWorkers: Number(workersRow.rows[0].count),
      openDisputes:  Number(disputesRow.rows[0].count),
      recentOrders:  recentRows.rows.map((r) => ({
        id: String(r.id), customerName: r.customer_name, workerName: r.worker_name ?? '—',
        service: r.service, status: r.status, totalAmount: r.total_amount,
      })),
    } })
  } catch (err) {
    console.error('[admin/stats GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/workers/pending
router.get('/admin/workers/pending', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    await dbReady
    const rows = (await db.query(`
      SELECT w.id, u.name, u.phone, w.imei, w.police_file, w.created_at
      FROM   workers w JOIN users u ON u.id = w.user_id
      WHERE  w.is_active = false AND w.rejected_at IS NULL
      ORDER  BY w.created_at ASC
    `)).rows

    res.json({ success: true, data: rows.map((r) => ({
      id: String(r.id), name: r.name, phone: r.phone,
      imei: r.imei, policeFile: r.police_file, createdAt: r.created_at,
    })) })
  } catch (err) {
    console.error('[admin/workers/pending GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/workers/:id/verify
router.patch('/admin/workers/:id/verify', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    const parsed = z.object({ action: z.enum(['approve', 'reject']), reason: z.string().optional() }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Буруу өгөгдөл' }); return }

    const { id } = req.params
    await dbReady

    const worker = (await db.query('SELECT id FROM workers WHERE id = $1', [id])).rows[0]
    if (!worker) { res.status(404).json({ success: false, error: 'Ажилтан олдсонгүй' }); return }

    if (parsed.data.action === 'approve') {
      await db.query('UPDATE workers SET is_active = true, rejected_at = NULL WHERE id = $1', [id])
      await db.query('UPDATE users SET is_worker = true WHERE id = (SELECT user_id FROM workers WHERE id = $1)', [id])
    } else {
      await db.query('UPDATE workers SET rejected_at = NOW() WHERE id = $1', [id])
      await db.query('UPDATE users SET is_worker = false WHERE id = (SELECT user_id FROM workers WHERE id = $1)', [id])
    }
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[admin/workers/:id/verify PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/workers
router.get('/admin/workers', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const q         = String(req.query.q ?? '')
    const status    = String(req.query.status ?? 'all')
    const specialty = String(req.query.specialty ?? '')
    const page      = Math.max(1, Number(req.query.page ?? 1))
    const limit     = 20
    const offset    = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[]    = []
    let   idx = 1

    if (status === 'pending')   conditions.push(`w.is_active = false AND w.rejected_at IS NULL`)
    if (status === 'active')    conditions.push(`w.is_active = true  AND w.rejected_at IS NULL`)
    if (status === 'suspended') conditions.push(`w.rejected_at IS NOT NULL`)
    if (q) {
      conditions.push(`(u.name ILIKE $${idx} OR u.phone ILIKE $${idx + 1})`)
      params.push(`%${q}%`, `%${q}%`)
      idx += 2
    }
    if (specialty) {
      conditions.push(`w.specialty ILIKE $${idx}`)
      params.push(`%${specialty}%`)
      idx += 1
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    await dbReady
    const [rowsResult, countResult] = await Promise.all([
      db.query(`
        SELECT w.id, u.name, u.phone, w.specialty, w.price_per_hour,
               w.rating, w.review_count, w.is_active, w.is_available,
               w.rejected_at, w.created_at,
               bi.verified as banking_verified, u.dan_verified, w.police_file
        FROM   workers w JOIN users u ON u.id = w.user_id
        LEFT JOIN banking_info bi ON bi.worker_id = w.id
        ${where}
        ORDER BY w.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params),
      db.query(`SELECT COUNT(*) as total FROM workers w JOIN users u ON u.id = w.user_id ${where}`, params),
    ])

    res.json({
      success: true, data: rowsResult.rows,
      total: Number(countResult.rows[0].total), page,
      pages: Math.ceil(Number(countResult.rows[0].total) / limit),
    })
  } catch (err) {
    console.error('[admin/workers GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/workers/:id
router.get('/admin/workers/:id', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    await dbReady
    const worker = (await db.query(`
      SELECT w.id, u.id as user_id, u.name, u.phone, u.email, u.dan_verified,
             w.specialty, w.price_per_hour, w.rating, w.review_count,
             w.is_active, w.is_available, w.rejected_at, w.imei, w.police_file, w.created_at,
             bi.bank_name, bi.account_number, bi.account_holder_name, bi.iban,
             bi.account_type, bi.verified as banking_verified
      FROM   workers w JOIN users u ON u.id = w.user_id
      LEFT JOIN banking_info bi ON bi.worker_id = w.id
      WHERE  w.id = $1
    `, [req.params.id])).rows[0]

    if (!worker) { res.status(404).json({ success: false, error: 'Олдсонгүй' }); return }

    const orders = (await db.query(`
      SELECT o.id, o.service, o.status, o.total_amount, o.created_at, u.name as customer_name
      FROM   orders o JOIN users u ON u.id = o.user_id
      WHERE  o.worker_id = $1 ORDER BY o.created_at DESC LIMIT 20
    `, [req.params.id])).rows

    res.json({ success: true, data: { ...worker, orders } })
  } catch (err) {
    console.error('[admin/workers/:id GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/workers/:id
router.patch('/admin/workers/:id', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const PatchSchema = z.object({
      is_active:      z.boolean().optional(),
      is_available:   z.boolean().optional(),
      specialty:      z.string().min(1).optional(),
      price_per_hour: z.number().int().min(1000).max(500000).optional(),
      rejected_at:    z.string().nullable().optional(),
    })
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.issues[0]?.message }); return }

    await dbReady
    const d = parsed.data
    const sets: string[] = []
    const vals: unknown[] = []
    let i = 1

    if (d.is_active     !== undefined) { sets.push(`is_active = $${i++}`)     ; vals.push(d.is_active) }
    if (d.is_available  !== undefined) { sets.push(`is_available = $${i++}`)  ; vals.push(d.is_available) }
    if (d.specialty     !== undefined) { sets.push(`specialty = $${i++}`)     ; vals.push(d.specialty) }
    if (d.price_per_hour !== undefined) { sets.push(`price_per_hour = $${i++}`); vals.push(d.price_per_hour) }
    if ('rejected_at' in d) { sets.push(`rejected_at = $${i++}`); vals.push(d.rejected_at ?? null) }

    if (sets.length === 0) { res.json({ success: true, data: null }); return }
    vals.push(req.params.id)
    await db.query(`UPDATE workers SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('[admin/workers/:id PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/disputes
router.get('/admin/disputes', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    await dbReady
    const rows = (await db.query(`
      SELECT d.id, d.order_id, d.issue, d.status, d.compensation_amount, d.created_at,
             u1.name as customer_name, u2.name as worker_name, o.service, o.total_amount
      FROM   disputes d JOIN orders o ON o.id = d.order_id JOIN users u1 ON u1.id = o.user_id
      LEFT JOIN workers w ON w.id = o.worker_id AND w.rejected_at IS NULL
      LEFT JOIN users u2 ON u2.id = w.user_id
      ORDER BY d.created_at DESC
    `)).rows

    res.json({ success: true, data: rows.map((r) => ({
      id: String(r.id), orderId: String(r.order_id), customerName: r.customer_name,
      workerName: r.worker_name ?? '—', service: r.service, issue: r.issue,
      status: r.status, totalAmount: r.total_amount, compensationAmount: r.compensation_amount,
      createdAt: r.created_at,
    })) })
  } catch (err) {
    console.error('[admin/disputes GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/disputes/:id/resolve
router.patch('/admin/disputes/:id/resolve', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    const parsed = z.object({ compensationAmount: z.number().int().min(0).optional() }).safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: 'Буруу өгөгдөл' }); return }

    await dbReady
    const result = await db.query(`
      UPDATE disputes SET status = 'resolved', compensation_amount = $1, updated_at = NOW()
      WHERE id = $2 AND status = 'open'
    `, [parsed.data.compensationAmount ?? null, req.params.id])

    if (!result.rowCount) {
      res.status(404).json({ success: false, error: 'Гомдол олдсонгүй эсвэл аль хэдийн шийдэгдсэн' }); return
    }
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[admin/disputes/:id/resolve PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/orders
router.get('/admin/orders', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const q       = String(req.query.q ?? '')
    const status  = String(req.query.status ?? '')
    const service = String(req.query.service ?? '')
    const from    = String(req.query.from ?? '')
    const to      = String(req.query.to ?? '')
    const page    = Math.max(1, Number(req.query.page ?? 1))
    const limit   = 20
    const offset  = (page - 1) * limit

    const conditions: string[] = []
    const params: unknown[]    = []
    let   idx = 1

    if (status)  { conditions.push(`o.status = $${idx++}`)        ; params.push(status) }
    if (service) { conditions.push(`o.service ILIKE $${idx++}`)   ; params.push(`%${service}%`) }
    if (from)    { conditions.push(`o.created_at >= $${idx++}`)   ; params.push(from) }
    if (to)      { conditions.push(`o.created_at <= $${idx++}`)   ; params.push(to + 'T23:59:59Z') }
    if (q) {
      conditions.push(`(u1.name ILIKE $${idx} OR u2.name ILIKE $${idx + 1} OR o.address ILIKE $${idx + 2})`)
      params.push(`%${q}%`, `%${q}%`, `%${q}%`)
      idx += 3
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    await dbReady
    const [rowsResult, countResult] = await Promise.all([
      db.query(`
        SELECT o.id, o.service, o.status, o.address, o.total_amount,
               o.payment_status, o.scheduled_date, o.created_at,
               o.matching_strategy, o.urgent,
               u1.name as customer_name, u2.name as worker_name
        FROM   orders o JOIN users u1 ON u1.id = o.user_id
        LEFT JOIN workers w  ON w.id  = o.worker_id
        LEFT JOIN users   u2 ON u2.id = w.user_id
        ${where}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params),
      db.query(
        `SELECT COUNT(*) as total FROM orders o JOIN users u1 ON u1.id = o.user_id
         LEFT JOIN workers w ON w.id = o.worker_id
         LEFT JOIN users u2 ON u2.id = w.user_id ${where}`, params
      ),
    ])

    res.json({
      success: true, data: rowsResult.rows,
      total: Number(countResult.rows[0].total), page,
      pages: Math.ceil(Number(countResult.rows[0].total) / limit),
    })
  } catch (err) {
    console.error('[admin/orders GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/orders/:id
router.get('/admin/orders/:id', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    await dbReady
    const order = (await db.query(`
      SELECT o.*, u1.name as customer_name, u1.phone as customer_phone,
             u2.name as worker_name, w.specialty as worker_specialty, w.price_per_hour
      FROM   orders o JOIN users u1 ON u1.id = o.user_id
      LEFT JOIN workers w  ON w.id  = o.worker_id
      LEFT JOIN users   u2 ON u2.id = w.user_id
      WHERE  o.id = $1
    `, [req.params.id])).rows[0]

    if (!order) { res.status(404).json({ success: false, error: 'Олдсонгүй' }); return }

    const [messages, transactions] = await Promise.all([
      db.query(`
        SELECT m.text, m.created_at, u.name as sender_name
        FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.order_id = $1 ORDER BY m.created_at
      `, [req.params.id]),
      db.query(`
        SELECT t.amount, t.type, t.created_at
        FROM transactions t WHERE t.worker_id = (SELECT worker_id FROM orders WHERE id = $1)
        ORDER BY t.created_at DESC LIMIT 20
      `, [req.params.id]),
    ])

    res.json({ success: true, data: { ...order, messages: messages.rows, transactions: transactions.rows } })
  } catch (err) {
    console.error('[admin/orders/:id GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/orders/:id
router.patch('/admin/orders/:id', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    await dbReady
    await db.query(
      `UPDATE orders SET status = 'cancelled_by_admin', updated_at = NOW() WHERE id = $1`,
      [req.params.id],
    )
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('[admin/orders/:id PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/users
router.get('/admin/users', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const q      = String(req.query.q ?? '')
    const role   = String(req.query.role ?? '')
    const page   = Math.max(1, Number(req.query.page ?? 1))
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
    if (role) { conditions.push(`u.role = $${idx++}`); params.push(role) }

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
        FROM users u ${where}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params),
      db.query(`SELECT COUNT(*) as total FROM users u ${where}`, params),
    ])

    res.json({
      success: true, data: rowsResult.rows,
      total: Number(countResult.rows[0].total), page,
      pages: Math.ceil(Number(countResult.rows[0].total) / limit),
    })
  } catch (err) {
    console.error('[admin/users GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/users/:id
router.get('/admin/users/:id', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    await dbReady
    const user = (await db.query(`
      SELECT u.id, u.name, u.phone, u.email, u.role, u.is_worker, u.active_mode,
             u.dan_verified, u.avatar_url, u.deleted_at, u.created_at, u.better_auth_id,
             (SELECT a."providerId" FROM account a JOIN "user" bu ON bu.id = a."userId"
              WHERE bu.id = u.better_auth_id LIMIT 1) as auth_method
      FROM users u WHERE u.id = $1
    `, [req.params.id])).rows[0]

    if (!user) { res.status(404).json({ success: false, error: 'Олдсонгүй' }); return }

    const orders = (await db.query(
      `SELECT o.id, o.service, o.status, o.total_amount, o.created_at
       FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 20`,
      [req.params.id],
    )).rows

    res.json({ success: true, data: { ...user, orders } })
  } catch (err) {
    console.error('[admin/users/:id GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/users/:id
router.patch('/admin/users/:id', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const PatchSchema = z.object({
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
    const parsed = PatchSchema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ success: false, error: parsed.error.issues[0]?.message }); return }

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

    if (sets.length === 0) { res.json({ success: true, data: null }); return }
    vals.push(req.params.id)
    await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('[admin/users/:id PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// POST /api/admin/users/:id/password
router.post('/admin/users/:id/password', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const parsed = z.object({ password: z.string().min(8) }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Нууц үг 8-аас дээш тэмдэгт байх ёстой' }); return
    }

    await dbReady
    const user = (await db.query(
      `SELECT better_auth_id FROM users WHERE id = $1`, [req.params.id]
    )).rows[0] as { better_auth_id: string | null } | undefined

    if (!user?.better_auth_id) {
      res.status(404).json({ success: false, error: 'Энэ хэрэглэгч нэвтрэх данс байхгүй' }); return
    }

    const hash = hashPassword(parsed.data.password)
    await db.query(
      `UPDATE account SET password = $1, "updatedAt" = NOW()
       WHERE "userId" = $2 AND "providerId" = 'credential'`,
      [hash, user.better_auth_id],
    )
    res.json({ success: true, data: null })
  } catch (err) {
    console.error('[admin/users/:id/password POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/banking
router.get('/admin/banking', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    await dbReady
    const rows = (await db.query(`
      SELECT b.id, b.worker_id, u.name, u.phone,
             b.bank_name, b.account_number, b.account_holder_name,
             b.iban, b.account_type, b.updated_at
      FROM   banking_info b
      JOIN   workers w ON w.id = b.worker_id AND w.rejected_at IS NULL
      JOIN   users   u ON u.id = w.user_id
      WHERE  b.verified = false ORDER BY b.updated_at ASC
    `)).rows

    res.json({ success: true, data: rows.map((r) => ({
      id: String(r.id), workerId: String(r.worker_id), workerName: r.name, phone: r.phone,
      bankName: r.bank_name, accountNumber: r.account_number, accountHolderName: r.account_holder_name,
      iban: r.iban, accountType: r.account_type, submittedAt: r.updated_at,
    })) })
  } catch (err) {
    console.error('[admin/banking GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/banking/:worker_id/verify
router.patch('/admin/banking/:worker_id/verify', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }); return }

    const parsed = z.object({ action: z.enum(['approve', 'reject']) }).safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'action нь "approve" эсвэл "reject" байх ёстой' }); return
    }

    const { worker_id } = req.params
    await dbReady

    const row = (await db.query('SELECT id FROM banking_info WHERE worker_id = $1', [worker_id])).rows[0]
    if (!row) { res.status(404).json({ success: false, error: 'Банкны мэдээлэл олдсонгүй' }); return }

    if (parsed.data.action === 'approve') {
      await db.query('UPDATE banking_info SET verified = true, updated_at = NOW() WHERE worker_id = $1', [worker_id])
    } else {
      await db.query('DELETE FROM banking_info WHERE worker_id = $1', [worker_id])
    }
    res.json({ success: true, data: undefined })
  } catch (err) {
    console.error('[admin/banking/:worker_id/verify PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/finance
router.get('/admin/finance', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    await dbReady
    const [totalRev, monthRev, payouts, txRows] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders WHERE status IN ('completed','rated')`),
      db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM orders
                WHERE status IN ('completed','rated') AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),
      db.query(`
        SELECT u.name, w.id as worker_id,
               COALESCE(SUM(CASE WHEN t.type='earning' THEN t.amount ELSE 0 END),0) as total_earned,
               COALESCE(SUM(CASE WHEN t.type='withdrawal' THEN t.amount ELSE 0 END),0) as total_withdrawn
        FROM workers w JOIN users u ON u.id = w.user_id
        LEFT JOIN transactions t ON t.worker_id = w.id
        WHERE w.is_active = true AND w.rejected_at IS NULL
        GROUP BY u.name, w.id ORDER BY total_earned DESC
      `),
      db.query(`
        SELECT t.id, t.amount, t.type, t.service, t.created_at, u.name as worker_name
        FROM transactions t
        LEFT JOIN workers w ON w.id = t.worker_id
        LEFT JOIN users   u ON u.id = w.user_id
        ORDER BY t.created_at DESC LIMIT 50
      `),
    ])

    const totalRevenue = Number(totalRev.rows[0].total)
    const monthRevenue = Number(monthRev.rows[0].total)

    res.json({ success: true, data: {
      totalRevenue, monthRevenue,
      totalCommission: Math.round(totalRevenue * 0.15),
      totalDamageFund: Math.round(totalRevenue * 0.02),
      payouts: payouts.rows.map((r) => ({
        ...r,
        total_earned:    Number(r.total_earned),
        total_withdrawn: Number(r.total_withdrawn),
        pending:         Number(r.total_earned) - Number(r.total_withdrawn),
      })),
      transactions: txRows.rows,
    } })
  } catch (err) {
    console.error('[admin/finance GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// GET /api/admin/master-data
router.get('/admin/master-data', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    await dbReady
    const [serviceTypes, districts, pricingRules, settings] = await Promise.all([
      db.query(`SELECT st.*, pr.base_rate, pr.peak_multiplier, pr.holiday_multiplier
                FROM service_types st LEFT JOIN pricing_rules pr ON pr.service_type_id = st.id
                ORDER BY st.sort_order`),
      db.query(`SELECT * FROM districts ORDER BY name_mn`),
      db.query(`SELECT pr.*, st.name_mn FROM pricing_rules pr JOIN service_types st ON st.id = pr.service_type_id`),
      db.query(`SELECT * FROM app_settings ORDER BY key`),
    ])

    res.json({ success: true, data: {
      serviceTypes:  serviceTypes.rows,
      districts:     districts.rows,
      pricingRules:  pricingRules.rows,
      settings:      Object.fromEntries(settings.rows.map((r) => [r.key, r.value])),
    } })
  } catch (err) {
    console.error('[admin/master-data GET]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

const ALLOWED_MASTER_TYPES = ['service_types', 'districts', 'pricing_rules', 'app_settings'] as const
type AllowedMasterType = typeof ALLOWED_MASTER_TYPES[number]
function isAllowed(t: string): t is AllowedMasterType {
  return (ALLOWED_MASTER_TYPES as readonly string[]).includes(t)
}

// POST /api/admin/master-data/:type
router.post('/admin/master-data/:type', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const { type } = req.params
    if (!isAllowed(type)) { res.status(400).json({ success: false, error: 'Буруу төрөл' }); return }

    await dbReady

    if (type === 'service_types') {
      const s = z.object({ name_mn: z.string().min(1), icon: z.string().min(1), sort_order: z.number().int().optional() }).safeParse(req.body)
      if (!s.success) { res.status(400).json({ success: false, error: s.error.issues[0]?.message }); return }
      const row = (await db.query(
        `INSERT INTO service_types (name_mn, icon, sort_order) VALUES ($1, $2, $3) RETURNING *`,
        [s.data.name_mn, s.data.icon, s.data.sort_order ?? 0],
      )).rows[0]
      await db.query(`INSERT INTO pricing_rules (service_type_id) VALUES ($1)`, [row.id])
      res.json({ success: true, data: row }); return
    }

    if (type === 'districts') {
      const s = z.object({ name_mn: z.string().min(1) }).safeParse(req.body)
      if (!s.success) { res.status(400).json({ success: false, error: s.error.issues[0]?.message }); return }
      const row = (await db.query(`INSERT INTO districts (name_mn) VALUES ($1) RETURNING *`, [s.data.name_mn])).rows[0]
      res.json({ success: true, data: row }); return
    }

    res.status(400).json({ success: false, error: 'POST дэмжигдэхгүй' })
  } catch (err) {
    console.error('[admin/master-data/:type POST]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// PATCH /api/admin/master-data/:type
router.patch('/admin/master-data/:type', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const { type } = req.params
    if (!isAllowed(type)) { res.status(400).json({ success: false, error: 'Буруу төрөл' }); return }

    await dbReady

    if (type === 'service_types') {
      const s = z.object({ id: z.number(), name_mn: z.string().optional(), icon: z.string().optional(), is_active: z.boolean().optional(), sort_order: z.number().int().optional() }).safeParse(req.body)
      if (!s.success) { res.status(400).json({ success: false, error: s.error.issues[0]?.message }); return }
      const { id, ...rest } = s.data
      const sets: string[] = []; const vals: unknown[] = []; let i = 1
      if (rest.name_mn    !== undefined) { sets.push(`name_mn = $${i++}`)   ; vals.push(rest.name_mn) }
      if (rest.icon       !== undefined) { sets.push(`icon = $${i++}`)      ; vals.push(rest.icon) }
      if (rest.is_active  !== undefined) { sets.push(`is_active = $${i++}`) ; vals.push(rest.is_active) }
      if (rest.sort_order !== undefined) { sets.push(`sort_order = $${i++}`); vals.push(rest.sort_order) }
      if (!sets.length) { res.json({ success: true, data: null }); return }
      vals.push(id)
      await db.query(`UPDATE service_types SET ${sets.join(', ')} WHERE id = $${i}`, vals)
      res.json({ success: true, data: null }); return
    }

    if (type === 'districts') {
      const s = z.object({ id: z.number(), name_mn: z.string().optional(), is_active: z.boolean().optional() }).safeParse(req.body)
      if (!s.success) { res.status(400).json({ success: false, error: s.error.issues[0]?.message }); return }
      const { id, ...rest } = s.data
      const sets: string[] = []; const vals: unknown[] = []; let i = 1
      if (rest.name_mn   !== undefined) { sets.push(`name_mn = $${i++}`)   ; vals.push(rest.name_mn) }
      if (rest.is_active !== undefined) { sets.push(`is_active = $${i++}`) ; vals.push(rest.is_active) }
      if (!sets.length) { res.json({ success: true, data: null }); return }
      vals.push(id)
      await db.query(`UPDATE districts SET ${sets.join(', ')} WHERE id = $${i}`, vals)
      res.json({ success: true, data: null }); return
    }

    if (type === 'pricing_rules') {
      const s = z.object({ id: z.number(), base_rate: z.number().int().optional(), peak_multiplier: z.number().int().optional(), holiday_multiplier: z.number().int().optional() }).safeParse(req.body)
      if (!s.success) { res.status(400).json({ success: false, error: s.error.issues[0]?.message }); return }
      const { id, ...rest } = s.data
      const sets: string[] = []; const vals: unknown[] = []; let i = 1
      if (rest.base_rate          !== undefined) { sets.push(`base_rate = $${i++}`)          ; vals.push(rest.base_rate) }
      if (rest.peak_multiplier    !== undefined) { sets.push(`peak_multiplier = $${i++}`)    ; vals.push(rest.peak_multiplier) }
      if (rest.holiday_multiplier !== undefined) { sets.push(`holiday_multiplier = $${i++}`) ; vals.push(rest.holiday_multiplier) }
      if (!sets.length) { res.json({ success: true, data: null }); return }
      vals.push(id); sets.push(`updated_at = NOW()`)
      await db.query(`UPDATE pricing_rules SET ${sets.join(', ')} WHERE id = $${i}`, vals)
      res.json({ success: true, data: null }); return
    }

    if (type === 'app_settings') {
      const s = z.object({ key: z.string(), value: z.string() }).safeParse(req.body)
      if (!s.success) { res.status(400).json({ success: false, error: s.error.issues[0]?.message }); return }
      await db.query(
        `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [s.data.key, s.data.value],
      )
      res.json({ success: true, data: null }); return
    }

    res.status(400).json({ success: false, error: 'PATCH дэмжигдэхгүй' })
  } catch (err) {
    console.error('[admin/master-data/:type PATCH]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

// DELETE /api/admin/master-data/:type
router.delete('/admin/master-data/:type', async (req, res) => {
  try {
    const session = await requireAdmin(req)
    if (!session) { res.status(403).json({ success: false, error: 'Зөвхөн админ' }); return }

    const { type } = req.params
    const id = req.query.id as string
    if (!id) { res.status(400).json({ success: false, error: 'id шаардлагатай' }); return }

    await dbReady

    if (type === 'service_types') {
      await db.query(`UPDATE service_types SET is_active = false WHERE id = $1`, [id])
      res.json({ success: true, data: null }); return
    }
    if (type === 'districts') {
      await db.query(`UPDATE districts SET is_active = false WHERE id = $1`, [id])
      res.json({ success: true, data: null }); return
    }

    res.status(400).json({ success: false, error: 'DELETE дэмжигдэхгүй' })
  } catch (err) {
    console.error('[admin/master-data/:type DELETE]', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
