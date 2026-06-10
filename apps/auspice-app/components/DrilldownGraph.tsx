/**
 * DrilldownGraph — the focused life graph for ONE 大运.
 *
 * The whole-life timeline read "long + no focus", so we drill: the screen picks a
 * 大运 (≈10 years) and this draws its 流年 as a git spine. Tap a 流年 and that
 * year's 流月 draws in as a sub-lane, joined by a 月相 (moon) emblem that marks the
 * year→month dimension jump (流年/流月 aren't the same axis, so the link is a moon,
 * not another git line). now = HEAD at both levels.
 *
 * Skia Canvas draws the lines + nodes + moon; labels + tap targets are absolutely
 * positioned RN views in the same coordinate space (same split as TimelineGraph).
 * The 流月 reveal animates via a path-trim `progress` (0→1) — the `end` primitive
 * the other graphs already use.
 */

import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia'
import * as Haptics from 'expo-haptics'
import { useEffect, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSharedValue, withTiming } from 'react-native-reanimated'

import type { LiuyueCell } from '@/lib/liuyue'

interface DGColors {
  text: string
  secondary: string
  dim: string
  accent: string
  separator: string
  bg: string
}

export interface DrilldownYear {
  gz: string
  year: number
  fit: '吉' | '平' | '凶'
  isCurrent: boolean
  /** Age that year — shown instead of 干支 in non-zh UIs (干支 is opaque abroad). */
  age?: number
  /** 五行 of the year stem (五行 char) — for the denser 流年 popover. */
  element?: string
  /** 十神 of the year vs the day master — the relation that year carries. */
  shishen?: string
  /** 神煞 / interaction chip (optional). */
  tag?: string
}

const TOP = 28
const TRUNK_X = 40 // 流年 spine x
const ROW = 38 // 流年 row height
const LANE_X = 234 // 流月 sub-lane x
const SUBROW = 26 // 流月 row height

/** A bg-haloed node; ring (with centre dot) for HEAD/peel, else a filled dot. */
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

