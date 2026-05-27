import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const SPECIALTIES = [
  'цэвэрлэгээ', 'угаалга', 'сантехник', 'цахилгаанчин',
  'будагч', 'тавилгачин', 'гагнуурчин', 'нүүлгэлт',
] as const

const schema = z.object({
  specialty:          z.enum(SPECIALTIES),
  pricePerHour:       z.number().int().min(1000),
  imei:               z.string().length(15),
  policeFile:         z.string().min(1),
  bankName:           z.string().min(1),
  accountNumber:      z.string().regex(/^\d{10,20}$/),
  accountHolderName:  z.string().min(3),
  iban:               z.string().regex(/^MN\d{2}[A-Z0-9]{18}$/),
  accountType:        z.enum(['checking', 'savings']),
})

export async function POST(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      { status: 400 },
    )
  }

  await dbReady

  const existing = (await db.query(
    'SELECT id, rejected_at FROM workers WHERE user_id = $1 AND deleted_at IS NULL',
    [session.sub],
  )).rows[0] as { id: number; rejected_at: string | null } | undefined

  if (existing && !existing.rejected_at) {
    return NextResponse.json(
      { success: false, error: 'Та ажилтнаар аль хэдийн бүртгүүлсэн байна' },
      { status: 409 },
    )
  }

  if (existing && existing.rejected_at) {
    return NextResponse.json(
      { success: false, error: 'Таны өмнөх бүртгэл татгалзагдсан байна. Дэмжлэгтэй холбогдоно уу.' },
      { status: 409 },
    )
  }

  const { specialty, pricePerHour, imei, policeFile, bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data

  const client = await db.connect()
  let workerId: string
  try {
    await client.query('BEGIN')

    const workerResult = (await client.query(
      `INSERT INTO workers (user_id, specialty, price_per_hour, rating, review_count, imei, police_file, is_available, is_active)
       VALUES ($1, $2, $3, 0, 0, $4, $5, true, false)
       RETURNING id`,
      [session.sub, specialty, pricePerHour, imei, policeFile],
    )).rows[0] as { id: string }
    workerId = String(workerResult.id)

    await client.query(
      `INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
       VALUES ($1, $2, $3, $4, $5, $6, false)`,
      [workerId, bankName, accountNumber, accountHolderName, iban, accountType],
    )

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  return NextResponse.json({ success: true, data: { workerId } })
}
