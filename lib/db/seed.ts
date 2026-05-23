import type Database from 'better-sqlite3'

const SEED_USERS = [
  { id: 'u-bat', phone: '99112233', name: 'Батболд Дорж',       role: 'worker', danVerified: 1 },
  { id: 'u-gan', phone: '99224455', name: 'Ганзориг Бат',        role: 'worker', danVerified: 1 },
  { id: 'u-tuv', phone: '99336677', name: 'Түвшинбаяр Оюун',    role: 'worker', danVerified: 1 },
  { id: 'u-erd', phone: '99448899', name: 'Эрдэнэбат Монгол',   role: 'worker', danVerified: 1 },
  { id: 'u-del', phone: '99550011', name: 'Делгэрмаа Хүрэл',    role: 'worker', danVerified: 1 },
  { id: 'u-nar', phone: '99661122', name: 'Нарангэрэл Сүх',     role: 'worker', danVerified: 1 },
  { id: 'u-bol', phone: '99772233', name: 'Болд Энхжаргал',     role: 'worker', danVerified: 0 },
  { id: 'u-och', phone: '99883344', name: 'Очирбат Дамба',      role: 'worker', danVerified: 1 },
]

const SEED_WORKERS = [
  { id: 'w-bat', userId: 'u-bat', specialty: 'Цэвэрлэгээ',     price: 25000, rating: 4.9, reviews: 124, available: 1, active: 1 },
  { id: 'w-gan', userId: 'u-gan', specialty: 'Сантехник',       price: 35000, rating: 4.8, reviews:  89, available: 1, active: 1 },
  { id: 'w-tuv', userId: 'u-tuv', specialty: 'Цахилгаан',      price: 40000, rating: 4.9, reviews: 156, available: 1, active: 1 },
  { id: 'w-erd', userId: 'u-erd', specialty: 'Жижиг засвар',   price: 30000, rating: 4.7, reviews:  67, available: 0, active: 1 },
  { id: 'w-del', userId: 'u-del', specialty: 'Цэвэрлэгээ',     price: 22000, rating: 4.6, reviews:  43, available: 1, active: 1 },
  { id: 'w-nar', userId: 'u-nar', specialty: 'Будаг',           price: 28000, rating: 4.5, reviews:  31, available: 1, active: 1 },
  { id: 'w-bol', userId: 'u-bol', specialty: 'Агааржуулалт',   price: 45000, rating: 4.3, reviews:  18, available: 1, active: 0 },
  { id: 'w-och', userId: 'u-och', specialty: 'Сантехник',       price: 32000, rating: 4.8, reviews:  55, available: 1, active: 1 },
]

export function seed(db: Database.Database): void {
  const { n } = db.prepare('SELECT COUNT(*) as n FROM workers').get() as { n: number }
  if (n > 0) return

  const insertUser = db.prepare(
    'INSERT OR IGNORE INTO users (id, phone, name, role, dan_verified) VALUES (?, ?, ?, ?, ?)',
  )
  const insertWorker = db.prepare(
    'INSERT OR IGNORE INTO workers (id, user_id, specialty, price_per_hour, rating, review_count, is_available, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )

  db.transaction(() => {
    for (const u of SEED_USERS) {
      insertUser.run(u.id, u.phone, u.name, u.role, u.danVerified)
    }
    for (const w of SEED_WORKERS) {
      insertWorker.run(w.id, w.userId, w.specialty, w.price, w.rating, w.reviews, w.available, w.active)
    }
  })()

  console.log(`[seed] Inserted ${SEED_WORKERS.length} workers`)
}
