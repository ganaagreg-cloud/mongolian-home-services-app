import { Hono } from 'hono'
import { z } from 'zod'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'
import { uploadFile, InvalidImageError } from '../lib/storage'
import { logAudit } from '../lib/audit'

const router = new Hono()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const MAX_BYTES  = 5 * 1024 * 1024
const MAX_PHOTOS = 3

const createSchema = z.object({
  order_id:    z.number().int().positive(),
  reason:      z.enum(['хохирол', 'чанар муу', 'ажилтан ирээгүй', 'бусад']),
  description: z.string().min(20, 'Тайлбар хамгийн багадаа 20 тэмдэгт байх ёстой'),
  photo_urls:  z.array(z.string().url()).max(3).optional(),
})

// POST /api/disputes
router.post('/api/disputes', async (c) => {
  let body: unknown
  try { body = await c.req.json() } catch {
    return c.json({ success: false, error: 'Буруу өгөгдөл' }, 400)
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return c.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' },
      400,
    )
  }

  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const { order_id, reason, description, photo_urls } = parsed.data

  await dbReady

  const order = (await db.query(
    `SELECT id, updated_at FROM orders WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
    [order_id, session.sub],
  )).rows[0] as { id: string; updated_at: string } | undefined

  if (!order) {
    return c.json({ success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' }, 404)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  if (new Date(order.updated_at) < sevenDaysAgo) {
    return c.json({ success: false, error: 'Захиалга дууссанаас хойш 7 хоног өнгөрсөн байна' }, 400)
  }

  const existing = (await db.query('SELECT id FROM disputes WHERE order_id = $1', [order_id])).rows[0]
  if (existing) {
    return c.json({ success: false, error: 'Энэ захиалгад аль хэдийн гомдол гаргасан байна' }, 409)
  }

  const issue = `${reason}: ${description}`
  const photoUrlsArr = photo_urls ?? []

  let result: { id: string }
  try {
    result = (await db.query(
      `INSERT INTO disputes (order_id, issue, status, photo_urls) VALUES ($1, $2, 'open', $3) RETURNING id`,
      [order_id, issue, photoUrlsArr],
    )).rows[0] as { id: string }
  } catch {
    return c.json({ success: false, error: 'Алдаа гарлаа' }, 500)
  }

  await logAudit(session.sub, 'dispute.create', {
    disputeId: String(result.id),
    orderId:   order_id,
    reason,
  })

  return c.json({ success: true, data: { id: String(result.id) } }, 201)
})

// POST /api/disputes/:id/upload
router.post('/api/disputes/:id/upload', async (c) => {
  const session = await requireAuth(c)
  if (!session) return c.json({ success: false, error: 'Нэвтрэх шаардлагатай' }, 401)

  const disputeId = c.req.param('id')
  await dbReady

  const dispute = (await db.query(
    `SELECT d.id, d.photo_urls
     FROM disputes d
     JOIN orders o ON o.id = d.order_id AND o.user_id = $1
     WHERE d.id = $2`,
    [session.sub, disputeId],
  )).rows[0] as { id: string; photo_urls: string[] } | undefined

  if (!dispute) return c.json({ success: false, error: 'Гомдол олдсонгүй' }, 404)

  if ((dispute.photo_urls ?? []).length >= MAX_PHOTOS) {
    return c.json({ success: false, error: `Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулах боломжтой` }, 400)
  }

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    return c.json({ success: false, error: 'FormData уншихад алдаа гарлаа' }, 400)
  }

  const file = formData.get('photo')
  if (!file || typeof file === 'string') {
    return c.json({ success: false, error: 'Зураг оруулаагүй байна' }, 400)
  }

  const blob = file as Blob & { name?: string; type: string; size: number }

  if (!(ALLOWED_TYPES as readonly string[]).includes(blob.type)) {
    return c.json({ success: false, error: 'Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө' }, 400)
  }

  if (blob.size > MAX_BYTES) {
    return c.json({ success: false, error: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой' }, 400)
  }

  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
  const key = `disputes/${disputeId}/${Date.now()}.${ext}`
  let publicUrl: string
  try {
    const bytes = Buffer.from(await blob.arrayBuffer())
    publicUrl = await uploadFile(key, bytes, blob.type)
  } catch (e) {
    if (e instanceof InvalidImageError) {
      return c.json({ success: false, error: 'Зурагны агуулга зөвшөөрөгдсөн формат биш байна' }, 400)
    }
    return c.json({ success: false, error: 'Зураг хадгалахад алдаа гарлаа' }, 500)
  }

  await db.query(
    'UPDATE disputes SET photo_urls = array_append(photo_urls, $1), updated_at = NOW() WHERE id = $2',
    [publicUrl, disputeId],
  )

  return c.json({ success: true, data: { url: publicUrl } })
})

export default router
