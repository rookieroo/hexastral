import * as THREE from 'three'

export interface YaoCapColors {
  id: string
  edge: string
  yang: string
  yin: string
}

const CAP_SIZE = 256

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const n = Number.parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lerpByte(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: lerpByte(a.r, b.r, t),
    g: lerpByte(a.g, b.g, t),
    b: lerpByte(a.b, b.b, t),
  }
}

function setPixel(
  data: Uint8Array,
  size: number,
  x: number,
  y: number,
  rgb: { r: number; g: number; b: number },
  alpha = 255
): void {
  if (x < 0 || y < 0 || x >= size || y >= size) return
  const i = (y * size + x) * 4
  data[i] = rgb.r
  data[i + 1] = rgb.g
  data[i + 2] = rgb.b
  data[i + 3] = alpha
}

function fillDisc(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  radius: number,
  rgb: { r: number; g: number; b: number }
): void {
  const r2 = radius * radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) {
        setPixel(data, size, x, y, rgb)
      }
    }
  }
}

function fillRect(
  data: Uint8Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: { r: number; g: number; b: number }
): void {
  for (let y = Math.floor(y0); y <= Math.floor(y1); y++) {
    for (let x = Math.floor(x0); x <= Math.floor(x1); x++) {
      setPixel(data, size, x, y, rgb)
    }
  }
}

const capTextureCache = new Map<string, THREE.DataTexture>()

function strokeInscription(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  discR: number,
  rgb: { r: number; g: number; b: number },
  strength: number
): void {
  const sw = Math.max(1, Math.round(size * 0.012 * strength))
  const drawSeg = (x0: number, y0: number, x1: number, y1: number) => {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0))
    for (let s = 0; s <= steps; s++) {
      const t = steps === 0 ? 0 : s / steps
      const x = x0 + (x1 - x0) * t
      const y = y0 + (y1 - y0) * t
      for (let oy = -sw; oy <= sw; oy++) {
        for (let ox = -sw; ox <= sw; ox++) {
          if (ox * ox + oy * oy <= sw * sw) {
            setPixel(data, size, Math.round(x + ox), Math.round(y + oy), rgb)
          }
        }
      }
    }
  }

  const r = discR * 0.55
  drawSeg(cx - r, cy - r * 0.72, cx + r, cy - r * 0.72)
  drawSeg(cx - r * 1.05, cy - r * 0.38, cx + r * 1.05, cy - r * 0.38)
  drawSeg(cx - r * 0.82, cy - r * 0.04, cx + r * 0.82, cy - r * 0.04)
  drawSeg(cx - r * 0.6, cy + r * 0.58, cx - r * 0.08, cy + r * 0.78)
  drawSeg(cx + r * 0.08, cy + r * 0.78, cx + r * 0.6, cy + r * 0.58)
}

/**
 * Procedural coin cap: square hole + faint 五铢-style inscription (no yao bars).
 */
export function createYaoCapTexture(face: 'yang' | 'yin', colors: YaoCapColors): THREE.DataTexture {
  const cacheKey = `${colors.id}:${face}:v2`
  const hit = capTextureCache.get(cacheKey)
  if (hit) return hit

  const size = CAP_SIZE
  const data = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const discR = size * 0.46

  const base = hexToRgb(face === 'yang' ? colors.yang : colors.yin)
  const edgeTint = hexToRgb(colors.edge)
  const inscription = mixRgb(base, edgeTint, face === 'yang' ? 0.55 : 0.72)
  const hole = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.78)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / discR
      const dy = (y - cy) / discR
      const dist = Math.hypot(dx, dy)
      if (dist > 1.05) continue
      const rim = dist > 0.88 ? (dist - 0.88) / 0.17 : 0
      const rgb = mixRgb(base, edgeTint, rim * 0.35)
      setPixel(data, size, x, y, rgb)
    }
  }

  const holeHalf = size * 0.088
  fillRect(data, size, cx - holeHalf, cy - holeHalf, cx + holeHalf, cy + holeHalf, hole)

  strokeInscription(data, size, cx, cy, discR, inscription, face === 'yang' ? 1 : 0.72)

  const innerR = discR * 0.82
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / innerR
      const dy = (y - cy) / innerR
      const dist = Math.hypot(dx, dy)
      if (dist > 0.96 && dist < 1.02) {
        setPixel(data, size, x, y, mixRgb(base, edgeTint, 0.42))
      }
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true

  capTextureCache.set(cacheKey, tex)
  return tex
}
