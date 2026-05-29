import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { db, dbReady } from '../db'
import { requireAuth } from '../auth'

const router = Router()

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES     = 5 * 1024 * 1024
const MAX_PHOTOS    = 3

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
})

const createSchema = z.object({
  order_id:    z.coerce.number().int().positive(),
  reason:      z.enum(['хохирол', 'чанар муу', 'ажилтан ирээгүй', 'бусад']),
  description: z.string().min(20),
  photo_urls:  z.array(z.string().url()).max(3).optional(),
})

// POST /api/disputes
router.post('/disputes', async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Буруу өгөгдөл' }); return
    }

    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const { order_id, reason, description, photo_urls } = parsed.data

    await dbReady
    const order = (await db.query(
      `SELECT id, updated_at FROM orders WHERE id = $1 AND user_id = $2 AND status = 'completed'`,
      [order_id, session.sub],
    )).rows[0] as { id: string; updated_at: string } | undefined

    if (!order) { res.status(404).json({ success: false, error: 'Захиалга олдсонгүй эсвэл дуусаагүй байна' }); return }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    if (new Date(order.updated_at) < sevenDaysAgo) {
      res.status(400).json({ success: false, error: 'Захиалга дууссанаас хойш 7 хоног өнгөрсөн байна' }); return
    }

    const existing = (await db.query('SELECT id FROM disputes WHERE order_id = $1', [order_id])).rows[0]
    if (existing) { res.status(409).json({ success: false, error: 'Энэ захиалгад аль хэдийн гомдол гаргасан байна' }); return }

    const issue        = `${reason}: ${description}`
    const photoUrlsArr = photo_urls ?? []

    const result = (await db.query(
      `INSERT INTO disputes (order_id, issue, status, photo_urls) VALUES ($1, $2, 'open', $3) RETURNING id`,
      [order_id, issue, photoUrlsArr],
    )).rows[0] as { id: string }

    res.status(201).json({ success: true, data: { id: String(result.id) } })
  } catch (err) {
    console.error('[disputes POST]', err)
    res.status(500).json({ success: false, error: 'Алдаа гарлаа' })
  }
})

// POST /api/disputes/:id/upload
const UPLOADS_DIR = path.resolve(__dirname, '../../../../web/public/uploads')

router.post('/disputes/:id/upload', upload.single('photo'), async (req, res) => {
  try {
    const session = await requireAuth(req)
    if (!session) { res.status(401).json({ success: false, error: 'Нэвтрэх шаардлагатай' }); return }

    const disputeId = req.params.id
    await dbReady

    const dispute = (await db.query(
      `SELECT d.id, d.photo_urls FROM disputes d
       JOIN orders o ON o.id = d.order_id AND o.user_id = $1
       WHERE d.id = $2`,
      [session.sub, disputeId],
    )).rows[0] as { id: string; photo_urls: string[] } | undefined

    if (!dispute) { res.status(404).json({ success: false, error: 'Гомдол олдсонгүй' }); return }

    if ((dispute.photo_urls ?? []).length >= MAX_PHOTOS) {
      res.status(400).json({ success: false, error: `Хамгийн ихдээ ${MAX_PHOTOS} зураг оруулах боломжтой` }); return
    }

    const file = req.file
    if (!file) { res.status(400).json({ success: false, error: 'Зураг оруулаагүй байна' }); return }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      res.status(400).json({ success: false, error: 'Зөвхөн JPEG, PNG, WebP зөвшөөрөгдөнө' }); return
    }
    if (file.size > MAX_BYTES) {
      res.status(400).json({ success: false, error: 'Зургийн хэмжээ 5MB-аас хэтрэхгүй байх ёстой' }); return
    }

    const ext       = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'
    const filename  = `${Date.now()}.${ext}`
    const uploadDir = path.join(UPLOADS_DIR, 'disputes', disputeId)
    const filePath  = path.join(uploadDir, filename)
    const publicUrl = `/uploads/disputes/${disputeId}/${filename}`

    await mkdir(uploadDir, { recursive: true })
    await writeFile(filePath, file.buffer)

    await db.query(
      'UPDATE disputes SET photo_urls = array_append(photo_urls, $1), updated_at = NOW() WHERE id = $2',
      [publicUrl, disputeId],
    )

    res.json({ success: true, data: { url: publicUrl } })
  } catch (err) {
    console.error('[disputes/:id/upload POST]', err)
    res.status(500).json({ success: false, error: 'Зураг хадгалахад алдаа гарлаа' })
  }
})

export default router
