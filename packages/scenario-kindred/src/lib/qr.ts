/**
 * Minimal QR encoder — byte mode, error-correction level M, versions 1–6.
 *
 * Self-contained (no native dependency) so the 9:16 share card can bake a
 * SCANNABLE install link into the captured image — the missing piece that let a
 * stranger seeing the card on social actually reach the App Store. Rendered via
 * the `react-native-svg` Kindred already ships (see ../components/QrCode.tsx).
 *
 * Scope is deliberately the smallest correct subset a short URL needs:
 *   - Byte mode (URLs are mixed-case + symbols).
 *   - ECC level M (~15% recovery — survives screenshot recompression).
 *   - Versions 1–6 (21×21 … 41×41); v6-M holds 108 data codewords — far more
 *     than any share URL. All six versions are single-group (uniform blocks),
 *     so the interleave stays simple. v7+ (version-info modules) is omitted.
 *
 * Algorithm follows the canonical Project-Nayuki reference (GF(256) + Reed–
 * Solomon + zig-zag placement + 8-mask penalty). The numeric core (GF/RS) is
 * unit-tested against the published generator-polynomial vectors so it is
 * verifiable without a physical scanner; final scan confirmation is device QA.
 */

// ── GF(256), primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1) ──────────
const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) GF_EXP[i] = GF_EXP[i - 255]!
}

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!
}

// ── Reed–Solomon ────────────────────────────────────────────────────────────

/** Divisor polynomial (the `degree` low coefficients of the monic generator). */
export function reedSolomonDivisor(degree: number): Uint8Array {
  const result = new Uint8Array(degree)
  result[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMul(result[j]!, root)
      if (j + 1 < degree) result[j]! ^= result[j + 1]!
    }
    root = gfMul(root, 0x02)
  }
  return result
}

function reedSolomonRemainder(data: number[], divisor: Uint8Array): number[] {
  const result = new Uint8Array(divisor.length)
  for (const b of data) {
    const factor = b ^ result[0]!
    result.copyWithin(0, 1)
    result[result.length - 1] = 0
    for (let i = 0; i < result.length; i++) result[i]! ^= gfMul(divisor[i]!, factor)
  }
  return Array.from(result)
}

// ── Version tables (ECC level M, versions 1–6) ──────────────────────────────
// [eccCodewordsPerBlock, numBlocks]
const ECC_M: Record<number, [number, number]> = {
  1: [10, 1],
  2: [16, 1],
  3: [26, 1],
  4: [18, 2],
  5: [24, 2],
  6: [16, 4],
}

function numRawDataModules(ver: number): number {
  let result = (16 * ver + 128) * ver + 64
  if (ver >= 2) {
    const numAlign = Math.floor(ver / 7) + 2
    result -= (25 * numAlign - 10) * numAlign - 55
    // v >= 7 would subtract 36 for version info — out of scope (v1–6).
  }
  return result
}

function numCodewords(ver: number): number {
  return Math.floor(numRawDataModules(ver) / 8)
}

function dataCodewordCount(ver: number): number {
  const [ecc, blocks] = ECC_M[ver]!
  return numCodewords(ver) - ecc * blocks
}

// ── Bit buffer ──────────────────────────────────────────────────────────────
function appendBits(buf: number[], val: number, len: number): void {
  for (let i = len - 1; i >= 0; i--) buf.push((val >>> i) & 1)
}

function utf8Bytes(s: string): number[] {
  const out: number[] = []
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (code < 0x80) out.push(code)
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000)
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return out
}

/** Smallest version (1–6) whose level-M byte capacity fits `byteLen`. */
function chooseVersion(byteLen: number): number {
  for (let ver = 1; ver <= 6; ver++) {
    // 4-bit mode + 8-bit char count (byte mode, v1–9) + 8 bits/char.
    const needBits = 4 + 8 + byteLen * 8
    if (needBits <= dataCodewordCount(ver) * 8) return ver
  }
  throw new Error(`qr: data too long for v6-M (${byteLen} bytes)`)
}

