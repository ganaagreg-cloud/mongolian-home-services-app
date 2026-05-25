import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db, dbReady } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  await dbReady
  const user = (await db.query(
    'SELECT id, phone, name, username, first_name, last_name, role FROM users WHERE id = $1',
    [session.sub],
  )).rows[0] as {
    id: string; phone: string; name: string; username: string
    first_name: string; last_name: string; role: string
  } | undefined

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  return NextResponse.json({
    success: true,
    data: {
      id:        user.id,
      phone:     user.phone,
      name:      user.name,
      username:  user.username,
      firstName: user.first_name,
      lastName:  user.last_name,
      role:      user.role,
    },
  })
}
