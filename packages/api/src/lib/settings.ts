import type { Pool } from 'pg'

export async function getSettings(db: Pool) {
  const rows = (await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings`,
  )).rows
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    commission:  Number(map['platform_commission'] ?? 15) / 100,
    damage_fund: Number(map['damage_fund_rate']    ??  2) / 100,
  }
}
