import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import type { BankingInfo, AccountType } from '@/lib/types'

type BankingRow = {
  id: string; worker_id: string; bank_name: string; account_number: string
  account_holder_name: string; iban: string; account_type: string
  verified: number; updated_at: string
}

function toBankingInfo(row: BankingRow): BankingInfo {
  return {
    id:                 row.id,
    workerId:           row.worker_id,
    bankName:           row.bank_name,
    accountNumber:      row.account_number,
    accountHolderName:  row.account_holder_name,
    iban:               row.iban,
    accountType:        row.account_type as AccountType,
    verified:           row.verified === 1,
    updatedAt:          row.updated_at,
  }
}

function getWorkerIdForUser(userId: string): string | null {
  const row = db.prepare('SELECT id FROM workers WHERE user_id = ?').get(userId) as { id: string } | undefined
  return row?.id ?? null
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

  const workerId = getWorkerIdForUser(session.sub)
  // Return null data (not 404) so the client can distinguish "no banking info yet" from an error
  if (!workerId) return NextResponse.json({ success: true, data: null })

  const row = db.prepare('SELECT * FROM banking_info WHERE worker_id = ?').get(workerId) as BankingRow | undefined
  return NextResponse.json({ success: true, data: row ? toBankingInfo(row) : null })
}

export async function PUT(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const workerId = getWorkerIdForUser(session.sub)
  if (!workerId) {
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
  const existing = db.prepare('SELECT id FROM banking_info WHERE worker_id = ?').get(workerId) as { id: string } | undefined

  if (existing) {
    db.prepare(`
      UPDATE banking_info
      SET bank_name = ?, account_number = ?, account_holder_name = ?,
          iban = ?, account_type = ?, verified = 0, updated_at = datetime('now')
      WHERE worker_id = ?
    `).run(bankName, accountNumber, accountHolderName, iban, accountType, workerId)
  } else {
    db.prepare(`
      INSERT INTO banking_info
        (id, worker_id, bank_name, account_number, account_holder_name, iban, account_type, verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(crypto.randomUUID(), workerId, bankName, accountNumber, accountHolderName, iban, accountType)
  }

  const updated = db.prepare('SELECT * FROM banking_info WHERE worker_id = ?').get(workerId) as BankingRow
  return NextResponse.json({ success: true, data: toBankingInfo(updated) })
}
