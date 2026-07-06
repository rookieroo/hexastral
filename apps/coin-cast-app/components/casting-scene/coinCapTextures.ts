import * as THREE from 'three'

export type InscriptionStyle = 'traditional' | 'symbolic'

export interface YaoCapColors {
  id: string
  edge: string
  yang: string
  yin: string
  inscriptionStyle?: InscriptionStyle
}

const CAP_SIZE = 512

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

function getPixel(
  data: Uint8Array,
  size: number,
  x: number,
  y: number
): { r: number; g: number; b: number; a: number } {
  if (x < 0 || y < 0 || x >= size || y >= size) return { r: 0, g: 0, b: 0, a: 0 }
  const i = (y * size + x) * 4
  return { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0, a: data[i + 3] ?? 0 }
}

/** Simple hash for noise-based patina. */
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const n00 = hash(ix, iy)
  const n10 = hash(ix + 1, iy)
  const n01 = hash(ix, iy + 1)
  const n11 = hash(ix + 1, iy + 1)
  const nx0 = n00 + (n10 - n00) * ux
  const nx1 = n01 + (n11 - n01) * ux
  return nx0 + (nx1 - nx0) * uy
}

function fbmNoise(x: number, y: number): number {
  let amp = 0.5
  let freq = 1
  let sum = 0
  for (let o = 0; o < 4; o++) {
    sum += amp * smoothNoise(x * freq, y * freq)
    amp *= 0.5
    freq *= 2.1
  }
  return sum
}

const capTextureCache = new Map<string, THREE.DataTexture>()

/**
 * Draw a brush-stroke line segment with variable width (thicker in middle,
 * tapered at ends) to simulate a calligraphy brush.
 */
function brushSeg(
  data: Uint8Array,
  size: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  rgb: { r: number; g: number; b: number },
  maxWidth: number
): void {
  const len = Math.hypot(x1 - x0, y1 - y0)
  if (len < 0.5) return
  const steps = Math.ceil(len * 1.5)
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const strokeT = Math.sin(t * Math.PI)
    const w = Math.max(1, Math.round(maxWidth * (0.35 + strokeT * 0.65)))
    const cx = x0 + (x1 - x0) * t
    const cy = y0 + (y1 - y0) * t
    for (let dy = -w; dy <= w; dy++) {
      for (let dx = -w; dx <= w; dx++) {
        if (dx * dx + dy * dy <= w * w) {
          const px = Math.round(cx + dx)
          const py = Math.round(cy + dy)
          setPixel(data, size, px, py, rgb)
        }
      }
    }
  }
}

/**
 * Brush-stroke inscription with organic line variation.
 * Pattern: three horizontal lines above hole, V-shape below — abstract 五铢-style.
 */
function strokeInscription(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  discR: number,
  rgb: { r: number; g: number; b: number },
  strength: number
): void {
  const maxW = Math.max(1.5, Math.round(size * 0.012 * strength))
  const r = discR * 0.55

  const lines: [number, number, number, number][] = [
    [cx - r, cy - r * 0.72, cx + r, cy - r * 0.72],
    [cx - r * 1.05, cy - r * 0.38, cx + r * 1.05, cy - r * 0.38],
    [cx - r * 0.82, cy - r * 0.04, cx + r * 0.82, cy - r * 0.04],
    [cx - r * 0.6, cy + r * 0.58, cx - r * 0.08, cy + r * 0.78],
    [cx + r * 0.08, cy + r * 0.78, cx + r * 0.6, cy + r * 0.58],
  ]

  for (const [x0, y0, x1, y1] of lines) {
    brushSeg(data, size, x0, y0, x1, y1, rgb, maxW)
  }
}

/**
 * Draw a soft radial line from center to rim — tapered, organic, sun-ray quality.
 */
function drawRay(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  angle: number,
  innerR: number,
  outerR: number,
  rgb: { r: number; g: number; b: number },
  maxWidth: number
): void {
  const x0 = cx + Math.cos(angle) * innerR
  const y0 = cy + Math.sin(angle) * innerR
  const x1 = cx + Math.cos(angle) * outerR
  const y1 = cy + Math.sin(angle) * outerR
  brushSeg(data, size, x0, y0, x1, y1, rgb, maxWidth * 0.7)
}

