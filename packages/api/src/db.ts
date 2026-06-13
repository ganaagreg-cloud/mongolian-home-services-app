import { Pool } from 'pg'
import { TABLES } from './db/schema'
import { seed } from './db/seed'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
})

async function init(): Promise<void> {
  for (const sql of TABLES) {
    await pool.query(sql)
  }
  // seed() is idempotent master data + admin account (gated on ADMIN_PW_HASH).
  // All fake/dev rows were removed, so it is safe to run in production — and
  // production NEEDS it: service_types, districts, pricing, and the admin login
  // only exist because of this. Runs on every boot via ON CONFLICT.
  await seed(pool)
}

export const db = pool
export const dbReady = init().catch((err) => {
  console.error('[db] init failed:', err)
  throw err
})
