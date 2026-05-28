import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  await dbReady

  const [serviceTypes, districts, pricingRules, settings] = await Promise.all([
    db.query(`SELECT st.*, pr.base_rate, pr.peak_multiplier, pr.holiday_multiplier
              FROM service_types st
              LEFT JOIN pricing_rules pr ON pr.service_type_id = st.id
              ORDER BY st.sort_order`),
    db.query(`SELECT * FROM districts ORDER BY name_mn`),
    db.query(`SELECT pr.*, st.name_mn FROM pricing_rules pr JOIN service_types st ON st.id = pr.service_type_id`),
    db.query(`SELECT * FROM app_settings ORDER BY key`),
  ])

  return NextResponse.json({
    success: true,
    data: {
      serviceTypes:  serviceTypes.rows,
      districts:     districts.rows,
      pricingRules:  pricingRules.rows,
      settings:      Object.fromEntries(settings.rows.map((r) => [r.key, r.value])),
    },
  })
}
