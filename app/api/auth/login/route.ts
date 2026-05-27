import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { normalizePhone, validateMongolianPhone, phoneToEmail } from '@/lib/phone'

const schema = z.object({
  phone:    z.string().min(1),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ success: false, error: 'Буруу өгөгдөл' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Утасны дугаар болон нууц үгийг оруулна уу' }, { status: 400 })
  }

  const phone = normalizePhone(parsed.data.phone)
  if (!validateMongolianPhone(phone)) {
    return NextResponse.json({ success: false, error: 'Утасны дугаар буруу байна' }, { status: 400 })
  }

  try {
    await auth.api.signInEmail({
      body:    { email: phoneToEmail(phone), password: parsed.data.password },
      headers: req.headers,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Утасны дугаар эсвэл нууц үг буруу байна' }, { status: 401 })
  }
}
