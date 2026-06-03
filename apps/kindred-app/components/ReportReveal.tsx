/**
 * ReportReveal — an open-only ink-bloom (水墨晕开) entrance for the synastry
 * report. An organic Skia ink mask blooms the report in from a bottom-center
 * origin (where the reveal CTA sits); once fully open the mask is dropped so
 * the report's own gestures (ChapterPager paging, scroll) are untouched.
 *
 * Open-only by design: the report has its own back button + a horizontal
 * pager, so a swipe-to-close overlay would fight those. Mirrors the ink
 * vocabulary of apps/ming-pan-app's ReadingOverlay (ADR-0018 rule 3/6).
 *
 * DARK-MODE FIX: the bloom alone is invisible on dark — the revealed report is
 * dark and the not-yet-revealed area is dark, so the organic ink edge has no
 * contrast ("完全看不出来"). We ride a LUMINOUS ivory ink-front on the bloom
 * boundary: a soft glowing ring at the same radius/timing as the mask, which
 * makes the 墨晕 read as ink lit from within as it spreads, then fades to
 * nothing as the bloom fills the screen. (Light mode never needed it; the
 * paper-bright report gave its own contrast.)
 *
 * Requires @shopify/react-native-skia + @react-native-masked-view/masked-view.
 */

import MaskedView from '@react-native-masked-view/masked-view'
import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia'
import { InkBloomMask } from '@zhop/core-ui/motion'
import { ricePaper } from '@zhop/hexastral-tokens'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

type Phase = 'cover' | 'wipe' | 'done'

const BLOOM_MS = 1600
// Match InkBloomMask's internal easing so the glow front stays on the ink edge.
const BLOOM_EASING = Easing.bezier(0.3, 0.45, 0.2, 1)

export function ReportReveal({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'cover')

  const origin = { x: width / 2, y: height * 0.86 }
  const maxRadius = Math.hypot(width, height) * 1.1

  // Luminous ink-front — a ring driven on the SAME radius + timing as the mask,
  // so it glows along the spreading ink edge (the part that's invisible in dark).
  const edgeR = useSharedValue(0)
  const edgeRadius = useDerivedValue(() => Math.max(1, edgeR.value))
  const edgeGlowStyle = useAnimatedStyle(() => ({
    // Full brightness while sweeping, gone by the time it fills the screen (no
    // pop on done) — on the dark report bg this ring IS the visible 墨晕.
    opacity: interpolate(edgeR.value / maxRadius, [0, 0.75, 1], [1, 0.85, 0]),
  }))

  // Short cover hold lets MaskedView + the Skia canvas paint their first frame.
  useEffect(() => {
    if (reduced || phase !== 'cover') return
    const id = setTimeout(() => setPhase('wipe'), 90)
    return () => clearTimeout(id)
  }, [reduced, phase])

  // Start the glow front the moment the bloom starts (same params as the mask).
  useEffect(() => {
    if (phase !== 'wipe') return
    edgeR.value = withTiming(maxRadius, { duration: BLOOM_MS, easing: BLOOM_EASING })
  }, [phase, maxRadius, edgeR])

  // Once fully bloomed (or under reduced motion) render the report with NO mask
  // so paging / scroll gestures are pristine.
  if (phase === 'done') return <>{children}</>

  return (
    <View style={{ flex: 1 }}>
      <MaskedView
        style={{ flex: 1 }}
        maskElement={
          <InkBloomMask
            active={phase === 'wipe'}
            origin={origin}
            maxRadius={maxRadius}
            width={width}
            height={height}
            duration={BLOOM_MS}
            onOpened={() => setPhase('done')}
            onCollapsed={() => {}}
          />
        }
      >
        <View style={[{ flex: 1 }, phase === 'cover' && { opacity: 0 }]}>{children}</View>
      </MaskedView>

      {/* Luminous ivory ink-front, on top, riding the bloom edge (dark-mode legibility). */}
      <Animated.View style={[StyleSheet.absoluteFill, edgeGlowStyle]} pointerEvents='none'>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={origin.x} cy={origin.y} r={edgeRadius}>
            <RadialGradient
              c={vec(origin.x, origin.y)}
              r={edgeRadius}
              colors={[
                'rgba(245,240,232,0)',
                'rgba(245,240,232,0.12)',
                ricePaper.ivory,
                'rgba(245,240,232,0)',
              ]}
              // Wider luminous band (0.7→1 of the radius) so the spreading ink
              // edge reads on black, with a faint inner wash behind it.
              positions={[0, 0.7, 0.9, 1]}
            />
          </Circle>
        </Canvas>
      </Animated.View>
    </View>
  )
}
