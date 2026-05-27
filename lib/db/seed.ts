import type { Pool, PoolClient } from 'pg'

const SEED_USERS = [
  { id: 1, phone: '99112233', name: 'Батболд Дорж',     role: 'worker', danVerified: true },
  { id: 2, phone: '99224455', name: 'Ганзориг Бат',      role: 'worker', danVerified: true },
  { id: 3, phone: '99336677', name: 'Түвшинбаяр Оюун',  role: 'worker', danVerified: true },
  { id: 4, phone: '99448899', name: 'Эрдэнэбат Монгол', role: 'worker', danVerified: true },
  { id: 5, phone: '99550011', name: 'Делгэрмаа Хүрэл',  role: 'worker', danVerified: true },
  { id: 6, phone: '99661122', name: 'Нарангэрэл Сүх',   role: 'worker', danVerified: true },
  { id: 7, phone: '99772233', name: 'Болд Энхжаргал',   role: 'worker', danVerified: false },
  { id: 8, phone: '99883344', name: 'Очирбат Дамба',    role: 'worker', danVerified: true },
]

const SEED_WORKERS = [
  { id: 1, userId: 1, specialty: 'Цэвэрлэгээ',   price: 25000, rating: 4.9, reviews: 124, available: true,  active: true  },
  { id: 2, userId: 2, specialty: 'Сантехник',     price: 35000, rating: 4.8, reviews:  89, available: true,  active: true  },
  { id: 3, userId: 3, specialty: 'Цахилгаан',    price: 40000, rating: 4.9, reviews: 156, available: true,  active: true  },
  { id: 4, userId: 4, specialty: 'Жижиг засвар', price: 30000, rating: 4.7, reviews:  67, available: false, active: true  },
  { id: 5, userId: 5, specialty: 'Цэвэрлэгээ',   price: 22000, rating: 4.6, reviews:  43, available: true,  active: true  },
  { id: 6, userId: 6, specialty: 'Будаг',         price: 28000, rating: 4.5, reviews:  31, available: true,  active: true  },
  { id: 7, userId: 7, specialty: 'Агааржуулалт', price: 45000, rating: 4.3, reviews:  18, available: true,  active: false },
  { id: 8, userId: 8, specialty: 'Сантехник',     price: 32000, rating: 4.8, reviews:  55, available: true,  active: true  },
]

const SEED_BANKING = [
  { id: 1, workerId: 1, bankName: 'Хаан банк',   accountNumber: '5001122334', accountHolderName: 'Батболд Дорж',    iban: 'MN12KHAN0000005001122334', accountType: 'checking', verified: true },
  { id: 2, workerId: 2, bankName: 'Голомт банк', accountNumber: '4002233445', accountHolderName: 'Ганзориг Бат',    iban: 'MN12GOLO0000004002233445', accountType: 'checking', verified: true },
  { id: 3, workerId: 3, bankName: 'Голомт банк', accountNumber: '4003344556', accountHolderName: 'Түвшинбаяр Оюун', iban: 'MN12GOLO0000004003344556', accountType: 'checking', verified: true },
  { id: 4, workerId: 5, bankName: 'Хаан банк',   accountNumber: '5004455667', accountHolderName: 'Делгэрмаа Хүрэл', iban: 'MN12KHAN0000005004455667', accountType: 'checking', verified: true },
  { id: 5, workerId: 6, bankName: 'Хас банк',    accountNumber: '3005566778', accountHolderName: 'Нарангэрэл Сүх',  iban: 'MN12XAAS0000003005566778', accountType: 'checking', verified: true },
  { id: 6, workerId: 8, bankName: 'Хаан банк',   accountNumber: '5006677889', accountHolderName: 'Очирбат Дамба',   iban: 'MN12KHAN0000005006677889', accountType: 'checking', verified: true },
]

const TEST_USERS = [
  { id: 9,  phone: '99000001', name: 'Test User',  role: 'user',  danVerified: true },
  { id: 10, phone: '99000002', name: 'Test Admin', role: 'admin', danVerified: true },
]

