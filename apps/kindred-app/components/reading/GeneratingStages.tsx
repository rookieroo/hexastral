/**
 * GeneratingStages — the loader shown while a bond's synastry report is being
 * computed + written (the 202 → isGenerating wait, which is not instant).
 *
 * Instead of one static "合盘中…" line, the caption advances through the real
 * pipeline as a crossfading carousel — 对齐天干地支 → 推演双方八字 → 合盘分析 →
 * 编写关系报告 — so the wait reads as visible progress rather than a hang. The
 * stages walk forward on a timer and HOLD on the last one (writing the report),
 * because the tail LLM step is the variable-length part: we never want the copy
 * to claim "done" before the screen actually swaps to the report.
 *
 * Copy is passed in pre-localized (the screen owns i18n); this component only
 * owns the motion. The moon loader above it is unchanged.
 */

import { kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'

export interface GeneratingStagesProps {
  /** Ordered, pre-localized stage captions. The last one is held indefinitely. */
  stages: string[]
  color: string
  /** Per-stage dwell before crossfading to the next (ms). */
  stepMs?: number
}

export function GeneratingStages({ stages, color, stepMs = 2600 }: GeneratingStagesProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    // Walk forward, then stop on the final stage (it covers the variable tail).
    if (index >= stages.length - 1) return
    const timer = setTimeout(() => setIndex((i) => Math.min(i + 1, stages.length - 1)), stepMs)
    return () => clearTimeout(timer)
  }, [index, stages.length, stepMs])

  const caption = stages[index] ?? stages[stages.length - 1] ?? ''

  return (
    // Fixed height so the crossfade (old line fading out over the new) doesn't
    // jump the layout as captions of different lengths swap.
    <View style={{ minHeight: 24, justifyContent: 'center' }}>
      <Animated.Text
        // Re-keying on the caption text drives the enter/exit crossfade.
        key={caption}
        entering={FadeIn.duration(420)}
        exiting={FadeOut.duration(360)}
        style={[
          kindredType.body,
          { color, textAlign: 'center', paddingHorizontal: kindredSpacing.lg },
        ]}
      >
        {caption}
      </Animated.Text>
    </View>
  )
}
