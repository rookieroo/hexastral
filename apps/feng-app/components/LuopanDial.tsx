/**
 * LuopanDial — the brand's 罗盘 内盘 (the rotating plate of a real luopan).
 *
 * Zinc-themed (neutral on near-black lacquer), no Skia. `detail` scales density
 * so one component serves a 96px loader and a 300px instrument:
 *   minimal   — lacquer + rules + 八卦界 + 天池 (loaders / tiny sizes)
 *   standard  — the classic 内盘 (onboarding / transition)
 *   full      — a comprehensive 综合盘 faithfully modeled on a real 罗盘: a 360°
 *               degree ring · 二十八宿 (宿度) · 六十四卦 图 + 名 · 二十四山 (五行) ·
 *               后天八卦 · 卦象 · 先天八卦 + 方位 · 天池 needle + 海底十字.
 * A tiny size floors to 'minimal', so detail + size compose.
 */

import Svg, { Circle, G, Line, Path, Polygon, Text as SvgText } from 'react-native-svg'

const MOUNTAINS = '子癸丑艮寅甲卯乙辰巽巳丙午丁未坤申庚酉辛戌乾亥壬'.split('')
const MT_WX = ['水','水','土','土','木','木','木','木','土','木','火','火','火','火','土','土','金','金','金','金','土','金','水','水'] // biome-ignore format: aligned to MOUNTAINS
const WX_OP: Record<string, number> = { 金: 1, 水: 0.86, 木: 0.74, 火: 0.62, 土: 0.5 }
// 后天八卦 from the top (子), clockwise: 坎 艮 震 巽 离 坤 兑 乾
const HOUTIAN = ['☵', '☶', '☳', '☴', '☲', '☷', '☱', '☰']
const HOU_NAME = ['坎', '艮', '震', '巽', '离', '坤', '兑', '乾']
// 先天八卦 by angle (北上): 坤N 震NE 离E 兑SE 乾S 巽SW 坎W 艮NW
const XIANTIAN = ['☷', '☳', '☲', '☱', '☰', '☴', '☵', '☶']
const FANGWEI = ['北', '東北', '東', '東南', '南', '西南', '西', '西北']

// 二十八宿 (name, 七曜五行, 宿度) — 明清通行
const XIU: ReadonlyArray<readonly [string, string, number]> = [
  ['角', '木', 12],
  ['亢', '金', 9],
  ['氐', '土', 15],
  ['房', '日', 5],
  ['心', '月', 5],
  ['尾', '火', 18],
  ['箕', '水', 11],
  ['斗', '木', 26],
  ['牛', '金', 8],
  ['女', '土', 12],
  ['虚', '日', 9],
  ['危', '月', 16],
  ['室', '火', 18],
  ['壁', '水', 9],
  ['奎', '木', 18],
  ['娄', '金', 12],
  ['胃', '土', 15],
  ['昴', '日', 11],
  ['毕', '月', 16],
  ['觜', '火', 1],
  ['参', '水', 9],
  ['井', '木', 30],
  ['鬼', '金', 3],
  ['柳', '土', 15],
  ['星', '日', 7],
  ['张', '月', 18],
  ['翼', '火', 18],
  ['轸', '水', 17],
]

// 六十四卦 — derive figures from names; build the 先天圆图 as 阳半 + its 错卦 (bit-complement).
const TRI: Record<string, number[]> = {
  乾: [1, 1, 1],
  兑: [1, 1, 0],
  离: [1, 0, 1],
  震: [1, 0, 0],
  巽: [0, 1, 1],
  坎: [0, 1, 0],
  艮: [0, 0, 1],
  坤: [0, 0, 0],
}
const TORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤']
const HEX = [
  ['乾', '履', '同人', '无妄', '姤', '讼', '遯', '否'],
  ['夬', '兑', '革', '随', '大过', '困', '咸', '萃'],
  ['大有', '睽', '离', '噬嗑', '鼎', '未济', '旅', '晋'],
  ['大壮', '归妹', '丰', '震', '恒', '解', '小过', '豫'],
  ['小畜', '中孚', '家人', '益', '巽', '涣', '渐', '观'],
  ['需', '节', '既济', '屯', '井', '坎', '蹇', '比'],
  ['大畜', '损', '贲', '颐', '蛊', '蒙', '艮', '谦'],
  ['泰', '临', '明夷', '复', '升', '师', '剥', '坤'],
]
const NAME2UL: Record<string, [string, string]> = {}
const BITS2TRI: Record<string, string> = {}
for (let u = 0; u < 8; u++)
  for (let l = 0; l < 8; l++) NAME2UL[HEX[u]?.[l] ?? ''] = [TORDER[u] ?? '', TORDER[l] ?? '']
