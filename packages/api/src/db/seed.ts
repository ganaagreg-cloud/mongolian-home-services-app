import type { Pool } from 'pg'

const ADMIN_BA_ID   = 'ba-admin-95342321'
const ADMIN_EMAIL   = '95342321@homeservice.local'
const ADMIN_PW_HASH = process.env.ADMIN_PW_HASH

export async function seed(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    // ── Admin account ────────────────────────────────────────────────────────
    if (!ADMIN_PW_HASH) {
      console.warn('[seed] ADMIN_PW_HASH not set — skipping admin account seed')
    } else {
      await client.query(
        `INSERT INTO "user" (id, name, email, "emailVerified", is_worker, active_mode, "createdAt", "updatedAt")
         VALUES ($1, 'Admin', $2, true, false, 'user', NOW(), NOW())
         ON CONFLICT (email) DO UPDATE SET "emailVerified" = true`,
        [ADMIN_BA_ID, ADMIN_EMAIL],
      )
      const { rows: [baRow] } = await client.query<{ id: string }>(
        `SELECT id FROM "user" WHERE email = $1`,
        [ADMIN_EMAIL],
      )
      const actualBaId = baRow?.id ?? ADMIN_BA_ID
      await client.query(
        `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
         VALUES ('acct-admin-95342321', $1, 'credential', $2, $3, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET password = $3`,
        [ADMIN_EMAIL, actualBaId, ADMIN_PW_HASH],
      )
      await client.query(
        `INSERT INTO users (phone, name, role, dan_verified, better_auth_id, email)
         VALUES ('95342321', 'Admin', 'admin', true, $1, $2)
         ON CONFLICT DO NOTHING`,
        [actualBaId, ADMIN_EMAIL],
      )
      await client.query(
        `UPDATE users SET role = 'admin', better_auth_id = $1
         WHERE phone = '95342321'`,
        [actualBaId],
      )
    }

    // ── Master data ──────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO service_types (name_mn, icon, sort_order, pricing_model, base_rate, min_charge, unit_label, requires_property_type) VALUES
        ('Цэвэрлэгээ',   'sparkles',        1, 'area',        800, 25000, 'м²',     true),
        ('Угаалга',      'washing-machine', 2, 'unit',      20000, 20000, 'ширхэг', false),
        ('Сантехник',    'wrench',          3, 'inspection', 35000, 35000, 'цаг',   false),
        ('Цахилгаан',   'zap',             4, 'inspection', 40000, 40000, 'цаг',   false),
        ('Будаг',        'paintbrush',      5, 'area',       1200, 35000, 'м²',     true),
        ('Агааржуулалт', 'wind',            6, 'unit',      45000, 45000, 'ширхэг', false),
        ('Жижиг засвар', 'hammer',          7, 'inspection', 30000, 25000, 'цаг',  false),
        ('Нүүлгэлт',     'truck',           8, 'survey',         0, 50000, 'цаг',  false)
      ON CONFLICT (name_mn) DO UPDATE SET
        pricing_model          = EXCLUDED.pricing_model,
        base_rate              = EXCLUDED.base_rate,
        min_charge             = EXCLUDED.min_charge,
        unit_label             = EXCLUDED.unit_label,
        requires_property_type = EXCLUDED.requires_property_type
    `)

    await client.query(`
      INSERT INTO districts (name_mn) VALUES
        ('Баянзүрх'), ('Хан-Уул'), ('Сүхбаатар'),
        ('Чингэлтэй'), ('Баянгол'), ('Сонгинохайрхан'),
        ('Налайх'), ('Багануур'), ('Багахангай')
      ON CONFLICT DO NOTHING
    `)

    await client.query(`
      INSERT INTO app_settings (key, value) VALUES
        ('free_cancel_minutes', '60'),
        ('late_cancel_fee', '5000'),
        ('platform_commission', '15'),
        ('damage_fund_rate', '2')
      ON CONFLICT DO NOTHING
    `)

    await client.query(`
      INSERT INTO pricing_rules (service_type_id, base_rate, peak_multiplier, holiday_multiplier)
      SELECT st.id,
             CASE st.name_mn
               WHEN 'Цэвэрлэгээ'   THEN 25000
               WHEN 'Угаалга'      THEN 20000
               WHEN 'Сантехник'    THEN 35000
               WHEN 'Цахилгаан'   THEN 40000
               WHEN 'Будаг'        THEN 28000
               WHEN 'Агааржуулалт' THEN 45000
               WHEN 'Жижиг засвар' THEN 30000
               WHEN 'Нүүлгэлт'     THEN 50000
               ELSE 25000
             END,
             20, 30
      FROM service_types st
      WHERE NOT EXISTS (SELECT 1 FROM pricing_rules pr WHERE pr.service_type_id = st.id)
    `)
  } finally {
    client.release()
  }
}
