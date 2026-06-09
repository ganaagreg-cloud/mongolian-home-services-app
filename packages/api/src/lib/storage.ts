import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

// ── Adapter interface ──────────────────────────────────────────────────────

export interface StorageAdapter {
  /** Store buf at key; returns the public URL for that key. */
  put(key: string, buf: Buffer, mime: string): Promise<string>
  /** Derive the public URL for an already-stored key. */
  url(key: string): string
}

// ── Local adapter (dev / single-instance) ─────────────────────────────────

const LOCAL_ROOT = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')

class LocalAdapter implements StorageAdapter {
  async put(key: string, buf: Buffer, _mime: string): Promise<string> {
    const filePath = path.join(LOCAL_ROOT, key)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, buf)
    return this.url(key)
  }
  url(key: string): string {
    return `/uploads/${key}`
  }
}

// ── S3 / R2 adapter stub — wiring blocked until ХХК company registration ──

class S3Adapter implements StorageAdapter {
  async put(_key: string, _buf: Buffer, _mime: string): Promise<string> {
    throw new Error('[S3Adapter] not configured — awaiting ХХК company registration')
  }
  url(_key: string): string {
    throw new Error('[S3Adapter] not configured — awaiting ХХК company registration')
  }
}

// ── Singleton selected by STORAGE_DRIVER env (default: 'local') ───────────

export const adapter: StorageAdapter = (() => {
  if ((process.env.STORAGE_DRIVER ?? 'local') === 's3') return new S3Adapter()
  return new LocalAdapter()
})()

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
      buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
    )
  }
  return false
}

export class InvalidImageError extends Error {
  constructor() { super('Magic bytes do not match declared MIME type') }
}

// ── Compatibility wrapper (used by disputes and other non-thumbnail uploads) ─

export async function uploadFile(
  key: string,
  bytes: Buffer,
  mimeType: string,
): Promise<string> {
  if (!validateMagicBytes(bytes, mimeType)) throw new InvalidImageError()
  return adapter.put(key, bytes, mimeType)
}
