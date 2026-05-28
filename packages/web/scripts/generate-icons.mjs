// Generates public/icons/icon-192.png and public/icons/icon-512.png
// Pure Node.js — no external dependencies (uses built-in zlib for deflate)
import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'

// CRC32 per PNG spec (ISO 3309 / ITU-T V.42)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length)
  const crcVal = Buffer.allocUnsafe(4); crcVal.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([len, typeBuf, data, crcVal])
}

function createPNG(size) {
  // RGB pixel buffer — fill with #1E40AF (30, 64, 175)
  const pixels = Buffer.alloc(size * size * 3)
  for (let i = 0; i < pixels.length; i += 3) {
    pixels[i] = 30; pixels[i + 1] = 64; pixels[i + 2] = 175
  }

  const p = (f) => Math.round(f * size)

  function fill(x1f, y1f, x2f, y2f, r, g, b) {
    for (let y = p(y1f); y <= p(y2f); y++) {
      for (let x = p(x1f); x <= p(x2f); x++) {
        if (x < 0 || x >= size || y < 0 || y >= size) continue
        const i = (y * size + x) * 3
        pixels[i] = r; pixels[i + 1] = g; pixels[i + 2] = b
      }
    }
  }

  // Roof triangle: apex (0.5, 0.19) → base y=0.46, x from 0.10 to 0.90
  const [ax, ay, by, bl, br] = [p(0.5), p(0.19), p(0.46), p(0.10), p(0.90)]
  for (let y = ay; y <= by; y++) {
    const t = (by - ay) === 0 ? 1 : (y - ay) / (by - ay)
    const xl = Math.round(ax + (bl - ax) * t)
    const xr = Math.round(ax + (br - ax) * t)
    for (let x = xl; x <= xr; x++) {
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      const i = (y * size + x) * 3
      pixels[i] = 255; pixels[i + 1] = 255; pixels[i + 2] = 255
    }
  }

  // House body (white)
  fill(0.17, 0.44, 0.83, 0.84, 255, 255, 255)

  // Door cutout (blue)
  fill(0.40, 0.62, 0.60, 0.84, 30, 64, 175)

  // PNG raw data: filter byte (0 = None) + RGB row for each scanline
  const rowLen = 1 + size * 3
  const raw = Buffer.alloc(size * rowLen)
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0
    pixels.copy(raw, y * rowLen + 1, y * size * 3, (y + 1) * size * 3)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // bit depth 8, color type RGB

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync('public/icons', { recursive: true })
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, createPNG(size))
  console.log(`created public/icons/icon-${size}.png`)
}