/**
 * Sun-ray motif for yang face: 8 radial beams from the inner rim outward,
 * subtly varying in length and brightness.
 */
function drawSunRays(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  discR: number,
  rgb: { r: number; g: number; b: number }
): void {
  const innerR = discR * 0.4
  const outerR = discR * 0.82
  const maxW = Math.max(1.2, Math.round(size * 0.007))
  const rayCount = 8

  for (let i = 0; i < rayCount; i++) {
    const baseAngle = (i / rayCount) * Math.PI * 2
    const jitter = (hash(i, 7) - 0.5) * 0.08
    const angle = baseAngle + jitter
    const lengthVar = 0.88 + hash(i, 13) * 0.24
    const adjustedOuter = innerR + (outerR - innerR) * lengthVar
    const brightness = mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.25 - hash(i, 19) * 0.15)
    drawRay(data, size, cx, cy, angle, innerR, adjustedOuter, brightness, maxW)
  }
}

/**
 * Water-ripple motif for yin face: concentric circles with varying
 * intensity, simulating moonlight on still water.
 */
function drawWaterRipples(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  discR: number,
  rgb: { r: number; g: number; b: number }
): void {
  const innerR = discR * 0.38
  const outerR = discR * 0.82

  for (let ring = 0; ring < 4; ring++) {
    const t = ring / 3
    const r = innerR + (outerR - innerR) * t
    const intensity = 1 - t * 0.55
    const subdued = mixRgb(rgb, { r: 0, g: 0, b: 0 }, 0.35 - intensity * 0.2)
    const ringW = Math.max(1, Math.round(size * 0.004 * intensity))
    const steps = Math.ceil(Math.PI * 2 * r)
    for (let s = 0; s < steps; s++) {
      const angle = (s / steps) * Math.PI * 2
      const wobble = (hash(ring, s) - 0.5) * 2.5
      const px = Math.round(cx + Math.cos(angle) * (r + wobble))
      const py = Math.round(cy + Math.sin(angle) * (r + wobble))
      for (let dy = -ringW; dy <= ringW; dy++) {
        for (let dx = -ringW; dx <= ringW; dx++) {
          if (dx * dx + dy * dy <= ringW * ringW) {
            setPixel(data, size, px + dx, py + dy, subdued)
          }
        }
      }
    }
  }
}

/**
 * Yin-yang dot motif: a small contrasting dot in one sector.
 * Yang face gets a dark dot (阴中含阳), yin face gets a light dot (阳中含阴).
 */
function drawYinYangDot(
  data: Uint8Array,
  size: number,
  cx: number,
  cy: number,
  discR: number,
  rgb: { r: number; g: number; b: number },
  face: 'yang' | 'yin'
): void {
  const dotR = size * 0.026
  const angle = face === 'yang' ? Math.PI * 0.6 : Math.PI * 1.6
  const dist = discR * 0.58
  const dx = Math.round(cx + Math.cos(angle) * dist)
  const dy = Math.round(cy + Math.sin(angle) * dist)

  for (let y = -dotR; y <= dotR; y++) {
    for (let x = -dotR; x <= dotR; x++) {
      if (x * x + y * y <= dotR * dotR) {
        const fade = (x * x + y * y) / (dotR * dotR)
        const softRgb = mixRgb(rgb, getPixel(data, size, dx + x, dy + y), fade * 0.6)
        setPixel(data, size, dx + x, dy + y, softRgb)
      }
    }
  }
}

/**
 * Procedural coin cap: square hole + inscription + patina overlay.
 * Supports traditional brush-stroke or symbolic sun/ripple motifs.
 */
