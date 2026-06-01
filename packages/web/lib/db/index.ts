import { Pool } from 'pg'
import { TABLES } from './schema'
import { seed } from './seed'

type GlobalWithDb = typeof globalThis & {
  __pool?: Pool
  __dbReady?: Promise<void>
}
const g = globalThis as GlobalWithDb

function createPool(): Pool {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return new Pool({ connectionString: url })
}

async function init(pool: Pool): Promise<void> {
  for (const sql of TABLES) {
    await pool.query(sql)
  }
  if (process.env.NODE_ENV !== 'production') {
    await seed(pool)
  }
}

if (!g.__pool) {
  g.__pool = createPool()
  g.__dbReady = init(g.__pool).catch((err) => {
    console.error('[db] init failed:', err)
    throw err
  })
}

export const db = g.__pool!
export const dbReady = g.__dbReady!
