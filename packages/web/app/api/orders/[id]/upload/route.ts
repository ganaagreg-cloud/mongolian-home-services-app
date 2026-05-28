import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_BYTES = 5 * 1024 * 1024

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  await dbReady

  const workerRow = (await db.query(
    'SELECT id FROM workers WHERE user_id = $1 AND rejected_at IS NULL',
    [session.sub],
  )).rows[0] as { id: string } | undefined

  if (!workerRow) {
    return NextResponse.json({ success: false, error: 'Зөвхөн ажилтан зураг оруулах боломжтой' }, { status: 403 })
  }

  const { id: orderId } = await params

  const orderRow = (await db.query(
    'SELECT id FROM orders WHERE id = $1 AND worker_id = $2',
    [orderId, workerRow.id],
  )).rows[0] as { id: string } | undefined

  if (!orderRow) {
    return NextResponse.json({ success: false, error: 'Захиалга олдсонгүй' }, { status: 404 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'FormData уншихад алдаа гарлаа' }, { status: 400 })
  }

  const type = formData.get('type')
  if (type !== 'before' && type !== 'after') {
    return NextResponse.json(
      { success: false, error: '"type" нь "before" эсвэл "after" байх ёстой' },
      { status: 400 },
    )
  }

  const file = formData.get('photo')
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: 'Зураг оруулаагүй байна' }, { status: 400 })
  }

  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { success: false, error: 'Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө' },
      { status: 400 },
    )
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { success: false, error: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой' },
      { status: 400 },
    )
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const filename  = `${type}-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'orders', orderId)
  const filePath  = path.join(uploadDir, filename)
  const publicUrl = `/uploads/orders/${orderId}/${filename}`

  try {
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))
  } catch {
    return NextResponse.json({ success: false, error: 'Зураг хадгалахад алдаа гарлаа' }, { status: 500 })
  }

  const col = type === 'before' ? 'before_photo_url' : 'after_photo_url'
  await db.query(
    `UPDATE orders SET ${col} = $1, updated_at = NOW() WHERE id = $2`,
    [publicUrl, orderId],
  )

  return NextResponse.json({ success: true, data: { url: publicUrl } })
}
