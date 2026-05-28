import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { z } from 'zod'

const ALLOWED_TYPES = ['service_types', 'districts', 'pricing_rules', 'app_settings'] as const
type AllowedType = typeof ALLOWED_TYPES[number]

function isAllowed(t: string): t is AllowedType {
  return (ALLOWED_TYPES as readonly string[]).includes(t)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { type } = await params
  if (!isAllowed(type)) return NextResponse.json({ success: false, error: 'Буруу төрөл' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  await dbReady

  if (type === 'service_types') {
    const s = z.object({ name_mn: z.string().min(1), icon: z.string().min(1), sort_order: z.number().int().optional() }).safeParse(body)
    if (!s.success) return NextResponse.json({ success: false, error: s.error.issues[0]?.message }, { status: 400 })
    const row = (await db.query(
      `INSERT INTO service_types (name_mn, icon, sort_order) VALUES ($1, $2, $3) RETURNING *`,
      [s.data.name_mn, s.data.icon, s.data.sort_order ?? 0],
    )).rows[0]
    await db.query(
      `INSERT INTO pricing_rules (service_type_id) VALUES ($1)`, [row.id]
    )
    return NextResponse.json({ success: true, data: row })
  }

  if (type === 'districts') {
    const s = z.object({ name_mn: z.string().min(1) }).safeParse(body)
    if (!s.success) return NextResponse.json({ success: false, error: s.error.issues[0]?.message }, { status: 400 })
    const row = (await db.query(
      `INSERT INTO districts (name_mn) VALUES ($1) RETURNING *`, [s.data.name_mn]
    )).rows[0]
    return NextResponse.json({ success: true, data: row })
  }

  return NextResponse.json({ success: false, error: 'POST дэмжигдэхгүй' }, { status: 400 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { type } = await params
  if (!isAllowed(type)) return NextResponse.json({ success: false, error: 'Буруу төрөл' }, { status: 400 })

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  await dbReady

  if (type === 'service_types') {
    const s = z.object({ id: z.number(), name_mn: z.string().optional(), icon: z.string().optional(), is_active: z.boolean().optional(), sort_order: z.number().int().optional() }).safeParse(body)
    if (!s.success) return NextResponse.json({ success: false, error: s.error.issues[0]?.message }, { status: 400 })
    const { id, ...rest } = s.data
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (rest.name_mn    !== undefined) { sets.push(`name_mn = $${i++}`)   ; vals.push(rest.name_mn) }
    if (rest.icon       !== undefined) { sets.push(`icon = $${i++}`)      ; vals.push(rest.icon) }
    if (rest.is_active  !== undefined) { sets.push(`is_active = $${i++}`) ; vals.push(rest.is_active) }
    if (rest.sort_order !== undefined) { sets.push(`sort_order = $${i++}`); vals.push(rest.sort_order) }
    if (!sets.length) return NextResponse.json({ success: true, data: null })
    vals.push(id)
    await db.query(`UPDATE service_types SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return NextResponse.json({ success: true, data: null })
  }

  if (type === 'districts') {
    const s = z.object({ id: z.number(), name_mn: z.string().optional(), is_active: z.boolean().optional() }).safeParse(body)
    if (!s.success) return NextResponse.json({ success: false, error: s.error.issues[0]?.message }, { status: 400 })
    const { id, ...rest } = s.data
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (rest.name_mn   !== undefined) { sets.push(`name_mn = $${i++}`)   ; vals.push(rest.name_mn) }
    if (rest.is_active !== undefined) { sets.push(`is_active = $${i++}`) ; vals.push(rest.is_active) }
    if (!sets.length) return NextResponse.json({ success: true, data: null })
    vals.push(id)
    await db.query(`UPDATE districts SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return NextResponse.json({ success: true, data: null })
  }

  if (type === 'pricing_rules') {
    const s = z.object({ id: z.number(), base_rate: z.number().int().optional(), peak_multiplier: z.number().int().optional(), holiday_multiplier: z.number().int().optional() }).safeParse(body)
    if (!s.success) return NextResponse.json({ success: false, error: s.error.issues[0]?.message }, { status: 400 })
    const { id, ...rest } = s.data
    const sets: string[] = []; const vals: unknown[] = []; let i = 1
    if (rest.base_rate          !== undefined) { sets.push(`base_rate = $${i++}`)          ; vals.push(rest.base_rate) }
    if (rest.peak_multiplier    !== undefined) { sets.push(`peak_multiplier = $${i++}`)    ; vals.push(rest.peak_multiplier) }
    if (rest.holiday_multiplier !== undefined) { sets.push(`holiday_multiplier = $${i++}`) ; vals.push(rest.holiday_multiplier) }
    if (!sets.length) return NextResponse.json({ success: true, data: null })
    vals.push(id); sets.push(`updated_at = NOW()`)
    await db.query(`UPDATE pricing_rules SET ${sets.join(', ')} WHERE id = $${i}`, vals)
    return NextResponse.json({ success: true, data: null })
  }

  if (type === 'app_settings') {
    const s = z.object({ key: z.string(), value: z.string() }).safeParse(body)
    if (!s.success) return NextResponse.json({ success: false, error: s.error.issues[0]?.message }, { status: 400 })
    await db.query(
      `INSERT INTO app_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [s.data.key, s.data.value],
    )
    return NextResponse.json({ success: true, data: null })
  }

  return NextResponse.json({ success: false, error: 'PATCH дэмжигдэхгүй' }, { status: 400 })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { type } = await params
  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ success: false, error: 'id шаардлагатай' }, { status: 400 })

  await dbReady

  if (type === 'service_types') {
    await db.query(`UPDATE service_types SET is_active = false WHERE id = $1`, [id])
    return NextResponse.json({ success: true, data: null })
  }
  if (type === 'districts') {
    await db.query(`UPDATE districts SET is_active = false WHERE id = $1`, [id])
    return NextResponse.json({ success: true, data: null })
  }

  return NextResponse.json({ success: false, error: 'DELETE дэмжигдэхгүй' }, { status: 400 })
}
