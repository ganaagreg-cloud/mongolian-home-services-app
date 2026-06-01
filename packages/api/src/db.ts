import { Pool } from 'pg'
import { TABLES } from './db/schema'
import { seed } from './db/seed'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function init(): Promise<void> {
  for (const sql of TABLES) {
    await pool.query(sql)
  }
  if (process.env.NODE_ENV !== 'production') {
    await seed(pool)
  }
}

export const db = pool
export const dbReady = init().catch((err) => {
  console.error('[db] init failed:', err)
  throw err
})