export function createYaoCapTexture(face: 'yang' | 'yin', colors: YaoCapColors): THREE.DataTexture {
  const style = colors.inscriptionStyle ?? 'traditional'
  const cacheKey = `${colors.id}:${face}:${style}:v4`
  const hit = capTextureCache.get(cacheKey)
  if (hit) return hit

  const size = CAP_SIZE
  const data = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const discR = size * 0.46

  const base = hexToRgb(face === 'yang' ? colors.yang : colors.yin)
  const edgeTint = hexToRgb(colors.edge)
  const darkRef = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.55)
  const lightRef = mixRgb(base, { r: 255, g: 255, b: 255 }, 0.3)
  const inscription = mixRgb(base, edgeTint, face === 'yang' ? 0.55 : 0.72)
  const holeBase = mixRgb(base, { r: 0, g: 0, b: 0 }, 0.85)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / discR
      const dy = (y - cy) / discR
      const dist = Math.hypot(dx, dy)
      if (dist > 1.05) continue

      const rim = dist > 0.88 ? (dist - 0.88) / 0.17 : 0
      let rgb = mixRgb(base, edgeTint, rim * 0.35)

      const noiseVal = fbmNoise(x * 0.04, y * 0.04)
      const patinaStrength = face === 'yang' ? 0.08 : 0.12
      const patinaT = Math.max(0, (noiseVal - 0.3) * patinaStrength)
      rgb = mixRgb(rgb, darkRef, patinaT)

      setPixel(data, size, x, y, rgb)
    }
  }

  // Square hole with bevel
  const holeHalf = size * 0.088
  const holeBevel = size * 0.012
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (x < cx - holeHalf - holeBevel || x > cx + holeHalf + holeBevel) continue
      if (y < cy - holeHalf - holeBevel || y > cy + holeHalf + holeBevel) continue

      const dx = Math.max(0, Math.abs(x - cx) - holeHalf)
      const dy = Math.max(0, Math.abs(y - cy) - holeHalf)
      const bevelDist = Math.hypot(dx, dy) / holeBevel

      if (Math.abs(x - cx) <= holeHalf && Math.abs(y - cy) <= holeHalf) {
        setPixel(data, size, x, y, holeBase)
      } else if (bevelDist <= 1) {
        const bevelRgb = mixRgb(holeBase, getPixel(data, size, x, y), bevelDist)
        setPixel(data, size, x, y, bevelRgb)
      }
    }
  }

  if (style === 'symbolic') {
    if (face === 'yang') {
      drawSunRays(data, size, cx, cy, discR, inscription)
      drawYinYangDot(data, size, cx, cy, discR, darkRef, face)
    } else {
      drawWaterRipples(data, size, cx, cy, discR, inscription)
      drawYinYangDot(data, size, cx, cy, discR, lightRef, face)
    }
  } else {
    strokeInscription(data, size, cx, cy, discR, inscription, face === 'yang' ? 1 : 0.72)
  }

  // Raised inner rim around hole (内郭)
  const innerR = discR * 0.82
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / innerR
      const dy = (y - cy) / innerR
      const dist = Math.hypot(dx, dy)
      if (dist > 0.96 && dist < 1.02) {
        const existing = getPixel(data, size, x, y)
        setPixel(data, size, x, y, mixRgb(existing, edgeTint, 0.42))
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

/** Vertical-groove edge texture for coin rim — simulates reeded / milled edge. */
const edgeTextureCache = new Map<string, THREE.DataTexture>()

export function createCoinEdgeTextures(colors: YaoCapColors): { edgeMap: THREE.DataTexture } {
  const cacheKey = `${colors.id}:edge:v1`
  const hit = edgeTextureCache.get(cacheKey)
  if (hit) return { edgeMap: hit }

  const w = 512
  const h = 16
  const data = new Uint8Array(w * h * 4)

  const edgeColor = hexToRgb(colors.edge)
  const darkGroove = mixRgb(edgeColor, { r: 0, g: 0, b: 0 }, 0.35)
  const lightRidge = mixRgb(edgeColor, { r: 255, g: 255, b: 255 }, 0.12)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const groovePhase = Math.sin(x * 0.55 + y * 2.5) * 0.5 + 0.5
      const noise = fbmNoise(x * 0.08, y * 3) * 0.3
      const t = groovePhase * 0.6 + noise

      const rgb =
        groovePhase < 0.35
          ? mixRgb(edgeColor, darkGroove, noise * 0.7)
          : mixRgb(edgeColor, lightRidge, t * 0.3)

      data[i] = rgb.r
      data[i + 1] = rgb.g
      data[i + 2] = rgb.b
      data[i + 3] = 255
    }
  }

  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(6, 1)
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true

  edgeTextureCache.set(cacheKey, tex)
  return { edgeMap: tex }
}