// ── Codeword assembly ───────────────────────────────────────────────────────
function makeCodewords(data: number[], ver: number): number[] {
  const dataCount = dataCodewordCount(ver)
  const buf: number[] = []
  appendBits(buf, 0b0100, 4) // byte mode
  appendBits(buf, data.length, 8) // char count (v1–9)
  for (const b of data) appendBits(buf, b, 8)
  // Terminator + pad to byte boundary.
  appendBits(buf, 0, Math.min(4, dataCount * 8 - buf.length))
  while (buf.length % 8 !== 0) buf.push(0)
  // Bytes, then alternating pad codewords.
  const bytes: number[] = []
  for (let i = 0; i < buf.length; i += 8) {
    let v = 0
    for (let j = 0; j < 8; j++) v = (v << 1) | buf[i + j]!
    bytes.push(v)
  }
  for (let pad = 0xec; bytes.length < dataCount; pad ^= 0xec ^ 0x11) bytes.push(pad)

  // Split into blocks, append ECC, interleave.
  const [eccLen, numBlocks] = ECC_M[ver]!
  const numShort = numBlocks - (numCodewords(ver) % numBlocks)
  const shortLen = Math.floor(numCodewords(ver) / numBlocks)
  const divisor = reedSolomonDivisor(eccLen)
  const blocks: { dat: number[]; ecc: number[] }[] = []
  let k = 0
  for (let i = 0; i < numBlocks; i++) {
    const datLen = shortLen - eccLen + (i < numShort ? 0 : 1)
    const dat = bytes.slice(k, k + datLen)
    k += datLen
    blocks.push({ dat, ecc: reedSolomonRemainder(dat, divisor) })
  }
  const result: number[] = []
  const maxDat = Math.max(...blocks.map((b) => b.dat.length))
  for (let i = 0; i < maxDat; i++)
    for (const b of blocks) if (i < b.dat.length) result.push(b.dat[i]!)
  for (let i = 0; i < eccLen; i++) for (const b of blocks) result.push(b.ecc[i]!)
  return result
}

// ── Matrix ──────────────────────────────────────────────────────────────────
type Grid = { size: number; modules: boolean[][]; fn: boolean[][] }

function newGrid(size: number): Grid {
  const mk = () => Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  return { size, modules: mk(), fn: mk() }
}

function setFn(g: Grid, x: number, y: number, dark: boolean): void {
  g.modules[y]![x] = dark
  g.fn[y]![x] = true
}

function drawFinder(g: Grid, cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x < 0 || x >= g.size || y < 0 || y >= g.size) continue
      const d = Math.max(Math.abs(dx), Math.abs(dy))
      setFn(g, x, y, d !== 2 && d !== 4) // rings at d 0,1,3; gaps at 2,4
    }
  }
}

const ALIGN_POS: Record<number, number[]> = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
}

function drawFunctionPatterns(g: Grid, ver: number): void {
  // Timing patterns.
  for (let i = 0; i < g.size; i++) {
    setFn(g, 6, i, i % 2 === 0)
    setFn(g, i, 6, i % 2 === 0)
  }
  // Finder patterns + separators (the 8th ring is the light separator).
  drawFinder(g, 3, 3)
  drawFinder(g, g.size - 4, 3)
  drawFinder(g, 3, g.size - 4)
  // Alignment patterns (skip those overlapping finders).
  const pos = ALIGN_POS[ver]!
  for (const ay of pos) {
    for (const ax of pos) {
      const nearFinder =
        (ax <= 7 && ay <= 7) || (ax <= 7 && ay >= g.size - 8) || (ax >= g.size - 8 && ay <= 7)
      if (nearFinder) continue
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          setFn(g, ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }
  }
  // Dark module + reserve format-info areas (marked function; filled later).
  setFn(g, 8, g.size - 8, true)
  for (let i = 0; i < 9; i++) {
    if (!g.fn[8]![i]) setFn(g, i, 8, false)
    if (!g.fn[i]![8]) setFn(g, 8, i, false)
  }
  for (let i = 0; i < 8; i++) {
    setFn(g, g.size - 1 - i, 8, false)
    setFn(g, 8, g.size - 1 - i, false)
  }
}

function drawCodewords(g: Grid, codewords: number[]): void {
  let bitIdx = 0
  const totalBits = codewords.length * 8
  // Zig-zag up the two columns of each pair, right→left; the timing column (6)
  // is skipped by collapsing right 6→5 so the next pair starts at 3.
  for (let right = g.size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let v = 0; v < g.size; v++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const upward = ((right + 1) & 2) === 0
        const y = upward ? g.size - 1 - v : v
        if (g.fn[y]![x]) continue
        let dark = false
        if (bitIdx < totalBits) {
          dark = ((codewords[bitIdx >>> 3]! >>> (7 - (bitIdx & 7))) & 1) === 1
          bitIdx++
        }
        g.modules[y]![x] = dark
      }
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0:
      return (x + y) % 2 === 0
    case 1:
      return y % 2 === 0
    case 2:
      return x % 3 === 0
    case 3:
      return (x + y) % 3 === 0
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0
  }
}

