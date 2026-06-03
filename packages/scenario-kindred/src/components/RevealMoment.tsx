/**
 * RevealMoment — the quiet ceremony shown after a bond is created.
 *
 * Redesigned 2026-06: the previous version stacked two spinning 12-sector chart
 * wheels, five wafting cinnabar threads and a stamped seal over a rice-paper →
 * void crossfade. It was busy and, per device feedback, "太丑". It now leans on
 * the brand's own moon: a single phase-moon holds center (when the host passes a
 * cycling <AutoMoonPhaseLoader> it doubles as the "aligning your charts" loader),
 * the couplet fades in beneath it, and the CTA arrives last.
 *
 * The host supplies the moon via the `moon` slot so this package keeps no
 * dependency on core-ui's motion module — pass an <AutoMoonPhaseLoader> (or any
 * brand mark) from the app. Reduced motion shows the terminal frame at once.
 */

import { ink, ricePaper, rubbing } from '@zhop/hexastral-tokens'
import { kindredType } from '@zhop/hexastral-tokens/kindred'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInUp, useReducedMotion } from 'react-native-reanimated'

export interface RevealMomentProps {
  /** Center brand mark — pass an <AutoMoonPhaseLoader> for the live phase cycle. */
  moon?: ReactNode
  /** Skip the staggered fade on subsequent visits. */
  playAnimation?: boolean
  /** CTA callback. */
  onContinue: () => void
  /** Localized strings; defaults Chinese. */
  copy?: {
    line1?: string
    line2?: string
    cta?: string
  }
}

const DEFAULT_COPY = {
  line1: '你们的相遇',
  line2: '并非偶然',
  cta: '阅读你们的故事  →',
} as const

export function RevealMoment({ moon, playAnimation = true, onContinue, copy }: RevealMomentProps) {
  const merged = { ...DEFAULT_COPY, ...(copy ?? {}) }
  const reduced = useReducedMotion()
  const animate = playAnimation && !reduced

  return (
    <View style={styles.root}>
      {/* Moon — the centerpiece + (when a loader is passed) the "aligning" cue. */}
      <Animated.View
        style={styles.moon}
        entering={animate ? FadeIn.duration(700) : undefined}
        pointerEvents='none'
      >
        {moon}
      </Animated.View>

      {/* Couplet — 你们的相遇 / 并非偶然 */}
      <View style={styles.textBlock} pointerEvents='none'>
        <Animated.Text
          style={[kindredType.title, styles.textLine]}
          entering={animate ? FadeInUp.delay(500).duration(560) : undefined}
        >
          {merged.line1}
        </Animated.Text>
        <Animated.Text
          style={[kindredType.title, styles.textLine]}
          entering={animate ? FadeInUp.delay(700).duration(560) : undefined}
        >
          {merged.line2}
        </Animated.Text>
      </View>

      {/* CTA — last to arrive; reads "aligning…" while the bond is still cooking. */}
      <Animated.View
        style={styles.ctaWrapper}
        entering={animate ? FadeIn.delay(1100).duration(560) : undefined}
      >
        <Pressable onPress={onContinue} hitSlop={16} accessibilityRole='button'>
          <Text style={[kindredType.heading, styles.cta]}>{merged.cta}</Text>
        </Pressable>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: rubbing.void,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moon: {
    marginBottom: 48,
  },
  textBlock: {
    alignItems: 'center',
  },
  textLine: {
    color: ricePaper.ivory,
    textAlign: 'center',
  },
  ctaWrapper: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
  },
  cta: {
    color: ink.gold,
  },
})
