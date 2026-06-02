import type { Pool } from 'pg'

export async function getSettings(db: Pool) {
  const rows = (await db.query<{ key: string; value: string }>(
    `SELECT key, value FROM app_settings`,
  )).rows
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return {
    commission:          Number(map['platform_commission']   ?? 15) / 100,
    damage_fund:         Number(map['damage_fund_rate']      ??  2) / 100,
    urgent_surcharge:    Number(map['urgent_fee_multiplier'] ??  0) / 100,
    urgent_multiplier:   Number(map['urgent_fee_multiplier'] ??  0) / 100,
    late_cancel_fee:     Number(map['late_cancel_fee']       ?? 5000),
    free_cancel_minutes: Number(map['free_cancel_minutes']   ?? 30),
  }
}
