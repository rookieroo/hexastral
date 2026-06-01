import * as Crypto from 'expo-crypto'

import type { YaoResult } from '@/lib/casting-types'

export interface AccelSample {
  x: number
  y: number
  z: number
  t: number
}

/** Linearize recent accelerometer samples + ritual context for hashing. */
export function fingerprintSamples(
  samples: AccelSample[],
  roundIndex: number,
  questionNorm: string
): string {
  const body = samples
    .map((s) => `${s.x.toFixed(4)},${s.y.toFixed(4)},${s.z.toFixed(4)},${s.t}`)
    .join(';')
  return `coincast_fp_v1|${body}|r=${roundIndex}|q=${questionNorm}`
}

export async function hashEntropyMaterial(material: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, material)
}

export function seedUInt32FromHashHex(hex: string): number {
  const slice = hex.slice(0, 8)
  const n = Number.parseInt(slice, 16)
  return Number.isFinite(n) ? n >>> 0 : 0x9e3779b9
}

/** Mulberry32 PRNG — deterministic from 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Three fair coin faces (2 yin / 3 yang) from sensor-derived seed. */
export function coinsFromSeed(seed: number): YaoResult {
  const rnd = mulberry32(seed)
  const c1: 2 | 3 = rnd() < 0.5 ? 2 : 3
  const c2: 2 | 3 = rnd() < 0.5 ? 2 : 3
  const c3: 2 | 3 = rnd() < 0.5 ? 2 : 3
  const total = (c1 + c2 + c3) as YaoResult['total']
  return { coins: [c1, c2, c3], total }
}

/** Stable offline fallback when crypto fails (should be rare). */
export function coinsFromSeedSyncFallback(samples: AccelSample[], roundIndex: number): YaoResult {
  let h = roundIndex * 0x9e3779b9
  for (const s of samples) {
    h = Math.imul(h ^ Math.floor(s.x * 10000), 0x85ebca6b)
    h = Math.imul(h ^ Math.floor(s.y * 10000), 0xc2b2ae35)
    h = Math.imul(h ^ Math.floor(s.z * 10000), 0x27d4eb2f)
    h ^= s.t >>> 0
  }
  return coinsFromSeed(h >>> 0)
}
