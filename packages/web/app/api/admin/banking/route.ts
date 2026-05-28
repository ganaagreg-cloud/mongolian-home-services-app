import { NextRequest, NextResponse } from 'next/server'
import { db, dbReady } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import type { AdminBankingWorker } from '@/lib/types'

type Row = {
  id: string; worker_id: string; name: string; phone: string
  bank_name: string; account_number: string; account_holder_name: string
  iban: string; account_type: string; updated_at: string
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Зөвхөн админ хандах боломжтой' }, { status: 403 })
  }

  await dbReady
  const rows = (await db.query(`
    SELECT b.id, b.worker_id, u.name, u.phone,
           b.bank_name, b.account_number, b.account_holder_name,
           b.iban, b.account_type, b.updated_at
    FROM   banking_info b
    JOIN   workers w ON w.id = b.worker_id AND w.rejected_at IS NULL
    JOIN   users   u ON u.id = w.user_id  
    WHERE  b.verified = false
    ORDER  BY b.updated_at ASC
  `)).rows as Row[]

  const data: AdminBankingWorker[] = rows.map((r) => ({
    id:               String(r.id),
    workerId:         String(r.worker_id),
    workerName:       r.name,
    phone:            r.phone,
    bankName:         r.bank_name,
    accountNumber:    r.account_number,
    accountHolderName: r.account_holder_name,
    iban:             r.iban,
    accountType:      r.account_type as AdminBankingWorker['accountType'],
    submittedAt:      r.updated_at,
  }))

  return NextResponse.json({ success: true, data })
}