// Admin account with phone+password login (phone: 95342321, password: 12345678)
const ADMIN_BA_ID    = 'ba-admin-95342321'
const ADMIN_EMAIL    = '95342321@homeservice.local'
const ADMIN_PW_HASH  = 'f01f236cdd7d2a3694ba5f14f71f6fb4:e1a77eed648115674e4a5fba36aa951d2d8c051b7ba6da5398c9402a497ab915ef3898b4b8bd180207a4fe5da60a4e24f07a815c0d9b93220fb757cee81d341b'

const SEED_ORDERS = [
  { id: 1, userId: 9, workerId: null, service: 'Цэвэрлэгээ', status: 'searching_worker',  address: 'Чингэлтэй дүүрэг, 5-р хороо, Наран гудамж 12',            scheduledDate: '2026-05-27 10:00:00', hours: 3, totalAmount:  75000, urgent: false, rooms: 2,    areaSqm: 60,   propertyType: 'apartment', notes: null },
  { id: 2, userId: 9, workerId: 1,    service: 'Цэвэрлэгээ', status: 'worker_assigned',   address: 'Баянзүрх дүүрэг, 14-р хороо, Их тойруу 8',                scheduledDate: '2026-05-25 14:00:00', hours: 2, totalAmount:  50000, urgent: false, rooms: 1,    areaSqm: 45,   propertyType: 'apartment', notes: 'Гал тогооны өрөөг онцгойлон анхаарна уу' },
  { id: 3, userId: 9, workerId: 5,    service: 'Цэвэрлэгээ', status: 'worker_on_the_way', address: 'Сүхбаатар дүүрэг, 1-р хороо, Энх тайваны өргөн чөлөө 15', scheduledDate: '2026-05-24 09:00:00', hours: 4, totalAmount: 110000, urgent: true,  rooms: 3,    areaSqm: 90,   propertyType: 'apartment', notes: null },
  { id: 4, userId: 9, workerId: 2,    service: 'Сантехник',  status: 'in_progress',       address: 'Хан-Уул дүүрэг, 3-р хороо, Зайсан 22',                   scheduledDate: '2026-05-24 11:00:00', hours: 2, totalAmount:  70000, urgent: false, rooms: null, areaSqm: null, propertyType: 'house',     notes: 'Угаалтуурын шугам дусалж байна' },
  { id: 5, userId: 9, workerId: 1,    service: 'Цэвэрлэгээ', status: 'completed',         address: 'Баянгол дүүрэг, 7-р хороо, Нарны зам 5',                  scheduledDate: '2026-05-20 10:00:00', hours: 3, totalAmount:  75000, urgent: false, rooms: 2,    areaSqm: 55,   propertyType: 'apartment', notes: null },
  { id: 6, userId: 9, workerId: 5,    service: 'Цэвэрлэгээ', status: 'rated',             address: 'Сонгинохайрхан дүүрэг, 19-р хороо, Цагаан давхар 3',      scheduledDate: '2026-05-15 13:00:00', hours: 2, totalAmount:  44000, urgent: false, rooms: 1,    areaSqm: 38,   propertyType: 'apartment', notes: null },
  { id: 7, userId: 9, workerId: null, service: 'Цэвэрлэгээ', status: 'cancelled_by_user', address: 'Чингэлтэй дүүрэг, 2-р хороо, Дэнж 7',                    scheduledDate: '2026-05-18 09:00:00', hours: 3, totalAmount:  75000, urgent: false, rooms: 2,    areaSqm: 60,   propertyType: 'apartment', notes: null },
  { id: 8, userId: 9, workerId: null, service: 'Цэвэрлэгээ', status: 'no_workers_found',  address: 'Налайх дүүрэг, 1-р хороо, Уурхайчин 11',                  scheduledDate: '2026-05-19 08:00:00', hours: 4, totalAmount: 100000, urgent: true,  rooms: 3,    areaSqm: 80,   propertyType: 'apartment', notes: null },
]

const SEED_REVIEWS = [
  { id: 1, orderId: 6, workerId: 5, rating: 5, comment: 'Маш сайн ажилласан! Цаг баримталсан, ажил чанартай.' },
]

async function withTransaction(client: PoolClient, fn: () => Promise<void>): Promise<void> {
  await client.query('BEGIN')
  try {
    await fn()
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  }
}