for (const [nm, b] of Object.entries(TRI)) BITS2TRI[b.join('')] = nm
function hexBits(name: string): number[] {
  const [u, l] = NAME2UL[name] ?? ['乾', '乾']
  return [...(TRI[l] ?? []), ...(TRI[u] ?? [])] // 初..上 (inner→outer)
}
function bitsName(bits: number[]): string {
  const lower = BITS2TRI[bits.slice(0, 3).join('')] ?? '乾'
  const upper = BITS2TRI[bits.slice(3, 6).join('')] ?? '乾'
  return HEX[TORDER.indexOf(upper)]?.[TORDER.indexOf(lower)] ?? '乾'
}
const YANG = ['复','颐','屯','益','震','噬嗑','随','无妄','明夷','贲','既济','家人','丰','离','革','同人','临','损','节','中孚','归妹','睽','兑','履','泰','大畜','需','小畜','大壮','大有','夬','乾'] // biome-ignore format: 先天圆图 阳半
const CIRCLE = [...YANG, ...YANG.map((n) => bitsName(hexBits(n).map((x) => 1 - x)))]

export type LuopanTone = 'dark' | 'paper'
export type LuopanDetail = 'minimal' | 'standard' | 'full'
export type LuopanVariant = 'loader' | 'transition' | 'onboarding' | 'compass'

const VARIANT_DETAIL: Record<LuopanVariant, LuopanDetail> = {
  loader: 'minimal',
  transition: 'standard',
  onboarding: 'standard',
  compass: 'full',
}

interface LuopanDialProps {
  size?: number
  tone?: LuopanTone
  /** Explicit layer density. Overrides `variant`. Floors to 'minimal' when tiny. */
  detail?: LuopanDetail
  /** Convenience: maps a call-site role to a detail level. */
  variant?: LuopanVariant
}

const TONES: Record<
  LuopanTone,
  {
    gold: string
    goldFaint: string
    goldStrong: string
    faintFill: string
    accent: string
    pool: string
    ground: string
  }
> = {
  dark: {
    gold: '#D4D4D8',
    goldFaint: 'rgba(228,228,231,0.5)',
    goldStrong: 'rgba(228,228,231,0.8)',
    faintFill: 'rgba(228,228,231,0.05)',
    accent: '#B4726E',
    pool: '#18181B',
    ground: '#18181B',
  },
  paper: {
    gold: '#71717A',
    goldFaint: 'rgba(228,228,231,0.55)',
    goldStrong: 'rgba(228,228,231,0.85)',
    faintFill: 'rgba(228,228,231,0.06)',
    accent: '#B4726E',
    pool: '#F4F4F5',
    ground: '#F4F4F5',
  },
}

