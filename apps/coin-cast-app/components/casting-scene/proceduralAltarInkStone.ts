import * as THREE from 'three'

const TEX_SIZE = 512

let cachedStoneTextures: ProceduralAltarInkStoneTextures | null = null

/** Warmer, more legible zinc-stone — visible on mobile screens. */
const STONE_DARK = { r: 28, g: 28, b: 31 }
const STONE_LIGHT = { r: 58, g: 56, b: 62 }

function wrapIndex(i: number, period: number): number {
  return ((i % period) + period) % period
}

function latticeHash(ix: number, iy: number, period: number): number {
  const x = wrapIndex(ix, period)
  const y = wrapIndex(iy, period)
  let n = x * 374761393 + y * 668265263
  n = (n ^ (n >> 13)) * 1274126177
  return (n & 0xffffff) / 0xffffff
}

function smoothNoise(x: number, y: number, period: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const n00 = latticeHash(x0, y0, period)
  const n10 = latticeHash(x0 + 1, y0, period)
  const n01 = latticeHash(x0, y0 + 1, period)
  const n11 = latticeHash(x0 + 1, y0 + 1, period)
  const nx0 = n00 + (n10 - n00) * ux
  const nx1 = n01 + (n11 - n01) * ux
  return nx0 + (nx1 - nx0) * uy
}

function fbm(px: number, py: number, period: number, octaves: number): number {
  let amp = 0.55
  let freq = 1 / 96
  let sum = 0
  let norm = 0
  for (let o = 0; o < octaves; o++) {
    sum += amp * smoothNoise(px * freq, py * freq, period)
    norm += amp
    amp *= 0.52
    freq *= 2.05
  }
  return sum / norm
}

/** Tileable ink-stone height — fine grit + faint wash pools. */
function stoneHeight(u: number, v: number, size: number): number {
  const px = u * size
  const py = v * size
  const grit = fbm(px, py, size, 5)
  const wash = fbm(px * 0.35 + 40, py * 0.35 - 22, size, 3)
  const scratch = Math.sin((u * 140 + wash * 2.1) * Math.PI * 2) * 0.018
  const pool = (1 - Math.hypot(u - 0.5, v - 0.5) * 1.35) ** 2 * 0.08
  const h = grit * 0.52 + wash * 0.28 + scratch + pool + 0.12
  return Math.min(1, Math.max(0, h))
}

function lerpByte(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function buildHeightField(size: number): Float32Array {
  const heights = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] = stoneHeight(x / size, y / size, size)
    }
  }
  return heights
}

export type ProceduralAltarInkStoneTextures = {
  albedo: THREE.DataTexture
  normal: THREE.DataTexture
}

/**
 * Matte ink-stone altar slab — boosted normal strength for visible surface detail on mobile.
 */
export function createProceduralAltarInkStoneTextures(): ProceduralAltarInkStoneTextures {
  if (cachedStoneTextures) return cachedStoneTextures
  const size = TEX_SIZE
  const heights = buildHeightField(size)
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)

  const sampleH = (x: number, y: number): number => {
    const xi = wrapIndex(x, size)
    const yi = wrapIndex(y, size)
    return heights[yi * size + xi]!
  }

  const normalStrength = 4.0

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const h = heights[y * size + x]!
      const t = h * 0.72 + 0.1

      albedoData[i] = lerpByte(STONE_DARK.r, STONE_LIGHT.r, t)
      albedoData[i + 1] = lerpByte(STONE_DARK.g, STONE_LIGHT.g, t)
      albedoData[i + 2] = lerpByte(STONE_DARK.b, STONE_LIGHT.b, t)
      albedoData[i + 3] = 255

      const dx = (sampleH(x + 1, y) - sampleH(x - 1, y)) * normalStrength
      const dy = (sampleH(x, y + 1) - sampleH(x, y - 1)) * normalStrength
      let nx = -dx
      let ny = -dy
      let nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      nx /= len
      ny /= len
      nz /= len

      normalData[i] = Math.round(nx * 0.5 * 255 + 127.5)
      normalData[i + 1] = Math.round(ny * 0.5 * 255 + 127.5)
      normalData[i + 2] = Math.round(nz * 0.5 * 255 + 127.5)
      normalData[i + 3] = 255
    }
  }

  const albedo = new THREE.DataTexture(albedoData, size, size, THREE.RGBAFormat)
  albedo.colorSpace = THREE.SRGBColorSpace
  albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping
  albedo.magFilter = THREE.LinearFilter
  albedo.minFilter = THREE.LinearMipmapLinearFilter
  albedo.generateMipmaps = true
  albedo.needsUpdate = true

  const normal = new THREE.DataTexture(normalData, size, size, THREE.RGBAFormat)
  normal.colorSpace = THREE.NoColorSpace
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping
  normal.magFilter = THREE.LinearFilter
  normal.minFilter = THREE.LinearMipmapLinearFilter
  normal.generateMipmaps = true
  normal.needsUpdate = true

  cachedStoneTextures = { albedo, normal }
  return cachedStoneTextures
}
