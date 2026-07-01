/**
 * ShareableFengCard — the off-screen card captured (react-native-view-shot) and
 * shared as a PNG image. Built from react-native-svg + Views (NOT Skia — a Skia
 * Canvas doesn't reliably capture into view-shot), so the snapshot is crisp and
 * deterministic. 宣纸 ground, 風 mark, chapter 意象图 (SVG), title + 朱砂 金句.
 */

import type { FengChapterKind } from '@zhop/scenario-feng'
import { forwardRef, useMemo } from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { FENG_PAPER, spacing } from '@/lib/theme'
import { fengImageRaw } from './FengInkImage'
import { FengMark } from './FengMark'

export const SHARE_CARD_WIDTH = 360
const IMG_W = SHARE_CARD_WIDTH - spacing.xl * 2
// Cap SVG circle count for capture performance; the field still reads dense.
const MAX_DOTS = 1500

/** The particle 意象图 as react-native-svg (view-shot captures SVG; Skia not). */
function CardImage({ kind }: { kind: FengChapterKind }) {
  const dots = useMemo(() => {
    const pts = fengImageRaw(kind)
    if (pts.length <= MAX_DOTS) return pts
    const stride = Math.ceil(pts.length / MAX_DOTS)
    return pts.filter((_, i) => i % stride === 0)
  }, [kind])
  return (
    <Svg width={IMG_W} height={(IMG_W * 300) / 440} viewBox='0 0 440 300'>
      {dots.map((p, i) => (
        <Circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={1.9}
          fill={`rgb(${p.rgb})`}
          fillOpacity={p.a}
        />
      ))}
    </Svg>
  )
}

interface ShareableFengCardProps {
  kind: FengChapterKind
  tag: string
  title: string
  goldenLine: string
  footer: string
}

export const ShareableFengCard = forwardRef<View, ShareableFengCardProps>(
  ({ kind, tag, title, goldenLine, footer }, ref) => (
    <View
      ref={ref}
      collapsable={false}
      // laid out off-screen so it can be captured without being visible.
      style={{
        position: 'absolute',
        left: -9999,
        top: 0,
        width: SHARE_CARD_WIDTH,
        backgroundColor: FENG_PAPER.bg,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <FengMark size={24} color={FENG_PAPER.bronze} />
        <Text style={{ color: FENG_PAPER.bronze, fontSize: 12, letterSpacing: 3 }}>
          {tag.toUpperCase()}
        </Text>
      </View>

      <View style={{ alignItems: 'center', marginVertical: spacing.lg }}>
        <CardImage kind={kind} />
      </View>

      <Text style={{ color: FENG_PAPER.ink, fontSize: 23, fontWeight: '700' }}>{title}</Text>
      <Text
        style={{
          color: FENG_PAPER.cinnabar,
          fontSize: 15,
          fontStyle: 'italic',
          marginTop: 6,
        }}
      >
        {goldenLine}
      </Text>

      <View style={{ height: 1, backgroundColor: FENG_PAPER.hair, marginTop: spacing.lg }} />
      <Text
        style={{ color: FENG_PAPER.muted, fontSize: 11, letterSpacing: 1, marginTop: spacing.md }}
      >
        {footer}
      </Text>
    </View>
  )
)

ShareableFengCard.displayName = 'ShareableFengCard'
