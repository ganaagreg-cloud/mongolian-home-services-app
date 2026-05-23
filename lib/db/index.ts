import Database from 'better-sqlite3'
import path from 'path'
import { TABLES } from './schema'

const DB_PATH = path.join(process.cwd(), 'app.db')

// Survive Next.js hot-reload in dev without opening multiple connections.
const g = global as typeof global & { __db?: Database.Database }

if (!g.__db) {
  g.__db = new Database(DB_PATH)
  g.__db.pragma('journal_mode = WAL')
  g.__db.pragma('foreign_keys = ON')
  for (const sql of TABLES) {
    g.__db.exec(sql)
  }
}

export const db = g.__db
