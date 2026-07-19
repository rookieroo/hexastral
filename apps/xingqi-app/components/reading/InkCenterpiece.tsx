/**
 * 宣纸水墨板 — full-bleed paper, brush masses for 聚/对/照/流.
 * No nested oval-in-rectangle. Soft edge fade like ink on mounted xuan.
 */

import { useMemo } from 'react'
import { View } from 'react-native'
import Svg, { Defs, Ellipse, G, Line, RadialGradient, Rect, Stop } from 'react-native-svg'

import {
  CHAPTER_GLYPH,
  detectWuxing,
  type InkRelation,
  relationForChapter,
  type WuxingChar,
} from '@/lib/ancient-glyphs'
import type { XingqiChapter, XingqiChapterKind } from '@/lib/report-chapters'

import { AncientSeal } from './AncientSeal'

const W = 560
const H = 320
const CX = 280
const CY = 160

/** Warm 宣纸 */
const PAPER = '#EDE6D8'
const PAPER_FIBER = '#E4DCCB'
const INK = '#1C1914'
const INK_PALE = '#F7F2E8'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gauss(rnd: () => number, sd: number) {
  return (
    sd * Math.sqrt(-2 * Math.log(Math.max(1e-9, rnd()))) * Math.cos(2 * Math.PI * rnd())
  )
}

/** One brush dab — elongated ellipse (墨点/笔触), not a hard circle cluster only. */
type Dab = {
  cx: number
  cy: number
  rx: number
  ry: number
  rot: number
  opacity: number
  ink: boolean
}

function buildWash(relation: InkRelation, seed: number): Dab[] {
  const rnd = mulberry32(seed)
  const out: Dab[] = []
  const dab = (
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    ink: boolean,
    op: number,
    rot = (rnd() - 0.5) * 0.9
  ) => {
    out.push({
      cx: Math.max(20, Math.min(W - 20, cx)),
      cy: Math.max(20, Math.min(H - 20, cy)),
      rx,
      ry,
      rot,
      opacity: op,
      ink,
    })
  }

  if (relation === 'gather') {
    // 聚 — two wet brush pools bleed into one 焦墨 core
    for (let i = 0; i < 28; i++) {
      const left = i % 2 === 0
      dab(
        (left ? CX - 70 : CX + 70) + gauss(rnd, 36),
        CY + gauss(rnd, 42),
        18 + rnd() * 42,
        10 + rnd() * 22,
        left,
        0.1 + rnd() * 0.18
      )
    }
    for (let i = 0; i < 16; i++) {
      dab(CX + gauss(rnd, 22), CY + gauss(rnd, 18), 22 + rnd() * 36, 14 + rnd() * 20, true, 0.22 + rnd() * 0.28)
    }
    // pale bloom around core (宣纸吃墨)
    for (let i = 0; i < 10; i++) {
      dab(CX + gauss(rnd, 50), CY + gauss(rnd, 40), 40 + rnd() * 50, 24 + rnd() * 30, false, 0.08 + rnd() * 0.1)
    }
  } else if (relation === 'pair') {
    // 对 — twin 墨团 like two palms, soft mid breath
    for (let i = 0; i < 22; i++) {
      dab(155 + gauss(rnd, 28), CY + gauss(rnd, 48), 16 + rnd() * 34, 12 + rnd() * 26, true, 0.14 + rnd() * 0.22)
    }
    for (let i = 0; i < 22; i++) {
      dab(405 + gauss(rnd, 28), CY + gauss(rnd, 48), 16 + rnd() * 34, 12 + rnd() * 26, false, 0.14 + rnd() * 0.22)
    }
    for (let i = 0; i < 6; i++) {
      dab(CX + gauss(rnd, 12), CY + gauss(rnd, 8), 8 + rnd() * 14, 5 + rnd() * 8, rnd() > 0.5, 0.06)
    }
  } else if (relation === 'contrast') {
    // 照 — 浓淡对峙，中缝留白如飞白
    for (let i = 0; i < 26; i++) {
      const x = 60 + rnd() * (CX - 100) + gauss(rnd, 8)
      dab(Math.min(x, CX - 28), CY + gauss(rnd, 55), 14 + rnd() * 32, 11 + rnd() * 28, true, 0.16 + rnd() * 0.24)
    }
    for (let i = 0; i < 26; i++) {
      const x = CX + 100 + rnd() * (W - CX - 160) + gauss(rnd, 8)
      dab(Math.max(x, CX + 28), CY + gauss(rnd, 55), 14 + rnd() * 32, 11 + rnd() * 28, false, 0.18 + rnd() * 0.22)
    }
  } else {
    // 流 — 一笔长皴 / 墨线顺势而下
    for (let i = 0; i < 36; i++) {
      const t = i / 35
      const x = 50 + t * 460 + gauss(rnd, 10)
      const y = 36 + t * 230 + Math.sin(t * Math.PI * 1.4) * 40 + gauss(rnd, 8)
      dab(x, y, 10 + t * 28, 5 + rnd() * 10, t < 0.55, 0.12 + t * 0.22, -0.35 + t * 0.5)
    }
    for (let i = 0; i < 14; i++) {
      const t = rnd()
      dab(70 + t * 420 + gauss(rnd, 35), 40 + t * 200 + gauss(rnd, 40), 20 + rnd() * 30, 8 + rnd() * 14, rnd() > 0.45, 0.07)
    }
  }

  return out
}

