/**
 * LuopanDial — the brand's 罗盘 内盘 (the rotating plate of a real luopan).
 *
 * Modeled on an actual 风水罗盘 (cf. the reference plate): concentric 层 in gold
 * on near-black lacquer — 二十四山 (radial) · 八卦界 dividers · 二十四节气 ticks ·
 * 后天八卦 卦象 · 六十四卦 ticks · 先天八卦 卦象 · and a small 天池 well carrying
 * ONLY the canonical 海底十字红线. There is NO magnetic "needle" — that big red
 * pointer was never part of a luopan. The 天心十道 alignment threads are drawn
 * (fixed, in gold) by the loader/intro over this rotating plate. No Skia.
 */

import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg'

const VB = 240
const CX = 120
const CY = 120

const MOUNTAINS = '子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬'.split('')
// 后天八卦 from the top, clockwise: 坎 艮 震 巽 离 坤 兑 乾
const HOUTIAN = ['☵', '☶', '☳', '☴', '☲', '☷', '☱', '☰']
// 先天八卦 from the top, clockwise: 乾 巽 坎 艮 坤 震 离 兑
const XIANTIAN = ['☰', '☴', '☵', '☶', '☷', '☳', '☲', '☱']

interface LuopanDialProps {
  size?: number
  gold?: string
  goldFaint?: string
  /** The 海底十字红线 in the 天池 — the only red on the plate. */
  accent?: string
  pool?: string
  ground?: string
}

export function LuopanDial({
  size = 240,
  gold = '#C2A15E',
  goldFaint = 'rgba(194,161,94,0.5)',
  accent = '#9B2226',
  pool = '#0D171B',
  ground = '#0A1316',
}: LuopanDialProps) {
  const faintFill = 'rgba(194,161,94,0.05)'
  const goldStrong = 'rgba(194,161,94,0.8)'

  const radial = (
    x: number,
    y: number,
    deg: number,
    s: string,
    fontSize: number,
    opacity = 1
  ) => (
    <SvgText
      x={x}
      y={y}
      fontSize={fontSize}
      fill={gold}
      opacity={opacity}
      textAnchor='middle'
      alignmentBaseline='central'
      transform={`rotate(${deg} ${x} ${y})`}
    >
      {s}
    </SvgText>
  )

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* lacquer bands for depth */}
      <Circle cx={CX} cy={CY} r={116} fill={faintFill} />
      <Circle cx={CX} cy={CY} r={100} fill={ground} />
      <Circle cx={CX} cy={CY} r={40} fill={faintFill} />

      {/* concentric 层 rules */}
      <Circle cx={CX} cy={CY} r={118} fill='none' stroke={goldFaint} strokeWidth={1} />
      <Circle cx={CX} cy={CY} r={100} fill='none' stroke={goldFaint} strokeWidth={1} />
      <Circle cx={CX} cy={CY} r={88} fill='none' stroke={goldFaint} strokeWidth={0.8} />
      <Circle cx={CX} cy={CY} r={72} fill='none' stroke={goldFaint} strokeWidth={0.8} />
      <Circle cx={CX} cy={CY} r={58} fill='none' stroke={goldFaint} strokeWidth={0.8} />
      <Circle cx={CX} cy={CY} r={40} fill='none' stroke={goldFaint} strokeWidth={1} />

      {/* 二十四山 ticks */}
      <G>
        {MOUNTAINS.map((_, i) => {
          const a = ((-90 + i * 15 + 7.5) * Math.PI) / 180
          return (
            <Line
              key={`t-${i}`}
              x1={CX + 100 * Math.cos(a)}
              y1={CY + 100 * Math.sin(a)}
              x2={CX + 118 * Math.cos(a)}
              y2={CY + 118 * Math.sin(a)}
              stroke={goldFaint}
              strokeWidth={0.4}
            />
          )
        })}
      </G>

      {/* 八卦界 — 8 heavier dividers (group 24山 into 卦) */}
      <G>
        {HOUTIAN.map((_, k) => {
          const a = ((-90 + 22.5 + 45 * k) * Math.PI) / 180
          return (
            <Line
              key={`b-${k}`}
              x1={CX + 22 * Math.cos(a)}
              y1={CY + 22 * Math.sin(a)}
              x2={CX + 118 * Math.cos(a)}
              y2={CY + 118 * Math.sin(a)}
              stroke={goldStrong}
              strokeWidth={0.8}
            />
          )
        })}
      </G>

      {/* 二十四山 characters (radial) */}
      <G>
        {MOUNTAINS.map((ch, i) => {
          const deg = i * 15
          const a = ((-90 + deg) * Math.PI) / 180
          return radial(CX + 109 * Math.cos(a), CY + 109 * Math.sin(a), deg, ch, 9, 0.88)
        })}
      </G>

      {/* 二十四节气 ticks */}
      <G>
        {MOUNTAINS.map((_, i) => {
          const a = ((-90 + i * 15) * Math.PI) / 180
          return (
            <Line
              key={`jq-${i}`}
              x1={CX + 88 * Math.cos(a)}
              y1={CY + 88 * Math.sin(a)}
              x2={CX + 100 * Math.cos(a)}
              y2={CY + 100 * Math.sin(a)}
              stroke={goldFaint}
              strokeWidth={0.35}
            />
          )
        })}
      </G>

      {/* 后天八卦 卦象 */}
      <G>
        {HOUTIAN.map((sym, i) => {
          const deg = i * 45
          const a = ((-90 + deg) * Math.PI) / 180
          return radial(CX + 80 * Math.cos(a), CY + 80 * Math.sin(a), deg, sym, 12)
        })}
      </G>

      {/* 六十四卦 density ticks */}
      <G>
        {Array.from({ length: 64 }, (_, i) => {
          const a = ((-90 + i * 5.625) * Math.PI) / 180
          return (
            <Line
              key={`h-${i}`}
              x1={CX + 58 * Math.cos(a)}
              y1={CY + 58 * Math.sin(a)}
              x2={CX + 72 * Math.cos(a)}
              y2={CY + 72 * Math.sin(a)}
              stroke={goldFaint}
              strokeWidth={0.3}
            />
          )
        })}
      </G>

      {/* 先天八卦 卦象 (inner) */}
      <G>
        {XIANTIAN.map((sym, i) => {
          const deg = i * 45
          const a = ((-90 + deg) * Math.PI) / 180
          return radial(CX + 49 * Math.cos(a), CY + 49 * Math.sin(a), deg, sym, 10, 0.85)
        })}
      </G>

      {/* 天池 well + 海底十字红线 (the only red on the plate) */}
      <Circle cx={CX} cy={CY} r={22} fill={pool} />
      <Circle cx={CX} cy={CY} r={22} fill='none' stroke={gold} strokeWidth={1} />
      <Line x1={CX - 18} y1={CY} x2={CX + 18} y2={CY} stroke={accent} strokeWidth={0.8} opacity={0.55} />
      <Line x1={CX} y1={CY - 18} x2={CX} y2={CY + 18} stroke={accent} strokeWidth={0.8} opacity={0.55} />
    </Svg>
  )
}
