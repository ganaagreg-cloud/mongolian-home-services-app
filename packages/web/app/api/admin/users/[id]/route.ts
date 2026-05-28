import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { z } from 'zod'

const PatchSchema = z.object({
  name:         z.string().min(1).optional(),
  phone:        z.string().optional(),
  email:        z.string().email().optional(),
  role:         z.enum(['user', 'admin']).optional(),
  is_worker:    z.boolean().optional(),
  active_mode:  z.enum(['user', 'worker']).optional(),
  dan_verified: z.boolean().optional(),
  avatar_url:   z.string().optional(),
  suspended:    z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin(req)
  if (!session) return NextResponse.json({ success: false, error: 'Зөвхөн админ' }, { status: 403 })

  const { id } = await params
  await dbReady

  const user = (await db.query(`
    SELECT u.id, u.name, u.phone, u.email, u.role, u.is_worker, u.active_mode,
           u.dan_verified, u.avatar_url, u.deleted_at, u.created_at, u.better_auth_id,
           (SELECT a."providerId" FROM account a JOIN "user" bu ON bu.id = a."userId"
            WHERE bu.id = u.better_auth_id LIMIT 1) as auth_method
    FROM users u WHERE u.id = $1
  `, [id])).rows[0]

  if (!user) return NextResponse.json({ success: false, error: 'Олдсонгүй' }, { status: 404 })

  const orders = (await db.query(`
    SELECT o.id, o.service, o.status, o.total_amount, o.created_at
    FROM orders o WHERE o.user_id = $1
    ORDER BY o.created_at DESC LIMIT 20
  `, [id])).rows

  return NextResponse.json({ success: true, data: { ...user, orders } })
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

  if (d.name         !== undefined) { sets.push(`name = $${i++}`)        ; vals.push(d.name) }
  if (d.phone        !== undefined) { sets.push(`phone = $${i++}`)       ; vals.push(d.phone) }
  if (d.email        !== undefined) { sets.push(`email = $${i++}`)       ; vals.push(d.email) }
  if (d.role         !== undefined) { sets.push(`role = $${i++}`)        ; vals.push(d.role) }
  if (d.is_worker    !== undefined) { sets.push(`is_worker = $${i++}`)   ; vals.push(d.is_worker) }
  if (d.active_mode  !== undefined) { sets.push(`active_mode = $${i++}`) ; vals.push(d.active_mode) }
  if (d.dan_verified !== undefined) { sets.push(`dan_verified = $${i++}`); vals.push(d.dan_verified) }
  if (d.avatar_url   !== undefined) { sets.push(`avatar_url = $${i++}`)  ; vals.push(d.avatar_url) }
  if (d.suspended    !== undefined) {
    sets.push(`deleted_at = $${i++}`)
    vals.push(d.suspended ? new Date().toISOString() : null)
  }

  if (sets.length === 0) return NextResponse.json({ success: true, data: null })

  vals.push(id)
  await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${i}`, vals)
  return NextResponse.json({ success: true, data: null })
}
