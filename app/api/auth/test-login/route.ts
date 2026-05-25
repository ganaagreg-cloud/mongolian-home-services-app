import { NextRequest, NextResponse } from 'next/server'
import { setSessionCookie } from '@/lib/auth'

// Dev-only endpoint — returns 404 in production.
// Accepts { role: 'user' | 'worker' | 'admin' } and sets a session cookie
// for the corresponding seeded test account so E2E tests can reach
// authenticated screens without a real login flow.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as { role?: string }
  const role = body.role ?? 'user'

  // sub values are numeric strings matching INTEGER PRIMARY KEY in the users table.
  // user=9 (Test User), worker=1 (Батболд/u-bat), admin=10 (Test Admin)
  const TEST_ACCOUNTS: Record<string, { sub: string; phone: string; role: 'user' | 'worker' | 'admin' }> = {
    user:   { sub: '9',  phone: '99000001', role: 'user' },
    worker: { sub: '1',  phone: '99112233', role: 'worker' },
    admin:  { sub: '10', phone: '99000002', role: 'admin' },
  }

  const account = TEST_ACCOUNTS[role]
  if (!account) {
    return NextResponse.json({ success: false, error: 'Unknown role' }, { status: 400 })
  }

  await setSessionCookie(account)
  return NextResponse.json({ success: true, role: account.role })
}
