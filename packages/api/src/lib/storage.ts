import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

// ── Magic-byte validation ──────────────────────────────────────────────────

function validateMagicBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  }
  if (mimeType === 'image/png') {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    return buf.length >= 8 && sig.every((b, i) => buf[i] === b)
  }
  if (mimeType === 'image/webp') {
    return (
      buf.length >= 12 &&
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50  // WEBP
    )
  }
  return false
}

export class InvalidImageError extends Error {
  constructor() { super('Magic bytes do not match declared MIME type') }
}

// ── R2 client (null when env vars absent → local-disk dev fallback) ────────

const r2Client = (() => {
  const accountId       = process.env.R2_ACCOUNT_ID
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
})()

const R2_BUCKET     = process.env.R2_BUCKET_NAME ?? ''
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? '').replace(/\/$/, '')
const LOCAL_ROOT    = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Upload a validated image buffer.
 *   - R2 env vars present → uploads to Cloudflare R2, returns CDN URL.
 *   - R2 env vars absent  → writes to local disk (dev), returns /uploads/… path.
 * Throws InvalidImageError when magic bytes do not match the declared mimeType.
 */
export async function uploadFile(
  key: string,
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  if (!validateMagicBytes(bytes, mimeType)) throw new InvalidImageError()

  if (r2Client && R2_BUCKET && R2_PUBLIC_URL) {
    await r2Client.send(new PutObjectCommand({
      Bucket:      R2_BUCKET,
      Key:         key,
      Body:        bytes,
      ContentType: mimeType,
    }))
    return `${R2_PUBLIC_URL}/${key}`
  }

  // Local-disk dev fallback
  const filePath = path.join(LOCAL_ROOT, key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, bytes)
  return `/uploads/${key}`
}