export function DrilldownGraph({
  width,
  colors,
  domainColor,
  dayunLabel,
  liunian,
  selectedYearIndex,
  liuyue,
  liuyueNowMonth,
  selectedMonth,
  onSelectYear,
  onSelectMonth,
  fitColor,
}: {
  width: number
  colors: DGColors
  /** The selected 大运's 十神-domain hue (drives the spine + nodes). */
  domainColor: string
  /** e.g. "乙巳 大运". */
  dayunLabel: string
  liunian: DrilldownYear[]
  selectedYearIndex: number | null
  /** 12 月柱 of the selected 流年 (computed client-side), or null. */
  liuyue: LiuyueCell[] | null
  /** 1..12 to highlight the current month (when the selected 流年 is this year). */
  liuyueNowMonth: number | null
  /** 1..12 of the tapped 流月 (drives its popover), or null. */
  selectedMonth: number | null
  onSelectYear: (index: number) => void
  onSelectMonth?: (month: number) => void
  fitColor: Record<'吉' | '平' | '凶', string>
}) {
  const yOf = (i: number) => TOP + ROW + i * ROW // 大运 head sits at TOP; 流年 below
  const laneBottom = yOf(liunian.length - 1)
  const hasMonths = selectedYearIndex != null && liuyue != null
  const sy = selectedYearIndex != null ? yOf(selectedYearIndex) : 0
  const subBottom = hasMonths ? sy + (liuyue.length - 1) * SUBROW : 0
  const height = Math.max(laneBottom, subBottom) + 28

  const spinePath = useMemo(() => {
    const p = Skia.Path.Make()
    p.moveTo(TRUNK_X, TOP)
    p.lineTo(TRUNK_X, laneBottom)
    return p
  }, [laneBottom])

  // 流月 reveal — connector + sub-lane draw in on each 流年 selection.
  const moonX = (TRUNK_X + LANE_X) / 2
  const connectorPath = useMemo(() => {
    if (!hasMonths) return null
    const p = Skia.Path.Make()
    p.moveTo(TRUNK_X + 7, sy)
    p.lineTo(moonX - 11, sy)
    p.moveTo(moonX + 11, sy)
    p.lineTo(LANE_X, sy)
    return p
  }, [hasMonths, sy, moonX])
  const subSpinePath = useMemo(() => {
    if (!hasMonths || !liuyue) return null
    const p = Skia.Path.Make()
    p.moveTo(LANE_X, sy)
    p.lineTo(LANE_X, sy + (liuyue.length - 1) * SUBROW)
    return p
  }, [hasMonths, liuyue, sy])

  const progress = useSharedValue(0)
  useEffect(() => {
    progress.value = 0
    if (hasMonths) progress.value = withTiming(1, { duration: 650 })
  }, [progress, hasMonths])
  // Re-key the reveal on which year is selected so it re-draws each tap.
  // (selectedYearIndex in the dep below drives the reset.)
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run on year change
  useEffect(() => {
    if (hasMonths) {
      progress.value = 0
      progress.value = withTiming(1, { duration: 650 })
    }
  }, [selectedYearIndex])

  return (
    <View style={{ width, height }}>
      <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height }}>
        {/* 大运 spine (流年 commits ride it) */}
        <Path
          path={spinePath}
          style='stroke'
          strokeWidth={2.2}
          strokeCap='round'
          color={domainColor}
          opacity={0.9}
        />
        {/* 大运 head — ring + dot */}
        <GNode x={TRUNK_X} y={TOP} r={5.5} color={domainColor} bg={colors.bg} ring />

        {/* 流月 reveal: moon-linked sub-lane (animates in) */}
        {hasMonths && liuyue ? (
          <Group opacity={progress}>
            {connectorPath ? (
              <Path
                path={connectorPath}
                style='stroke'
                strokeWidth={1.6}
                strokeCap='round'
                color={colors.accent}
                end={progress}
              />
            ) : null}
            {/* 月相 emblem — the year→month link (a waxing crescent). */}
            <Circle cx={moonX} cy={sy} r={8} color={colors.accent} opacity={0.9} />
            <Circle cx={moonX + 4.4} cy={sy} r={7.2} color={colors.bg} />
            {subSpinePath ? (
              <Path
                path={subSpinePath}
                style='stroke'
                strokeWidth={1.8}
                strokeCap='round'
                color={domainColor}
                opacity={0.55}
                end={progress}
              />
            ) : null}
            {liuyue.map((m, i) => {
              const my = sy + i * SUBROW
              const isNow = liuyueNowMonth === m.month
              return (
                <Group key={m.month}>
                  {isNow ? (
                    <Circle cx={LANE_X} cy={my} r={9} color={colors.accent} opacity={0.14} />
                  ) : null}
                  <GNode
                    x={LANE_X}
                    y={my}
                    r={isNow ? 5 : 3.2}
                    color={isNow ? colors.accent : domainColor}
                    bg={colors.bg}
                    ring={isNow}
                  />
                  <Circle cx={width - 22} cy={my} r={3} color={fitColor[m.fit]} />
                </Group>
              )
            })}
          </Group>
        ) : null}

        {/* 流年 nodes (drawn over the spine) */}
        {liunian.map((l, i) => {
          const y = yOf(i)
          const sel = i === selectedYearIndex
          if (l.isCurrent) {
            return (
              <Group key={l.year}>
                <Circle cx={TRUNK_X} cy={y} r={13} color={colors.accent} opacity={0.14} />
                <GNode x={TRUNK_X} y={y} r={7} color={fitColor[l.fit]} bg={colors.bg} />
              </Group>
            )
          }
          if (sel) {
            return (
              <Group key={l.year}>
                <Circle cx={TRUNK_X} cy={y} r={11} color={colors.accent} opacity={0.12} />
                <GNode x={TRUNK_X} y={y} r={5.5} color={domainColor} bg={colors.bg} />
              </Group>
            )
          }
          return <GNode key={l.year} x={TRUNK_X} y={y} r={4.5} color={domainColor} bg={colors.bg} />
        })}
      </Canvas>

      {/* 大运 label */}
      <Text
        style={{
          position: 'absolute',
          left: TRUNK_X + 14,
          top: TOP - 8,
          color: colors.secondary,
          fontSize: 12,
          fontWeight: '600',
        }}
      >
        {dayunLabel}
      </Text>

      {/* 流月 panel header + labels */}
      {hasMonths && liuyue && selectedYearIndex != null ? (
        <>
          <Text
            style={{
              position: 'absolute',
              left: LANE_X,
              top: sy - 18,
              color: colors.secondary,
              fontSize: 11,
              fontWeight: '600',
            }}
          >
            {`${liunian[selectedYearIndex]?.gz ?? ''} ${liunian[selectedYearIndex]?.year ?? ''} · 流月`}
          </Text>
          {liuyue.map((m, i) => {
            const my = sy + i * SUBROW
            const hot = liuyueNowMonth === m.month || selectedMonth === m.month
            return (
              <Pressable
                key={m.month}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {})
                  onSelectMonth?.(m.month)
                }}
                accessibilityRole='button'
                accessibilityLabel={`${m.label}月 ${m.stem}${m.branch}`}
                style={{
                  position: 'absolute',
                  left: LANE_X - 12,
                  top: my - SUBROW / 2,
                  width: width - (LANE_X - 12),
                  height: SUBROW,
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    marginLeft: 25,
                    color: hot ? colors.text : colors.secondary,
                    fontSize: 11.5,
                    fontWeight: hot ? '600' : '400',
                  }}
                  numberOfLines={1}
                >
                  {`${m.label}月 ${m.stem}${m.branch}`}
                </Text>
              </Pressable>
            )
          })}
        </>
      ) : null}

      {/* 流年 labels + tap targets */}
      {liunian.map((l, i) => {
        const y = yOf(i)
        const sel = i === selectedYearIndex
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
              top: y - ROW / 2,
              width: LANE_X - 24,
              height: ROW,
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                marginLeft: TRUNK_X + 14,
              }}
            >
              <Text
                style={{
                  color: sel || l.isCurrent ? colors.text : colors.secondary,
                  fontSize: 15,
                  fontWeight: sel || l.isCurrent ? '600' : '400',
                }}
              >
                {l.gz}
              </Text>
              <Text style={{ color: colors.dim, fontSize: 11 }}>{l.year}</Text>
              {l.tag && !sel ? (
                <Text style={{ color: domainColor, fontSize: 10, fontWeight: '500' }}>{l.tag}</Text>
              ) : null}
              {l.isCurrent && !sel ? (
                <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '600' }}>HEAD</Text>
              ) : null}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
