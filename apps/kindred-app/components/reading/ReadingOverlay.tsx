/**
 * ReadingOverlay — in-place ink-bloom that reveals the solo ReadingReport over
 * the live home screen.
 *
 * Ported from ming-pan-app/components/ReadingOverlay.tsx per ADR-0021 K1 /
 * ADR-0022. Ported (rather than reusing kindred's existing ReportReveal)
 * because ReadingReport's chapter-detail navigation is LIFTED to this overlay:
 * the right-swipe is two-tiered (pop chapter detail first, then collapse the
 * bloom), which ReportReveal (open-only, no chapter state) does not provide.
 * Both share the same `InkBloomMask` ink vocabulary (ADR-0018 rule 3/6).
 *
 * Rendered as an absolute child of the home (NOT a pushed route): home stays in
 * the tree behind, so there is literally no transition to flash. The organic
 * ink mask blooms the report in from the CTA origin; outside the shape is
 * transparent → the home shows through. Right-swipe dismisses with a symmetric
 * reverse bloom (the ink collapses back to where it started), then the parent
 * unmounts the overlay.
 */

import MaskedView from '@react-native-masked-view/masked-view'
import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia'
import { InkBloomMask } from '@zhop/core-ui/motion'
import { ricePaper } from '@zhop/hexastral-tokens'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import { type ChapterRef, ReadingReport } from './ReadingReport'

export interface ReadingOverlayProps {
  visible: boolean
  onClose: () => void
  /** 划词 AI chat (K3) — forwarded to ReadingReport's ask affordances. */
  onAskAI?: (args: { slug: string; quote: string | null }) => void
}

export function ReadingOverlay({ visible, onClose, onAskAI }: ReadingOverlayProps) {
  // Hooks-free outer wrapper: gate render so the inner re-mounts on each open
  // (fresh reveal phase, fresh mask + Skia canvas).
  if (!visible) return null
  return <OverlayInner onClose={onClose} onAskAI={onAskAI} />
}

type Phase = 'cover' | 'wipe' | 'done' | 'closing'

const OPEN_DURATION = 1600
const CLOSE_DURATION = 700
// Match InkBloomMask's internal easing so the glow front stays on the ink edge.
const BLOOM_EASING = Easing.bezier(0.3, 0.45, 0.2, 1)

function OverlayInner({
  onClose,
  onAskAI,
}: {
  onClose: () => void
  onAskAI?: (args: { slug: string; quote: string | null }) => void
}) {
  const { width, height } = useWindowDimensions()
  const [revealPhase, setRevealPhase] = useState<Phase>('cover')
  // Chapter detail navigation lives here (not in ReadingReport) so the overlay's
  // right-swipe can pop a detail before falling through to close.
  const [activeChapter, setActiveChapter] = useState<ChapterRef | null>(null)

  const origin = useMemo(() => ({ x: width / 2, y: height * 0.86 }), [width, height])
  const maxRadius = useMemo(() => Math.hypot(width, height) * 1.1, [width, height])

  // Luminous ivory ink-front — a ring on the SAME radius + timing as the mask, so
  // the 墨晕 reads as ink lit from within as it spreads. The white bloom mask is
  // invisible on the dark report bg, so without this the reveal has no visible
  // ink edge. Mirrors ReportReveal's dark-mode fix.
  const edgeR = useSharedValue(0)
  const edgeRadius = useDerivedValue(() => Math.max(1, edgeR.value))
  const edgeGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(edgeR.value / maxRadius, [0, 0.7, 1], [0.85, 0.7, 0]),
  }))

  // Short cover hold lets MaskedView + the Skia canvas mount and paint their
  // first (empty) frame before the bloom kicks in.
  useEffect(() => {
    const id = setTimeout(() => setRevealPhase('wipe'), 90)
    return () => clearTimeout(id)
  }, [])

  // Glow front rides the bloom edge: out to maxRadius on open, back to the
  // origin on close (the ink collapses to where it started).
  useEffect(() => {
    if (revealPhase === 'wipe') {
      edgeR.value = withTiming(maxRadius, { duration: OPEN_DURATION, easing: BLOOM_EASING })
    } else if (revealPhase === 'closing') {
      edgeR.value = withTiming(0, { duration: CLOSE_DURATION, easing: BLOOM_EASING })
    }
  }, [revealPhase, maxRadius, edgeR])

  const handleOpened = useCallback(() => setRevealPhase('done'), [])
  const handleCollapsed = useCallback(() => onClose(), [onClose])
  const startClose = useCallback(() => {
    setRevealPhase((p) => (p === 'closing' ? p : 'closing'))
  }, [])
  const popDetail = useCallback(() => setActiveChapter(null), [])

  // Right-swipe behaviour is two-tiered:
  //   1. If a chapter detail is open, pop it (back to chapter list).
  //   2. Else collapse the ink bloom (back to home — onClose runs after the
  //      reverse animation completes, not synchronously here).
  // Left-swipe is absorbed so it can't fall through to the home's swipe-to-Me.
  const inDetail = activeChapter != null
  const swipeBack = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-24, 24])
        .failOffsetY([-18, 18])
        .onEnd((e) => {
          if (e.translationX > 80 && Math.abs(e.translationY) < 100) {
            if (inDetail) runOnJS(popDetail)()
            else runOnJS(startClose)()
          }
        }),
    [inDetail, popDetail, startClose]
  )

  const open = revealPhase === 'wipe' || revealPhase === 'done'

  return (
    <GestureDetector gesture={swipeBack}>
      {/* zIndex 100 so the overlay sits above the home's absolute moon (zIndex 10). */}
      <View style={[StyleSheet.absoluteFill, S.root]}>
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <InkBloomMask
              active={open}
              origin={origin}
              maxRadius={maxRadius}
              width={width}
              height={height}
              duration={revealPhase === 'closing' ? CLOSE_DURATION : OPEN_DURATION}
              onOpened={handleOpened}
              onCollapsed={handleCollapsed}
            />
          }
        >
          {/* Opacity gate during 'cover' guards against the first-frame MaskedView
              flash before the Skia mask establishes — once the mask is painting,
              the report bloom inside the ink shape takes over. */}
          <View style={[S.content, revealPhase === 'cover' && S.coverHidden]}>
            <ReadingReport
              activeChapter={activeChapter}
              setActiveChapter={setActiveChapter}
              onAskAI={onAskAI}
            />
          </View>
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
                  'rgba(245,240,232,0)',
                  ricePaper.ivory,
                  'rgba(245,240,232,0)',
                ]}
                positions={[0, 0.78, 0.93, 1]}
              />
            </Circle>
          </Canvas>
        </Animated.View>
      </View>
    </GestureDetector>
  )
}

const S = StyleSheet.create({
  root: { zIndex: 100 },
  content: { flex: 1 },
  coverHidden: { opacity: 0 },
})