export function LuopanDial({ size = 240, tone = 'dark', detail, variant }: LuopanDialProps) {
  const requested: LuopanDetail = detail ?? (variant ? VARIANT_DETAIL[variant] : 'standard')
  const level: LuopanDetail = size < 120 ? 'minimal' : requested
  if (level === 'full') return <FullLuopan size={size} />

  const dense = level !== 'minimal'
  const { gold, goldFaint, goldStrong, faintFill, accent, pool, ground } = TONES[tone]
  const VB = 240
  const C = VB / 2
  const rad = (key: string, x: number, y: number, deg: number, s: string, fs: number, op = 1) => (
    <SvgText
      key={key}
      x={x}
      y={y}
      fontSize={fs}
      fill={gold}
      opacity={op}
      textAnchor='middle'
      alignmentBaseline='central'
      transform={`rotate(${deg} ${x} ${y})`}
    >
      {s}
    </SvgText>
  )

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      <Circle cx={C} cy={C} r={116} fill={faintFill} />
      <Circle cx={C} cy={C} r={100} fill={ground} />
      <Circle cx={C} cy={C} r={40} fill={faintFill} />
      <Circle cx={C} cy={C} r={118} fill='none' stroke={goldFaint} strokeWidth={1} />
      <Circle cx={C} cy={C} r={40} fill='none' stroke={goldFaint} strokeWidth={1} />
      {dense ? (
        <>
          <Circle cx={C} cy={C} r={100} fill='none' stroke={goldFaint} strokeWidth={1} />
          <Circle cx={C} cy={C} r={88} fill='none' stroke={goldFaint} strokeWidth={0.8} />
          <Circle cx={C} cy={C} r={72} fill='none' stroke={goldFaint} strokeWidth={0.8} />
          <Circle cx={C} cy={C} r={58} fill='none' stroke={goldFaint} strokeWidth={0.8} />
        </>
      ) : null}
      <G>
        {HOUTIAN.map((_, k) => {
          const a = ((-90 + 22.5 + 45 * k) * Math.PI) / 180
          return (
            <Line
              key={`b-${k}`}
              x1={C + 22 * Math.cos(a)}
              y1={C + 22 * Math.sin(a)}
              x2={C + 118 * Math.cos(a)}
              y2={C + 118 * Math.sin(a)}
              stroke={goldStrong}
              strokeWidth={0.8}
            />
          )
        })}
      </G>
      {dense ? (
        <>
          <G>
            {MOUNTAINS.map((_, i) => {
              const a = ((-90 + i * 15 + 7.5) * Math.PI) / 180
              return (
                <Line
                  key={`t-${i}`}
                  x1={C + 100 * Math.cos(a)}
                  y1={C + 100 * Math.sin(a)}
                  x2={C + 118 * Math.cos(a)}
                  y2={C + 118 * Math.sin(a)}
                  stroke={goldFaint}
                  strokeWidth={0.4}
                />
              )
            })}
          </G>
          <G>
            {MOUNTAINS.map((ch, i) => {
              const deg = i * 15
              const a = ((-90 + deg) * Math.PI) / 180
              const op = Math.max(0.6, WX_OP[MT_WX[i] ?? '土'] ?? 0.88)
              return rad(`m-${i}`, C + 109 * Math.cos(a), C + 109 * Math.sin(a), deg, ch, 9, op)
            })}
          </G>
          <G>
            {HOUTIAN.map((sym, i) => {
              const deg = i * 45
              const a = ((-90 + deg) * Math.PI) / 180
              return rad(`hou-${i}`, C + 80 * Math.cos(a), C + 80 * Math.sin(a), deg, sym, 12)
            })}
          </G>
          <G>
            {XIANTIAN.map((sym, i) => {
              const deg = i * 45
              const a = ((-90 + deg) * Math.PI) / 180
              return rad(
                `xian-${i}`,
                C + 49 * Math.cos(a),
                C + 49 * Math.sin(a),
                deg,
                sym,
                10,
                0.85
              )
            })}
          </G>
        </>
      ) : null}
      <Circle cx={C} cy={C} r={22} fill={pool} />
      <Circle cx={C} cy={C} r={22} fill='none' stroke={gold} strokeWidth={1} />
      <Line
        x1={C - 18}
        y1={C}
        x2={C + 18}
        y2={C}
        stroke={accent}
        strokeWidth={0.8}
        opacity={0.55}
      />
      <Line
        x1={C}
        y1={C - 18}
        x2={C}
        y2={C + 18}
        stroke={accent}
        strokeWidth={0.8}
        opacity={0.55}
      />
    </Svg>
  )
}

// ── FULL 综合盘 (the Compass instrument) ─────────────────────────────────────
const FP = {
  plate: '#0B0B0D',
  band: '#C7C7CD',
  bandInk: '#141417',
  band2: '#1A1A1E',
  bright: '#ECECEE',
  mid: '#B4B4BA',
  dim: '#8A8A92',
  ring: 'rgba(228,228,231,0.42)',
  ringStrong: 'rgba(228,228,231,0.78)',
  rose: '#C08A86',
  roseDim: 'rgba(197,150,146,0.95)',
}

