/**
 * TimelineYearGraph — per-大运 流年 git spine + a PRO 流月 unlock.
 *
 * The git-graph timeline (token colour system): a vertical 流年 spine for the
 * selected 大运, each node coloured by its 干支 五行 (`wuxingGraph`, 金 = pewter),
 * 今 as the terra-accent TREATMENT (glow + ring), a 吉凶 verdict dot per year.
 * Tapping a year selects it — its 对你而言 reading renders BELOW the graph (no
 * floating popover; the old one overlapped the year column and only carried a
 * 流月 toggle, see 2026-06 feedback).
 *
 * 流年 is the finest grain by default. 流月 is a PRO unlock woven in as a git
 * SUB-BRANCH that peels off the 流年, runs its 12 months, and merges into the next
 * year (殊途同归) — the same weave make-if uses. For Pro, selecting a year opens
 * its 流月 directly (the caller toggles `liuyueOpen`); Free 流月 stays locked
 * behind the screen's main unlock CTA.
 *
 * Skia draws lines + nodes; labels + tap targets + popover are absolutely
 * positioned RN views in the same coordinate space.
 */

import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import { STEM_ELEMENT, wuxingGraph } from '@zhop/hexastral-tokens/palette'
import * as Haptics from 'expo-haptics'
import { Pressable, Text, View } from 'react-native'

import type { DrilldownYear } from '@/components/DrilldownGraph'
import type { LiuyueCell } from '@/lib/liuyue'

interface TGColors {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  bg: string
}

const TOP = 22
const ROW = 32 // 流年 row
const MROW = 22 // 流月 row (the weave)
const TRUNK_X = 44
const MLANE = TRUNK_X + 26 // 流月 sub-branch lane
const LX = 118 // 流年 labels start here

const ELEMENT_TO_KEY: Record<string, keyof typeof wuxingGraph> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
}
const wxFromChar = (el: string): string => wuxingGraph[ELEMENT_TO_KEY[el] ?? 'earth']
/** Node colour by the year's 干支 五行 (data hue). */
function gzColor(gz: string): string {
  const el = STEM_ELEMENT[gz[0] ?? '']
  return el ? wuxingGraph[el] : '#A0845C'
}

/** Halo'd node — dot | ring (ring = 今/selected/merge treatment). */
function GNode({
  x,
  y,
  r,
  color,
  bg,
  ring = false,
}: {
  x: number
  y: number
  r: number
  color: string
  bg: string
  ring?: boolean
}) {
  return (
    <Group>
      <Circle cx={x} cy={y} r={r + 2.5} color={bg} />
      {ring ? (
        <Group>
          <Circle cx={x} cy={y} r={r} color={bg} />
          <Circle cx={x} cy={y} r={r} color={color} style='stroke' strokeWidth={2} />
          <Circle cx={x} cy={y} r={Math.max(1.4, r - 3.4)} color={color} />
        </Group>
      ) : (
        <Circle cx={x} cy={y} r={r} color={color} />
      )}
    </Group>
  )
}