/** Subtle paper fiber dots — full field, very faint. */
function paperFibers(seed: number): Array<{ x: number; y: number; r: number; o: number }> {
  const rnd = mulberry32(seed ^ 0x9e3779b9)
  const out: Array<{ x: number; y: number; r: number; o: number }> = []
  for (let i = 0; i < 120; i++) {
    out.push({
      x: rnd() * W,
      y: rnd() * H,
      r: 0.4 + rnd() * 1.2,
      o: 0.03 + rnd() * 0.05,
    })
  }
  return out
}

export function InkModePlate({
  relation,
  seed,
  width,
  height,
  showSeamGuide = false,
}: {
  relation: InkRelation
  seed: number
  width: number
  height: number
  showSeamGuide?: boolean
}) {
  const wash = useMemo(() => buildWash(relation, seed), [relation, seed])
  const fibers = useMemo(() => paperFibers(seed), [seed])

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        {/* Soft vignette — ink fades at paper edge, no hard oval “frame” */}
        <RadialGradient id='paperEdge' cx='50%' cy='50%' rx='72%' ry='78%'>
          <Stop offset='0%' stopColor={PAPER} stopOpacity={0} />
          <Stop offset='70%' stopColor={PAPER} stopOpacity={0} />
          <Stop offset='100%' stopColor={PAPER} stopOpacity={0.55} />
        </RadialGradient>
      </Defs>

      {/* Full-bleed 宣纸 */}
      <Rect x={0} y={0} width={W} height={H} fill={PAPER} />
      <Rect x={0} y={0} width={W} height={H} fill={PAPER_FIBER} opacity={0.35} />

      {fibers.map((f, i) => (
        <Ellipse
          // biome-ignore lint/suspicious/noArrayIndexKey: fiber field
          key={`f-${i}`}
          cx={f.x}
          cy={f.y}
          rx={f.r}
          ry={f.r * 0.6}
          fill={INK}
          opacity={f.o}
        />
      ))}

      {wash.map((d, i) => (
        <G
          // biome-ignore lint/suspicious/noArrayIndexKey: wash field
          key={`d-${i}`}
          transform={`rotate(${(d.rot * 180) / Math.PI} ${d.cx} ${d.cy})`}
        >
          <Ellipse
            cx={d.cx}
            cy={d.cy}
            rx={d.rx}
            ry={d.ry}
            fill={d.ink ? INK : INK_PALE}
            opacity={d.opacity}
          />
        </G>
      ))}

      {showSeamGuide && relation === 'contrast' ? (
        <Line
          x1={CX}
          y1={28}
          x2={CX}
          y2={H - 28}
          stroke={INK}
          strokeOpacity={0.1}
          strokeWidth={1}
          strokeDasharray='3 8'
        />
      ) : null}

      {/* Edge breath into surrounding UI — still paper, not a nested oval plate */}
      <Rect x={0} y={0} width={W} height={H} fill='url(#paperEdge)' />
    </Svg>
  )
}

export function InkCenterpiece({
  chapter,
  seed,
  width = 320,
  wuxing,
  extraProse = '',
  washOnly = false,
}: {
  chapter: XingqiChapter | XingqiChapterKind
  seed: number
  width?: number
  wuxing?: WuxingChar
  extraProse?: string
  washOnly?: boolean
}) {
  const kind: XingqiChapterKind = typeof chapter === 'string' ? chapter : chapter.kind
  const relation = relationForChapter(kind)
  const prose =
    typeof chapter === 'string'
      ? extraProse
      : [chapter.goldenLine, chapter.evidence, chapter.dynamic, extraProse].join('\n')
  const element = wuxing ?? detectWuxing(prose)
  const height = Math.round((width / W) * H)
  const sealSize = Math.max(26, Math.round(width * 0.11))

  return (
    <View
      style={{
        width,
        height,
        alignSelf: 'center',
        overflow: 'hidden',
        // No border — 宣纸满幅；与深色滚动底自然衔接靠墨缘淡出
        backgroundColor: PAPER,
      }}
    >
      <InkModePlate
        relation={relation}
        seed={seed + kind.length * 17}
        width={width}
        height={height}
      />

      {!washOnly ? (
        <View
          style={{
            position: 'absolute',
            right: 8,
            bottom: 8,
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 5,
            opacity: 0.92,
          }}
          pointerEvents='none'
        >
          <AncientSeal
            glyph={CHAPTER_GLYPH[kind]}
            size={sealSize}
            tile={INK}
            ink={PAPER}
            strokeWidth={7}
            inset={0.78}
          />
          {element ? (
            <AncientSeal
              glyph={element}
              size={Math.round(sealSize * 0.7)}
              tile='#8B3A2F'
              ink={PAPER}
              strokeWidth={7}
              inset={0.78}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  )
}
