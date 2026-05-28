import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { BankingInfo, AccountType } from '@/lib/types'

type BankingRow = {
  id: string; worker_id: string; bank_name: string; account_number: string
  account_holder_name: string; iban: string; account_type: string
  verified: boolean; updated_at: string
}

function toBankingInfo(row: BankingRow): BankingInfo {
  return {
    id:                 String(row.id),
    workerId:           String(row.worker_id),
    bankName:           row.bank_name,
    accountNumber:      row.account_number,
    accountHolderName:  row.account_holder_name,
    iban:               row.iban,
    accountType:        row.account_type as AccountType,
    verified:           Boolean(row.verified),
    updatedAt:          row.updated_at,
  }
}

const upsertSchema = z.object({
  bankName:          z.string().min(1),
  accountNumber:     z.string().regex(/^\d{10,20}$/),
  accountHolderName: z.string().min(3),
  iban:              z.string().regex(/^MN\d{2}[A-Z0-9]{18}$/),
  accountType:       z.enum(['checking', 'savings']),
})

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady
  const workerRow = (await db.query('SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL', [session.sub])).rows[0] as { id: string } | undefined
  if (!workerRow) return NextResponse.json({ success: true, data: null })

  const row = (await db.query('SELECT * FROM banking_info WHERE worker_id = $1', [workerRow.id])).rows[0] as BankingRow | undefined
  return NextResponse.json({ success: true, data: row ? toBankingInfo(row) : null })
}

export async function PUT(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady
  const workerRow = (await db.query('SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL', [session.sub])).rows[0] as { id: string } | undefined
  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Ажилтан олдсонгүй' }, { status: 404 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = upsertSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      { status: 400 },
    )
  }

  const { bankName, accountNumber, accountHolderName, iban, accountType } = parsed.data

  await db.query(`
    INSERT INTO banking_info (worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
    VALUES ($1, $2, $3, $4, $5, $6, false)
    ON CONFLICT (worker_id) DO UPDATE
      SET bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          account_holder_name = EXCLUDED.account_holder_name,
          iban = EXCLUDED.iban,
          account_type = EXCLUDED.account_type,
          verified = false,
          updated_at = NOW()
  `, [workerRow.id, bankName, accountNumber, accountHolderName, iban, accountType])

  const updated = (await db.query('SELECT * FROM banking_info WHERE worker_id = $1', [workerRow.id])).rows[0] as BankingRow
  return NextResponse.json({ success: true, data: toBankingInfo(updated) })
}
