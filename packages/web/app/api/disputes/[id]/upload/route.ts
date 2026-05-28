import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { db, dbReady } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_BYTES = 5 * 1024 * 1024
const MAX_PHOTOS = 3

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth(req)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, { status: 401 })
  }

  const { id: disputeId } = await params
  await dbReady

  // Verify caller owns the order tied to this dispute
  const dispute = (await db.query(
    `SELECT d.id, d.photo_urls
     FROM disputes d
     JOIN orders o ON o.id = d.order_id AND o.user_id = $1
     WHERE d.id = $2`,
    [session.sub, disputeId],
  )).rows[0] as { id: string; photo_urls: string[] } | undefined

  if (!dispute) {
    return NextResponse.json({ success: false, error: 'Гомдол олдсонгүй' }, { status: 404 })
  }

  if ((dispute.photo_urls ?? []).length >= MAX_PHOTOS) {
    return NextResponse.json(
      { success: false, error: `Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулах боломжтой` },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, error: 'FormData уншихад алдаа гарлаа' }, { status: 400 })
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
  const filename  = `${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'disputes', disputeId)
  const filePath  = path.join(uploadDir, filename)
  const publicUrl = `/uploads/disputes/${disputeId}/${filename}`

  try {
    await mkdir(uploadDir, { recursive: true })
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))
  } catch {
    return NextResponse.json({ success: false, error: 'Зураг хадгалахад алдаа гарлаа' }, { status: 500 })
  }

  await db.query(
    'UPDATE disputes SET photo_urls = array_append(photo_urls, $1), updated_at = NOW() WHERE id = $2',
    [publicUrl, disputeId],
  )

  return NextResponse.json({ success: true, data: { url: publicUrl } })
}