export function TimelineYearGraph({
  width,
  colors,
  dayunLabel,
  liunian,
  selectedYearIndex,
  onSelectYear,
  fitColor,
  nowLabel = '今',
  lang = 'zh',
  isPro,
  liuyue = null,
  liuyueOpen = false,
  selectedMonth = null,
  onSelectMonth,
}: {
  width: number
  colors: TGColors
  dayunLabel: string
  liunian: DrilldownYear[]
  selectedYearIndex: number | null
  onSelectYear: (index: number) => void
  fitColor: Record<'吉' | '平' | '凶', string>
  nowLabel?: string
  /** UI locale — 干支 only in zh; other languages show year + age. */
  lang?: string
  /** Pro gates the 流月 weave (selecting a year opens it). */
  isPro: boolean
  /** The selected year's 12 流月 (computed upstream), or null. */
  liuyue?: LiuyueCell[] | null
  /** Whether the selected year's 流月 sub-branch is woven open (Pro). */
  liuyueOpen?: boolean
  selectedMonth?: number | null
  onSelectMonth?: (month: number) => void
}) {
  const cjk = lang.startsWith('zh')
  // Layout — years at ROW; the selected year's 流月 (if open+Pro) insert MROW rows.
  const open = isPro && liuyueOpen && liuyue != null && selectedYearIndex != null
  let y = TOP
  const yearY: number[] = []
  const monthRows: { m: LiuyueCell; y: number }[] = []
  liunian.forEach((_l, i) => {
    yearY.push(y)
    y += ROW
    if (open && i === selectedYearIndex && liuyue) {
      for (const m of liuyue) {
        monthRows.push({ m, y })
        y += MROW
      }
    }
  })
  const bottom = Math.max(TOP, y - ROW)
  const height = y + 4

  const spine = Skia.Path.Make()
  spine.moveTo(TRUNK_X, TOP)
  spine.lineTo(TRUNK_X, bottom)

  // 流月 weave path: peel from the selected 流年 → lane → merge into the NEXT year.
  let weave: ReturnType<typeof Skia.Path.Make> | null = null
  let mergeY: number | null = null
  if (open && selectedYearIndex != null && monthRows.length) {
    const fY = yearY[selectedYearIndex] ?? TOP
    const firstM = monthRows[0]?.y ?? fY + MROW
    const lastM = monthRows[monthRows.length - 1]?.y ?? firstM
    const nextY = yearY[selectedYearIndex + 1] ?? lastM + MROW
    mergeY = nextY
    const p = Skia.Path.Make()
    p.moveTo(TRUNK_X, fY)
    p.cubicTo(MLANE, fY, MLANE, firstM - MROW * 0.4, MLANE, firstM)
    p.lineTo(MLANE, lastM)
    p.cubicTo(MLANE, nextY, (TRUNK_X + MLANE) / 2, nextY, TRUNK_X, nextY)
    weave = p
  }

  return (
    <View style={{ width, height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        <Path
          path={spine}
          style='stroke'
          strokeWidth={2.4}
          strokeCap='round'
          color={colors.separator}
        />
        {/* 流月 weave (Pro, when open) */}
        {weave ? (
          <Group>
            <Path
              path={weave}
              style='stroke'
              strokeWidth={1.8}
              strokeCap='round'
              strokeJoin='round'
              color={colors.accent}
              opacity={0.8}
            />
            {monthRows.map(({ m, y: my }) => (
              <Group key={`m-${m.month}`}>
                <Circle cx={MLANE} cy={my} r={5.5} color={colors.bg} />
                <Circle cx={MLANE} cy={my} r={3.2} color={wxFromChar(m.element)} />
              </Group>
            ))}
            {mergeY != null ? (
              <GNode x={TRUNK_X} y={mergeY} r={5} color={colors.accent} bg={colors.bg} ring />
            ) : null}
          </Group>
        ) : null}
        {/* 流年 nodes */}
        {liunian.map((l, i) => {
          const yy = yearY[i] ?? TOP
          const wc = gzColor(l.gz)
          if (l.isCurrent) {
            return (
              <Group key={l.year}>
                <Circle cx={TRUNK_X} cy={yy} r={13} color={colors.accent} opacity={0.16} />
                <GNode x={TRUNK_X} y={yy} r={6} color={colors.accent} bg={colors.bg} ring />
              </Group>
            )
          }
          if (i === selectedYearIndex) {
            return (
              <Group key={l.year}>
                <Circle cx={TRUNK_X} cy={yy} r={11} color={colors.accent} opacity={0.12} />
                <GNode x={TRUNK_X} y={yy} r={5} color={wc} bg={colors.bg} />
                <Circle
                  cx={TRUNK_X}
                  cy={yy}
                  r={8.5}
                  color={colors.accent}
                  style='stroke'
                  strokeWidth={1.6}
                  opacity={0.9}
                />
              </Group>
            )
          }
          return <GNode key={l.year} x={TRUNK_X} y={yy} r={4.5} color={wc} bg={colors.bg} />
        })}
      </Canvas>

      {/* 大运 label */}
      <Text
        style={{
          position: 'absolute',
          left: TRUNK_X + 12,
          top: TOP - 16,
          color: colors.secondary,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {dayunLabel}
      </Text>

      {/* 流年 labels + 吉凶 dot + tap target */}
      {liunian.map((l, i) => {
        const yy = yearY[i] ?? TOP
        const hot = l.isCurrent || i === selectedYearIndex
        return (
          <Pressable
            key={l.year}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {})
              onSelectYear(i)
            }}
            accessibilityRole='button'
            accessibilityLabel={`${l.gz} ${l.year}`}
            style={{
              position: 'absolute',
              left: 0,
              top: yy - ROW / 2,
              right: 0,
              height: ROW,
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: LX }}>
              <Text
                style={{
                  color: hot ? colors.text : colors.secondary,
                  fontSize: 15,
                  fontWeight: hot ? '700' : '400',
                }}
              >
                {cjk ? l.gz : l.year}
              </Text>
              <Text style={{ color: l.isCurrent ? colors.accent : colors.dim, fontSize: 11 }}>
                {cjk ? l.year : l.age != null ? `${l.age}${lang === 'ja' ? '歳' : ''}` : ''}
              </Text>
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: fitColor[l.fit] ?? colors.dim,
                }}
              />
              {l.isCurrent ? (
                <Text style={{ color: colors.accent, fontSize: 10, fontWeight: '600' }}>
                  {nowLabel}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}

      {/* 流月 labels (when woven open) */}
      {open
        ? monthRows.map(({ m, y: my }) => {
            const hotM = selectedMonth === m.month
            return (
              <Pressable
                key={`ml-${m.month}`}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  onSelectMonth?.(m.month)
                }}
                accessibilityRole='button'
                accessibilityLabel={`${m.label}月 ${m.stem}${m.branch}`}
                style={{
                  position: 'absolute',
                  left: MLANE + 12,
                  top: my - MROW / 2,
                  right: 0,
                  height: MROW,
                  justifyContent: 'center',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={{
                      color: hotM ? colors.text : colors.secondary,
                      fontSize: 12,
                      fontWeight: hotM ? '600' : '400',
                    }}
                  >
                    {cjk ? `${m.label}月 ${m.stem}${m.branch}` : `M${m.month}`}
                  </Text>
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      backgroundColor: fitColor[m.fit] ?? colors.dim,
                    }}
                  />
                </View>
              </Pressable>
            )
          })
        : null}
    </View>
  )
}
