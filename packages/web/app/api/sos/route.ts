import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const sosSchema = z.object({
  orderId:   z.string().optional(),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
})

function dispatchNotifications(alertId: number, role: string): void {
  void Promise.resolve().then(() => {
    console.log(`[SOS] Alert #${alertId} dispatched — role=${role}`)
  })
}

// POST /api/sos — must respond in < 2s. DB write is async pg but still fast.
export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch { body = {} }

  const parsed = sosSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const { orderId, latitude, longitude } = parsed.data

  await dbReady
  const result = (await db.query(`
    INSERT INTO sos_alerts (order_id, triggered_by_id, role, latitude, longitude, status)
    VALUES ($1, $2, $3, $4, $5, 'active')
    RETURNING id
  `, [
    orderId ? Number(orderId) : null,
    Number(session.sub),
    session.role,
    latitude ?? null,
    longitude ?? null,
  ])).rows[0] as { id: number }

  const alertId = Number(result.id)

  dispatchNotifications(alertId, session.role)

  return NextResponse.json({ success: true, data: { alertId } }, { status: 201 })
}
