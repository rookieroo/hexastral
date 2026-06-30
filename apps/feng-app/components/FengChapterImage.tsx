/**
 * FengChapterImage — the 意象图 set: one symbolic illustration per report chapter.
 *
 * Feng-native (NOT a Yuel clone): each is drawn from the chapter's own 风水
 * content — 峦头 as layered ridges over water, 八宅 as the 八卦 ring, 玄空 as the
 * 洛书 nine-palace grid, 流年 as a 罗盘 dial, 化煞 as the 葫芦, 吉祥 as the 古钱.
 * Carved-rubbing line work in 铜金/朱砂 on the 宣纸 ground. Pure react-native-svg
 * (no Skia), so it ships with the current native build and tints cleanly.
 */

import type { FengChapterKind } from '@zhop/scenario-feng'
import Svg, { Circle, G, Line, Path, Polygon, Rect } from 'react-native-svg'
import { FENG_PAPER } from '@/lib/theme'

const VB_W = 220
const VB_H = 150

interface FengChapterImageProps {
  kind: FengChapterKind
  /** Rendered width in px; height follows the 220×150 ratio. */
  width?: number
  color?: string
  accent?: string
}

export function FengChapterImage({
  kind,
  width = 200,
  color = FENG_PAPER.bronze,
  accent = FENG_PAPER.cinnabar,
}: FengChapterImageProps) {
  return (
    <Svg
      width={width}
      height={(width * VB_H) / VB_W}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      accessibilityRole='image'
    >
      {renderImagery(kind, color, accent)}
    </Svg>
  )
}

function renderImagery(kind: FengChapterKind, c: string, a: string) {
  switch (kind) {
    case 'external_landform':
      return <Landform c={c} a={a} />
    case 'personal_fit':
      return <Bagua c={c} a={a} />
    case 'flying_stars':
      return <Luoshu c={c} a={a} />
    case 'annual_directions':
      return <Dial c={c} a={a} />
    case 'remediation':
      return <Gourd c={c} a={a} />
    case 'auspicious_objects':
      return <Coin c={c} a={a} />
    default:
      return <Bagua c={c} a={a} />
  }
}

const SW = 2.4

/** 峦头 — layered mountain ridges, a 龙脉 crest, water below. */
function Landform({ c, a }: { c: string; a: string }) {
  return (
    <G fill='none' stroke={c} strokeWidth={SW} strokeLinecap='round' strokeLinejoin='round'>
      <Path d='M8 92 Q44 44 78 82 Q104 52 138 86 Q170 58 212 94' />
      <Path d='M8 110 Q52 80 92 104 Q128 84 160 106 Q186 92 212 110' opacity={0.55} />
      <Circle cx={170} cy={42} r={9} stroke={a} />
      <Path d='M8 132 Q40 124 72 132 T136 132 T212 132' stroke={a} opacity={0.7} />
    </G>
  )
}

/** 八宅 — the 八卦 octagon ring with eight directional ticks + 太极 center. */
function Bagua({ c, a }: { c: string; a: string }) {
  const cx = 110
  const cy = 75
  const r = 50
  const pts = Array.from({ length: 8 }, (_, i) => {
    const ang = (Math.PI / 4) * i - Math.PI / 2
    return `${(cx + r * Math.cos(ang)).toFixed(1)},${(cy + r * Math.sin(ang)).toFixed(1)}`
  }).join(' ')
  return (
    <G fill='none' stroke={c} strokeWidth={SW} strokeLinejoin='round'>
      <Polygon points={pts} />
      {Array.from({ length: 8 }, (_, i) => {
        const ang = (Math.PI / 4) * i - Math.PI / 2
        const x1 = cx + (r - 12) * Math.cos(ang)
        const y1 = cy + (r - 12) * Math.sin(ang)
        const x2 = cx + (r - 2) * Math.cos(ang)
        const y2 = cy + (r - 2) * Math.sin(ang)
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={SW * 1.4} />
      })}
      <Circle cx={cx} cy={cy} r={15} />
      <Path
        d={`M${cx} ${cy - 15} A7.5 7.5 0 0 1 ${cx} ${cy} A7.5 7.5 0 0 0 ${cx} ${cy + 15}`}
        fill={a}
        stroke='none'
      />
      <Circle cx={cx} cy={cy} r={15} stroke={a} />
    </G>
  )
}

