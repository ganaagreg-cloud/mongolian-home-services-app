import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { z } from 'zod'

const PatchSchema = z.object({
  is_active:     z.boolean().optional(),
  is_available:  z.boolean().optional(),
  specialty:     z.string().min(1).optional(),
  price_per_hour: z.number().int().min(1000).max(500000).optional(),
  rejected_at:   z.string().nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { id } = await params
  await dbReady

  const worker = (await db.query(`
    SELECT w.id, u.id as user_id, u.name, u.phone, u.email, u.dan_verified,
           w.specialty, w.price_per_hour, w.rating, w.review_count,
           w.is_active, w.is_available, w.rejected_at, w.imei, w.police_file, w.created_at,
           bi.bank_name, bi.account_number, bi.account_holder_name, bi.iban,
           bi.account_type, bi.verified as banking_verified
    FROM   workers w
    JOIN   users   u  ON u.id  = w.user_id
    LEFT JOIN banking_info bi ON bi.worker_id = w.id
    WHERE  w.id = $1
  `, [id])).rows[0]

  if (!worker) return NextResponse.json({ success: false, error: 'Олдсонгүй' }, { status: 404 })

  const orders = (await db.query(`
    SELECT o.id, o.service, o.status, o.total_amount, o.created_at,
           u.name as customer_name
    FROM   orders o JOIN users u ON u.id = o.user_id
    WHERE  o.worker_id = $1
    ORDER BY o.created_at DESC LIMIT 20
  `, [id])).rows

  return NextResponse.json({ success: true, data: { ...worker, orders } })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { id } = await params
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message }, { status: 400 })
  }

  await dbReady
  const d = parsed.data
  const sets: string[] = []
  const vals: unknown[] = []
  let i = 1

  if (d.is_active     !== undefined) { sets.push(`is_active = $${i++}`)     ; vals.push(d.is_active) }
  if (d.is_available  !== undefined) { sets.push(`is_available = $${i++}`)  ; vals.push(d.is_available) }
  if (d.specialty     !== undefined) { sets.push(`specialty = $${i++}`)     ; vals.push(d.specialty) }
  if (d.price_per_hour !== undefined) { sets.push(`price_per_hour = $${i++}`); vals.push(d.price_per_hour) }
  if ('rejected_at' in d) {
    sets.push(`rejected_at = $${i++}`)
    vals.push(d.rejected_at ?? null)
  }

  if (sets.length === 0) return NextResponse.json({ success: true, data: null })

  vals.push(id)
  await db.query(`UPDATE workers SET ${sets.join(', ')} WHERE id = $${i}`, vals)
  return NextResponse.json({ success: true, data: null })
}
