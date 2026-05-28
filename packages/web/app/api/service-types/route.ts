import { NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'

export async function GET() {
  await dbReady
  const rows = (await db.query(
    `SELECT id, name_mn, icon, sort_order
     FROM service_types WHERE is_active = true ORDER BY sort_order`,
  )).rows as { id: number; name_mn: string; icon: string; sort_order: number }[]

  return NextResponse.json({ success: true, data: rows })
}
