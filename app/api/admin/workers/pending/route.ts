import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { AdminPendingWorker } from '@/lib/types'

type Row = {
  id: string; name: string; phone: string
  imei: string | null; police_file: string | null; created_at: string
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  await dbReady
  const rows = (await db.query(`
    SELECT w.id, u.name, u.phone, w.imei, w.police_file, w.created_at
    FROM   workers w
    JOIN   users   u ON u.id = w.user_id
    WHERE  w.is_active = false
    ORDER  BY w.created_at ASC
  `)).rows as Row[]

  const data: AdminPendingWorker[] = rows.map((r) => ({
    id:         String(r.id),
    name:       r.name,
    phone:      r.phone,
    imei:       r.imei,
    policeFile: r.police_file,
    createdAt:  r.created_at,
  }))

  return NextResponse.json({ success: true, data })
}
