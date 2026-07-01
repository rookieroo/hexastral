/**
 * FengInkImage — the chapter 意象图, react-native-skia, STATIC.
 *
 * Feng-native ink/particle fields (NOT a Yuel clone — its own 风水 imagery),
 * built with the same proven technique as Yuel's InkCenterpiece: one settled,
 * deterministic point cloud per chapter, drawn as a few static `Points` clouds
 * on the 宣纸 ground — generated once, zero ongoing cost (no clock/frame loop).
 *
 *   external_landform  峦头   layered 龙脉 ridges over a water band
 *   personal_fit       八宅   eight 卦 clusters ringing a 气 core
 *   flying_stars       玄空   the 洛书 nine-palace star field (5-yellow center 朱)
 *   annual_directions  流年   a 流转 spiral (the year's turning), 朱 head
 *   remediation        化煞   a dark knot dissolving into mist (煞 transmuted)
 *   auspicious_objects 布置   points gathering into a centered 聚气 bloom
 *
 * 墨 + 铜金 on cream, 朱砂 used sparingly. Requires @shopify/react-native-skia
 * (native rebuild).
 */

import { Canvas, Fill, Points, type SkPoint } from '@shopify/react-native-skia'
import type { FengChapterKind } from '@zhop/scenario-feng'
import { useMemo } from 'react'

const VW = 440
const VH = 300
const CX = 220
const CY = 150

// ── deterministic rng + value noise (stable, always-good layout) ──────────────
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function gaussFrom(rnd: () => number) {
  return (sd: number) =>
    sd * Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd())
}

interface Clouds {
  inkF: SkPoint[]
  inkB: SkPoint[]
  brF: SkPoint[]
  brB: SkPoint[]
  acc: SkPoint[]
}

function generate(kind: FengChapterKind, s: number): Clouds {
  const c: Clouds = { inkF: [], inkB: [], brF: [], brB: [], acc: [] }
  const rnd = mulberry32(SEED[kind] ?? 7)
  const gauss = gaussFrom(rnd)
  const put = (tier: 'ink' | 'bronze' | 'accent', x: number, y: number) => {
    const p = { x: x * s, y: y * s }
    if (tier === 'accent') c.acc.push(p)
    else if (tier === 'ink') (rnd() < 0.36 ? c.inkB : c.inkF).push(p)
    else (rnd() < 0.36 ? c.brB : c.brF).push(p)
  }

  switch (kind) {
    case 'external_landform': {
      // 龙脉 — three ridge crests (back faint bronze → front bold ink), water below.
      for (let k = 0; k < 3; k++) {
        const baseY = 96 + k * 30
        const tier = k === 2 ? 'ink' : 'bronze'
        for (let i = 0; i < 1500; i++) {
          const x = rnd() * VW
          const hump = Math.max(0, Math.sin((x / VW) * Math.PI * 3 + k * 1.4))
          const crestY = baseY - 30 * hump
          const y = crestY + Math.abs(gauss(20))
          const f = Math.exp(-(((y - crestY) / 26) ** 2)) * (k === 2 ? 1 : 0.7)
          if (rnd() > f) continue
          put(tier, x, y)
        }
      }
      for (let i = 0; i < 900; i++) {
        const x = rnd() * VW
        const y = 252 + 9 * Math.sin(x / 26) + gauss(5)
        put('bronze', x, y)
      }
      break
    }
    case 'personal_fit': {
      // 八宅 — eight 卦 clusters around a 气 core + a faint ring.
      const R = 96
      for (let k = 0; k < 8; k++) {
        const ang = (Math.PI / 4) * k - Math.PI / 2
        const bx = CX + R * Math.cos(ang)
        const by = CY + R * Math.sin(ang) * 0.82
        for (let i = 0; i < 300; i++) put('bronze', bx + gauss(15), by + gauss(15) * 0.82)
      }
      for (let i = 0; i < 900; i++) {
        const ang = rnd() * 2 * Math.PI
        const r = R + gauss(4)
        put('ink', CX + r * Math.cos(ang), CY + r * Math.sin(ang) * 0.82)
      }
      for (let i = 0; i < 600; i++) put('ink', CX + gauss(16), CY + gauss(13))
      break
    }
    case 'flying_stars': {
      // 玄空 — 洛书 nine-palace clusters; center (5黄) denser + 朱砂.
      for (let r = 0; r < 3; r++) {
        for (let col = 0; col < 3; col++) {
          const gx = CX + (col - 1) * 86
          const gy = CY + (r - 1) * 78
          const center = r === 1 && col === 1
          const n = center ? 520 : 300
          for (let i = 0; i < n; i++) {
            const x = gx + gauss(17)
            const y = gy + gauss(15)
            if (center && rnd() < 0.4) put('accent', x, y)
            else put(center ? 'bronze' : 'ink', x, y)
          }
        }
      }
      break
    }
    case 'annual_directions': {
      // 流年 — a 流转 spiral outward; the head (current turn) in 朱砂.
      const N = 2800
      for (let i = 0; i < N; i++) {
        const tt = i / N
        const ang = tt * Math.PI * 6
        const rad = 14 + tt * 118
        const x = CX + rad * Math.cos(ang) + gauss(4)
        const y = CY + rad * Math.sin(ang) * 0.8 + gauss(4)
        if (tt > 0.93) put('accent', x, y)
        else put(tt > 0.5 ? 'bronze' : 'ink', x, y)
      }
      break
    }
    case 'remediation': {
      // 化煞 — a dense ink knot (left) dissolving into bronze mist (right).
      for (let i = 0; i < 3200; i++) {
        const tt = rnd()
        const x = CX - 96 + tt * 220 + gauss(16)
        const y = CY + gauss(14 + tt * 58)
        if (rnd() > 1 - tt * 0.72) continue
        put(tt < 0.4 ? 'ink' : 'bronze', x, y)
      }
      break
    }
    default: {
      // auspicious_objects 布置 — points gathering into a centered 聚气 bloom.
      for (let i = 0; i < 3000; i++) {
        const ang = rnd() * 2 * Math.PI
        const r = 112 * rnd() ** 0.66
        const x = CX + r * Math.cos(ang)
        const y = CY + r * Math.sin(ang) * 0.82
        const f = Math.exp(-((r / 78) ** 2)) + 0.12
        if (rnd() > f) continue
        put(r < 46 ? 'bronze' : 'ink', x, y)
      }
      for (let i = 0; i < 240; i++) put('accent', CX + gauss(7), CY + gauss(6))
      break
    }
  }
  return c
}