/** 玄空 — the 洛书 nine-palace grid with the 5-yellow center marked in 朱砂. */
function Luoshu({ c, a }: { c: string; a: string }) {
  const x0 = 65
  const y0 = 15
  const cell = 40
  const cells = []
  for (let r = 0; r < 3; r++) {
    for (let col = 0; col < 3; col++) {
      const isCenter = r === 1 && col === 1
      cells.push(
        <G key={`${r}-${col}`}>
          <Rect
            x={x0 + col * cell}
            y={y0 + r * cell}
            width={cell}
            height={cell}
            rx={4}
            fill='none'
            stroke={c}
            strokeWidth={SW}
          />
          <Circle
            cx={x0 + col * cell + cell / 2}
            cy={y0 + r * cell + cell / 2}
            r={isCenter ? 6 : 3.5}
            fill={isCenter ? a : c}
          />
        </G>
      )
    }
  }
  return <G>{cells}</G>
}

/** 流年 — a 罗盘 dial with 24 ticks + a 朱砂 north pointer. */
function Dial({ c, a }: { c: string; a: string }) {
  const cx = 110
  const cy = 75
  const r = 56
  return (
    <G fill='none' stroke={c} strokeWidth={SW}>
      <Circle cx={cx} cy={cy} r={r} />
      <Circle cx={cx} cy={cy} r={r - 12} opacity={0.5} />
      {Array.from({ length: 24 }, (_, i) => {
        const ang = (Math.PI / 12) * i
        const major = i % 2 === 0
        const inner = r - (major ? 12 : 7)
        return (
          <Line
            key={i}
            x1={cx + inner * Math.cos(ang)}
            y1={cy + inner * Math.sin(ang)}
            x2={cx + r * Math.cos(ang)}
            y2={cy + r * Math.sin(ang)}
            strokeWidth={major ? SW : SW * 0.6}
          />
        )
      })}
      <Path
        d={`M${cx} ${cy - (r - 14)} L${cx - 6} ${cy} L${cx + 6} ${cy} Z`}
        fill={a}
        stroke='none'
      />
      <Circle cx={cx} cy={cy} r={3.5} fill={c} stroke='none' />
    </G>
  )
}

/** 化煞 — the 葫芦 (calabash), the classic remedy vessel, with a 朱砂 seal stroke. */
function Gourd({ c, a }: { c: string; a: string }) {
  const cx = 110
  return (
    <G fill='none' stroke={c} strokeWidth={SW} strokeLinecap='round' strokeLinejoin='round'>
      <Path
        d={`M${cx} 18 C97 18 95 30 104 36 C86 44 78 64 78 86 C78 116 96 134 ${cx} 134 C124 134 142 116 142 86 C142 64 134 44 116 36 C125 30 123 18 ${cx} 18 Z`}
      />
      <Line x1={88} y1={62} x2={132} y2={62} opacity={0.5} />
      <Path d={`M${cx} 74 L${cx} 104 M98 86 L122 86`} stroke={a} strokeWidth={SW * 1.2} />
    </G>
  )
}

/** 吉祥 — the 古钱 (round coin, square hole): wealth + heaven-and-earth. */
function Coin({ c, a }: { c: string; a: string }) {
  const cx = 110
  const cy = 75
  const r = 52
  const h = 17
  return (
    <G fill='none' strokeLinejoin='round'>
      <Circle cx={cx} cy={cy} r={r} stroke={c} strokeWidth={SW} />
      <Circle cx={cx} cy={cy} r={r - 9} stroke={c} strokeWidth={SW * 0.7} opacity={0.5} />
      <Rect x={cx - h} y={cy - h} width={h * 2} height={h * 2} rx={2} stroke={a} strokeWidth={SW} />
      {[
        [cx, cy - r + 9],
        [cx, cy + r - 9],
        [cx - r + 9, cy],
        [cx + r - 9, cy],
      ].map(([dx, dy], i) => (
        <Circle key={i} cx={dx} cy={dy} r={3} fill={c} />
      ))}
    </G>
  )
}
