/**
 * Lightweight floor-plan image quality gate — no ML, header/size/aspect only.
 */

export type FloorplanImageQuality = 'ok' | 'low'

const MIN_BYTES = 8_192
const MAX_ASPECT = 3.5
const MIN_ASPECT = 0.28

function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24) return null
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return null
  }
  const width = (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!
  const height = (bytes[20]! << 24) | (bytes[21]! << 16) | (bytes[22]! << 8) | bytes[23]!
  if (width <= 0 || height <= 0) return null
  return { width, height }
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
  let i = 2
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i++
      continue
    }
    const marker = bytes[i + 1]
    if (marker === 0xc0 || marker === 0xc2) {
      const height = (bytes[i + 5]! << 8) | bytes[i + 6]!
      const width = (bytes[i + 7]! << 8) | bytes[i + 8]!
      if (width > 0 && height > 0) return { width, height }
      return null
    }
    const len = (bytes[i + 2]! << 8) | bytes[i + 3]!
    i += 2 + len
  }
  return null
}

export function assessFloorplanImageQuality(bytes: Uint8Array): FloorplanImageQuality {
  if (bytes.byteLength < MIN_BYTES) return 'low'
  const dims = readPngDimensions(bytes) ?? readJpegDimensions(bytes)
  if (!dims) return 'ok'
  const aspect = dims.width / dims.height
  if (aspect > MAX_ASPECT || aspect < MIN_ASPECT) return 'low'
  if (dims.width < 320 || dims.height < 320) return 'low'
  return 'ok'
}