export async function seed(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    // Always ensure test accounts exist
    for (const u of TEST_USERS) {
      await client.query(
        `INSERT INTO users (id, phone, name, role, dan_verified)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [u.id, u.phone, u.name, u.role, u.danVerified],
      )
    }

    // Provision admin phone+password login via Better Auth tables
    // phone: 95342321 / password: 12345678
    await client.query(
      `INSERT INTO "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
       VALUES ($1, 'Admin', $2, true, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [ADMIN_BA_ID, ADMIN_EMAIL],
    )
    await client.query(
      `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
       VALUES ($1, $2, 'credential', $3, $4, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [`acct-admin-95342321`, ADMIN_EMAIL, ADMIN_BA_ID, ADMIN_PW_HASH],
    )
    await client.query(
      `INSERT INTO users (phone, name, role, dan_verified, better_auth_id, email)
       VALUES ('95342321', 'Admin', 'admin', true, $1, $2)
       ON CONFLICT DO NOTHING`,
      [ADMIN_BA_ID, ADMIN_EMAIL],
    )
    // Link better_auth_id in case the row already existed without it
    await client.query(
      `UPDATE users SET better_auth_id = $1 WHERE phone = '95342321' AND better_auth_id IS NULL`,
      [ADMIN_BA_ID],
    )

    const { rows: [{ n: workerCount }] } = await client.query('SELECT COUNT(*) as n FROM workers')
    if (Number(workerCount) === 0) {
      await withTransaction(client, async () => {
        for (const u of SEED_USERS) {
          await client.query(
            `INSERT INTO users (id, phone, name, role, dan_verified)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [u.id, u.phone, u.name, u.role, u.danVerified],
          )
        }
        for (const w of SEED_WORKERS) {
          await client.query(
            `INSERT INTO workers (id, user_id, specialty, price_per_hour, rating, review_count, is_available, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [w.id, w.userId, w.specialty, w.price, w.rating, w.reviews, w.available, w.active],
          )
        }
        // Reset sequences so next auto-generated IDs don't collide with seed IDs
        await client.query(`SELECT setval('workers_id_seq', (SELECT MAX(id) FROM workers))`)
        await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`)
      })
      console.log(`[seed] Inserted ${SEED_WORKERS.length} workers`)
    }

    const { rows: [{ n: bankingCount }] } = await client.query('SELECT COUNT(*) as n FROM banking_info')
    if (Number(bankingCount) === 0) {
      await withTransaction(client, async () => {
        for (const b of SEED_BANKING) {
          await client.query(
            `INSERT INTO banking_info (id, worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [b.id, b.workerId, b.bankName, b.accountNumber, b.accountHolderName, b.iban, b.accountType, b.verified],
          )
        }
        await client.query(`SELECT setval('banking_info_id_seq', (SELECT MAX(id) FROM banking_info))`)
      })
      console.log(`[seed] Inserted ${SEED_BANKING.length} banking records`)
    }

    const { rows: [{ n: orderCount }] } = await client.query('SELECT COUNT(*) as n FROM orders')
    if (Number(orderCount) === 0) {
      await withTransaction(client, async () => {
        for (const o of SEED_ORDERS) {
          await client.query(
            `INSERT INTO orders (id, user_id, worker_id, service, status, address, scheduled_date, hours, total_amount, urgent, rooms, area_sqm, property_type, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
             ON CONFLICT (id) DO NOTHING`,
            [o.id, o.userId, o.workerId, o.service, o.status, o.address, o.scheduledDate, o.hours, o.totalAmount, o.urgent, o.rooms, o.areaSqm, o.propertyType, o.notes],
          )
        }
        for (const r of SEED_REVIEWS) {
          await client.query(
            `INSERT INTO reviews (id, order_id, worker_id, rating, comment)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [r.id, r.orderId, r.workerId, r.rating, r.comment],
          )
        }
        await client.query(`SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders))`)
        await client.query(`SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews))`)
      })
      console.log(`[seed] Inserted ${SEED_ORDERS.length} orders`)
    }
  } finally {
    client.release()
  }
}