const SEED: Record<FengChapterKind, number> = {
  external_landform: 11,
  personal_fit: 23,
  flying_stars: 5,
  annual_directions: 31,
  remediation: 17,
  auspicious_objects: 41,
}

const INK_F = 'rgba(26,42,48,0.32)'
const INK_B = 'rgba(26,42,48,0.6)'
const BR_F = 'rgba(138,109,59,0.42)'
const BR_B = 'rgba(138,109,59,0.74)'
const ACCENT = 'rgba(155,34,38,0.66)'

interface FengInkImageProps {
  kind: FengChapterKind
  /** Rendered width; height follows the 440×300 aspect. */
  width?: number
}

export function FengInkImage({ kind, width = 280 }: FengInkImageProps) {
  const s = width / VW
  const height = (width * VH) / VW
  const clouds = useMemo(() => generate(kind, s), [kind, s])

  return (
    <Canvas style={{ width, height }}>
      <Fill color='#F3ECDD' />
      <Points
        points={clouds.brF}
        mode='points'
        color={BR_F}
        style='stroke'
        strokeWidth={2}
        strokeCap='round'
      />
      <Points
        points={clouds.inkF}
        mode='points'
        color={INK_F}
        style='stroke'
        strokeWidth={2}
        strokeCap='round'
      />
      <Points
        points={clouds.brB}
        mode='points'
        color={BR_B}
        style='stroke'
        strokeWidth={2.7}
        strokeCap='round'
      />
      <Points
        points={clouds.inkB}
        mode='points'
        color={INK_B}
        style='stroke'
        strokeWidth={2.7}
        strokeCap='round'
      />
      <Points
        points={clouds.acc}
        mode='points'
        color={ACCENT}
        style='stroke'
        strokeWidth={2.7}
        strokeCap='round'
      />
    </Canvas>
  )
}
