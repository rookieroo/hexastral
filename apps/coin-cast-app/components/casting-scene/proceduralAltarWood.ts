import * as THREE from 'three'

const TEX_SIZE = 1024

/** Warm altar browns — aligned with `coinCastSceneColors.castingBackdrop*`. */
const WOOD_DARK = { r: 38, g: 31, b: 24 }
const WOOD_LIGHT = { r: 74, g: 60, b: 46 }

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
  let freq = 1 / 72
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

/** Tileable height field — grain runs along +U (world X on the altar plane). */
function woodHeight(u: number, v: number, size: number): number {
  const px = u * size
  const py = v * size
  const warp = fbm(px, py, size, 4) * 2.8 - 1.4
  const rings = Math.sin((u * 28 + warp) * Math.PI * 2) * 0.5 + 0.5
  const fine = Math.sin((u * 88 + warp * 0.35) * Math.PI * 2) * 0.12
  const pore = fbm(px * 2.3 + 17, py * 2.3 - 9, size, 3)
  const plank = Math.sin(v * Math.PI * 3.5 + fbm(px * 0.4, py * 0.4, size, 2) * 1.2) * 0.06
  const h = rings * 0.62 + fine + pore * 0.22 + plank + 0.08
  return Math.min(1, Math.max(0, h))
}

function lerpByte(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t)
}

function buildHeightField(size: number): Float32Array {
  const heights = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      heights[y * size + x] = woodHeight(x / size, y / size, size)
    }
  }
  return heights
}

export type ProceduralAltarWoodTextures = {
  albedo: THREE.DataTexture
  normal: THREE.DataTexture
}

/**
 * Original tileable altar wood — no external image assets.
 * 1024² POT, seamless at edges, low contrast for repeat at ~2.8×.
 */
export function createProceduralAltarWoodTextures(): ProceduralAltarWoodTextures {
  const size = TEX_SIZE
  const heights = buildHeightField(size)
  const albedoData = new Uint8Array(size * size * 4)
  const normalData = new Uint8Array(size * size * 4)

  const sampleH = (x: number, y: number): number => {
    const xi = wrapIndex(x, size)
    const yi = wrapIndex(y, size)
    return heights[yi * size + xi]!
  }

  const normalStrength = 3.6

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      const h = heights[y * size + x]!
      const t = h * 0.88 + 0.06

      albedoData[i] = lerpByte(WOOD_DARK.r, WOOD_LIGHT.r, t)
      albedoData[i + 1] = lerpByte(WOOD_DARK.g, WOOD_LIGHT.g, t)
      albedoData[i + 2] = lerpByte(WOOD_DARK.b, WOOD_LIGHT.b, t)
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

  return { albedo, normal }
}
