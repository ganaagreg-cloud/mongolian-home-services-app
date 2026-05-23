import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth, setSessionCookie } from '@/lib/auth'

const schema = z.object({
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

  const existing = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(session.sub)
  if (existing) {
    return NextResponse.json(
      { success: false, error: 'Та ажилтнаар аль хэдийн бүртгүүлсэн байна' },
      { status: 409 },
    )
  }

  const { imei, policeFile, bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data
  const workerId  = crypto.randomUUID()
  const bankingId = crypto.randomUUID()

  db.transaction(() => {
    db.prepare(
      `INSERT INTO workers
         (id, user_id, specialty, price_per_hour, rating, review_count,
          imei, police_file, is_available, is_active)
       VALUES (?, ?, '', 0, 0, 0, ?, ?, 1, 0)`,
    ).run(workerId, session.sub, imei, policeFile)

    db.prepare(
      `INSERT INTO banking_info
         (id, worker_id, bank_name, account_number, account_holder_name,
          iban, account_type, verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    ).run(bankingId, workerId, bankName, accountNumber, accountHolderName, iban, accountType)

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('worker', session.sub)
  })()

  // Re-issue JWT so the client session reflects the new role
  await setSessionCookie({ sub: session.sub, role: 'worker', phone: session.phone })

  return NextResponse.json({ success: true, data: { workerId } })
}
