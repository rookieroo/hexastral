/**
 * ReportBloom — the 水墨晕开 entrance for the 合盘 report.
 *
 * The solo reader blooms its dark report in over the live home (ReadingOverlay).
 * The bond report is a navigated route, so it had no such entrance — opening a
 * bond was a plain push (founder note, 2026-06-09). This wraps the report and,
 * on mount, blooms it in through the same organic ink mask: the 水墨黑 report
 * grows from the TAP POINT against the paper surround, the feathered edge IS the
 * 墨晕 — ink spreading on 宣纸 (2026-06: "从点击的位置开始墨汁晕开…背景逐步从
 * 宣纸变成水墨黑色"). Once open it rests (the mask stays full so paging/long-press
 * are untouched); it never collapses — leaving the report is the route pop.
 *
 * Wrap ONLY the visible report (the pager). Keep the off-screen share-capture
 * target, the selection bar and the primer OUTSIDE — a full-screen mask would
 * clip the off-screen capture and we don't want the chrome blooming.
 */

import MaskedView from '@react-native-masked-view/masked-view'
import { InkBloomMask } from '@zhop/core-ui/motion'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'

const OPEN_DURATION = 1400

export function ReportBloom({
  children,
  origin: originProp,
  surroundColor,
}: {
  children: ReactNode
  /** Where the ink starts spreading — the row the user tapped (page coords).
   *  Falls back to mid-page when the opener didn't pass a point. */
  origin?: { x: number; y: number } | null
  /** Colour OUTSIDE the growing ink shape. Default dark (matches the home). Pass
   *  'transparent' when overlaying the live home so the report blooms over the
   *  actual night sky (in-place, like the solo reading overlay). */
  surroundColor?: string
}) {
  const { width, height } = useWindowDimensions()
  const [phase, setPhase] = useState<'cover' | 'wipe' | 'done'>('cover')

  // The ink spreads from the tap (continuity with the home row), or mid-page
  // when no point was handed in.
  const origin = useMemo(
    () => originProp ?? { x: width / 2, y: height * 0.45 },
    [originProp, width, height]
  )
  const maxRadius = useMemo(() => Math.hypot(width, height) * 1.1, [width, height])

  // A short cover hold lets MaskedView + the Skia mask mount and paint their
  // first (empty) frame before the bloom kicks in (avoids a first-frame flash).
  useEffect(() => {
    const id = setTimeout(() => setPhase('wipe'), 60)
    return () => clearTimeout(id)
  }, [])

  const open = phase === 'wipe' || phase === 'done'

  return (
    // Surround OUTSIDE the growing ink shape. Default dark (matches the SkyHero
    // home for a route); 'transparent' when overlaying the live home, so the
    // cream 宣纸 report blooms over the ACTUAL night sky from the tap. The masked
    // child is the paper report; the organic mask edge IS the 墨晕. (No 大白页
    // flash either way.)
    <View style={[StyleSheet.absoluteFill, { backgroundColor: surroundColor ?? kindredDark.bg }]}>
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <InkBloomMask
            active={open}
            origin={origin}
            maxRadius={maxRadius}
            width={width}
            height={height}
            duration={OPEN_DURATION}
            onOpened={() => setPhase('done')}
          />
        }
      >
        <View style={[StyleSheet.absoluteFill, phase === 'cover' && S.coverHidden]}>
          {children}
        </View>
      </MaskedView>
    </View>
  )
}

const S = StyleSheet.create({
  coverHidden: { opacity: 0 },
})