function FullLuopan({ size }: { size: number }) {
  const VB = 460
  const C = VB / 2
  const px = (r: number, deg: number) => C + r * Math.cos(((deg - 90) * Math.PI) / 180)
  const py = (r: number, deg: number) => C + r * Math.sin(((deg - 90) * Math.PI) / 180)
  const rt = (
    key: string,
    r: number,
    deg: number,
    s: string,
    fs: number,
    fill: string,
    op = 1,
    w = 400
  ) => {
    const x = px(r, deg)
    const y = py(r, deg)
    return (
      <SvgText
        key={key}
        x={x}
        y={y}
        fontSize={fs}
        fill={fill}
        opacity={op}
        fontWeight={w}
        textAnchor='middle'
        alignmentBaseline='central'
        transform={`rotate(${deg} ${x} ${y})`}
      >
        {s}
      </SvgText>
    )
  }
  const donut = (rOut: number, rIn: number, fill: string) => (
    <Path
      fill={fill}
      fillRule='evenodd'
      d={`M ${C - rOut} ${C} A ${rOut} ${rOut} 0 1 0 ${C + rOut} ${C} A ${rOut} ${rOut} 0 1 0 ${C - rOut} ${C} Z M ${C - rIn} ${C} A ${rIn} ${rIn} 0 1 1 ${C + rIn} ${C} A ${rIn} ${rIn} 0 1 1 ${C - rIn} ${C} Z`}
    />
  )
  const els: React.ReactNode[] = []

  // 1. degree ring + numerals (2° ticks for RN perf)
  els.push(
    <Circle key='dr1' cx={C} cy={C} r={216} fill='none' stroke={FP.ring} strokeWidth={0.8} />
  )
  els.push(
    <Circle key='dr2' cx={C} cy={C} r={224} fill='none' stroke={FP.ring} strokeWidth={0.8} />
  )
  for (let d = 0; d < 360; d += 2) {
    const major = d % 10 === 0
    const r0 = major ? 208 : 213
    els.push(
      <Line
        key={`dt-${d}`}
        x1={px(r0, d)}
        y1={py(r0, d)}
        x2={px(216, d)}
        y2={py(216, d)}
        stroke={major ? FP.ringStrong : FP.ring}
        strokeWidth={major ? 0.7 : 0.3}
      />
    )
  }
  for (let d = 0; d < 360; d += 10) els.push(rt(`dn-${d}`, 220, d, String(d), 7, FP.bright, 0.9))

  // 2. 二十八宿 (by 宿度)
  els.push(<Circle key='xr' cx={C} cy={C} r={198} fill='none' stroke={FP.ring} strokeWidth={0.7} />)
  const tot = XIU.reduce((a, x) => a + x[2], 0)
  let acc = 0
  for (const [nm, wx, deg] of XIU) {
    const start = (acc / tot) * 360
    const mid = start + ((deg / tot) * 360) / 2
    acc += deg
    els.push(
      <Line
        key={`xb-${nm}`}
        x1={px(178, start)}
        y1={py(178, start)}
        x2={px(198, start)}
        y2={py(198, start)}
        stroke={FP.ring}
        strokeWidth={0.4}
      />
    )
    els.push(rt(`xn-${nm}`, 192, mid, nm, 8, FP.roseDim, 0.92, 600))
    els.push(rt(`xd-${nm}`, 183, mid, `${deg}${wx}`, 5, FP.dim, 0.85))
  }

  // 3. 六十四卦 figures (初 inner → 上 outer)
  els.push(
    <Circle key='hf1' cx={C} cy={C} r={178} fill='none' stroke={FP.ring} strokeWidth={0.6} />
  )
  els.push(
    <Circle key='hf2' cx={C} cy={C} r={150} fill='none' stroke={FP.ring} strokeWidth={0.6} />
  )
  const step = 360 / 64
  for (let i = 0; i < 64; i++) {
    const deg = i * step + step / 2
    const bits = hexBits(CIRCLE[i] ?? '乾')
    for (let b = 0; b < 6; b++) {
      const rr = 153 + b * 4.2
      if (bits[b]) {
        els.push(
          <Line
            key={`h-${i}-${b}`}
            x1={px(rr, deg - 1.9)}
            y1={py(rr, deg - 1.9)}
            x2={px(rr, deg + 1.9)}
            y2={py(rr, deg + 1.9)}
            stroke={FP.bright}
            strokeWidth={2.1}
          />
        )
      } else {
        els.push(
          <Line
            key={`h-${i}-${b}-a`}
            x1={px(rr, deg - 1.9)}
            y1={py(rr, deg - 1.9)}
            x2={px(rr, deg - 0.55)}
            y2={py(rr, deg - 0.55)}
            stroke={FP.bright}
            strokeWidth={2.1}
          />
        )
        els.push(
          <Line
            key={`h-${i}-${b}-b`}
            x1={px(rr, deg + 0.55)}
            y1={py(rr, deg + 0.55)}
            x2={px(rr, deg + 1.9)}
            y2={py(rr, deg + 1.9)}
            stroke={FP.bright}
            strokeWidth={2.1}
          />
        )
      }
    }
  }

  // 4. 六十四卦 names
  els.push(<Circle key='hn' cx={C} cy={C} r={132} fill='none' stroke={FP.ring} strokeWidth={0.6} />)
  for (let i = 0; i < 64; i++)
    els.push(rt(`hnm-${i}`, 141, i * step + step / 2, CIRCLE[i] ?? '', 5.4, FP.mid, 0.9))

  // 5. 二十四山 bright band
  els.push(<G key='m24band'>{donut(132, 108, FP.band)}</G>)
  els.push(
    <Circle key='mb1' cx={C} cy={C} r={132} fill='none' stroke={FP.ringStrong} strokeWidth={0.9} />
  )
  els.push(
    <Circle key='mb2' cx={C} cy={C} r={108} fill='none' stroke={FP.ringStrong} strokeWidth={0.8} />
  )
  for (let i = 0; i < 24; i++) {
    const deg = i * 15
    els.push(rt(`m-${i}`, 120, deg, MOUNTAINS[i] ?? '', 13, FP.bandInk, 1, 800))
    els.push(
      <Line
        key={`mt-${i}`}
        x1={px(108, deg - 7.5)}
        y1={py(108, deg - 7.5)}
        x2={px(132, deg - 7.5)}
        y2={py(132, deg - 7.5)}
        stroke='rgba(20,20,23,0.35)'
        strokeWidth={0.5}
      />
    )
  }

  // 6. 后天八卦 names band
  els.push(<G key='hou8band'>{donut(108, 86, FP.band2)}</G>)
  els.push(<Circle key='hb' cx={C} cy={C} r={86} fill='none' stroke={FP.ring} strokeWidth={0.7} />)
  for (let k = 0; k < 8; k++) {
    const deg = k * 45
    els.push(rt(`houn-${k}`, 97, deg, HOU_NAME[k] ?? '', 15, FP.bright, 0.95, 700))
    els.push(
      <Line
        key={`hd-${k}`}
        x1={px(46, deg - 22.5)}
        y1={py(46, deg - 22.5)}
        x2={px(108, deg - 22.5)}
        y2={py(108, deg - 22.5)}
        stroke={FP.ringStrong}
        strokeWidth={0.7}
      />
    )
  }

  // 7. 后天八卦 卦象
  for (let k = 0; k < 8; k++)
    els.push(rt(`hous-${k}`, 74, k * 45, HOUTIAN[k] ?? '', 20, FP.bright, 0.9))
  els.push(
    <Circle key='tr64' cx={C} cy={C} r={64} fill='none' stroke={FP.ring} strokeWidth={0.7} />
  )

  // 8. 先天八卦 + 方位
  for (let k = 0; k < 8; k++) {
    const deg = k * 45
    els.push(rt(`xians-${k}`, 56, deg, XIANTIAN[k] ?? '', 12, FP.mid, 0.85))
    els.push(rt(`fw-${k}`, 47, deg, FANGWEI[k] ?? '', 5.5, FP.dim, 0.85))
  }
  els.push(
    <Circle key='tc40' cx={C} cy={C} r={40} fill='none' stroke={FP.ring} strokeWidth={0.8} />
  )

  // 9. 天池 + needle + 海底十字
  els.push(
    <Circle key='pool' cx={C} cy={C} r={30} fill='#0E0E11' stroke={FP.ringStrong} strokeWidth={1} />
  )
  for (const [lbl, d] of [
    ['N', 0],
    ['E', 90],
    ['S', 180],
    ['W', 270],
  ] as const)
    els.push(rt(`c-${lbl}`, 24, d, lbl, 6.5, FP.mid, 0.8, 600))
  els.push(
    <Line
      key='nd'
      x1={px(18, 180)}
      y1={py(18, 180)}
      x2={px(18, 0)}
      y2={py(18, 0)}
      stroke={FP.mid}
      strokeWidth={1.4}
    />
  )
  els.push(
    <Polygon
      key='ndp'
      points={`${px(18, 0)},${py(18, 0)} ${px(6, -6)},${py(6, -6)} ${px(6, 6)},${py(6, 6)}`}
      fill={FP.rose}
    />
  )
  els.push(<Circle key='ndc' cx={C} cy={C} r={2.4} fill={FP.bright} />)
  els.push(
    <Line
      key='cross-v'
      x1={C}
      y1={6}
      x2={C}
      y2={VB - 6}
      stroke={FP.rose}
      strokeWidth={0.9}
      opacity={0.55}
    />
  )
  els.push(
    <Line
      key='cross-h'
      x1={6}
      y1={C}
      x2={VB - 6}
      y2={C}
      stroke={FP.rose}
      strokeWidth={0.9}
      opacity={0.55}
    />
  )

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      <Circle cx={C} cy={C} r={C - 4} fill={FP.plate} stroke={FP.ringStrong} strokeWidth={1.4} />
      {els}
    </Svg>
  )
}