function applyMask(g: Grid, mask: number): void {
  for (let y = 0; y < g.size; y++)
    for (let x = 0; x < g.size; x++)
      if (!g.fn[y]![x] && maskBit(mask, x, y)) g.modules[y]![x] = !g.modules[y]![x]
}

// BCH(15,5) format info for ECC level M (bits 00) + mask, XOR mask 0x5412.
function drawFormat(g: Grid, mask: number): void {
  const data = (0b00 << 3) | mask // level M = 0b00
  let rem = data
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
  const bits = ((data << 10) | rem) ^ 0x5412
  const get = (i: number) => ((bits >>> i) & 1) === 1
  // Around top-left finder.
  for (let i = 0; i <= 5; i++) setFn(g, 8, i, get(i))
  setFn(g, 8, 7, get(6))
  setFn(g, 8, 8, get(7))
  setFn(g, 7, 8, get(8))
  for (let i = 9; i < 15; i++) setFn(g, 14 - i, 8, get(i))
  // Around top-right + bottom-left finders.
  for (let i = 0; i < 8; i++) setFn(g, g.size - 1 - i, 8, get(i))
  for (let i = 8; i < 15; i++) setFn(g, 8, g.size - 15 + i, get(i))
}

function penalty(g: Grid): number {
  const n = g.size
  let score = 0
  const dark = (x: number, y: number) => g.modules[y]![x]
  // Rule 1: runs of ≥5 same-color in rows/cols.
  for (let y = 0; y < n; y++) {
    for (let dir = 0; dir < 2; dir++) {
      let run = 1
      let prev = dir === 0 ? dark(0, y) : dark(y, 0)
      for (let i = 1; i < n; i++) {
        const c = dir === 0 ? dark(i, y) : dark(y, i)
        if (c === prev) {
          run++
          if (run === 5) score += 3
          else if (run > 5) score += 1
        } else {
          run = 1
          prev = c
        }
      }
    }
  }
  // Rule 2: 2×2 blocks of same color.
  for (let y = 0; y < n - 1; y++)
    for (let x = 0; x < n - 1; x++) {
      const c = dark(x, y)
      if (c === dark(x + 1, y) && c === dark(x, y + 1) && c === dark(x + 1, y + 1)) score += 3
    }
  // Rule 3: finder-like 1:1:3:1:1 patterns.
  const pat = [true, false, true, true, true, false, true]
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++)
      for (let dir = 0; dir < 2; dir++) {
        if (dir === 0 ? x + 7 > n : y + 7 > n) continue
        let ok = true
        for (let i = 0; i < 7; i++) {
          const c = dir === 0 ? dark(x + i, y) : dark(x, y + i)
          if (c !== pat[i]) {
            ok = false
            break
          }
        }
        if (ok) score += 40
      }
  // Rule 4: dark-module proportion.
  let darkCount = 0
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (dark(x, y)) darkCount++
  const pct = (darkCount * 100) / (n * n)
  score += Math.floor(Math.abs(pct - 50) / 5) * 10
  return score
}

/**
 * Encode `text` to a QR module matrix (true = dark). Byte mode, level M,
 * smallest fitting version 1–6. Picks the lowest-penalty of the 8 masks.
 */
export function encodeQr(text: string): boolean[][] {
  const data = utf8Bytes(text)
  const ver = chooseVersion(data.length)
  const codewords = makeCodewords(data, ver)
  const size = ver * 4 + 17

  let best: Grid | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (let mask = 0; mask < 8; mask++) {
    const g = newGrid(size)
    drawFunctionPatterns(g, ver)
    drawCodewords(g, codewords)
    drawFormat(g, mask)
    applyMask(g, mask)
    const s = penalty(g)
    if (s < bestScore) {
      bestScore = s
      best = g
    }
  }
  return best!.modules
}
