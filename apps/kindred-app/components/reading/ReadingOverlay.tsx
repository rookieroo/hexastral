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
import { InkBloomMask } from '@zhop/core-ui/motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import { type ChapterRef, ReadingReport } from './ReadingReport'

export interface ReadingOverlayProps {
  visible: boolean
  onClose: () => void
}

export function ReadingOverlay({ visible, onClose }: ReadingOverlayProps) {
  // Hooks-free outer wrapper: gate render so the inner re-mounts on each open
  // (fresh reveal phase, fresh mask + Skia canvas).
  if (!visible) return null
  return <OverlayInner onClose={onClose} />
}

type Phase = 'cover' | 'wipe' | 'done' | 'closing'

const OPEN_DURATION = 1600
const CLOSE_DURATION = 700

function OverlayInner({ onClose }: { onClose: () => void }) {
  const { width, height } = useWindowDimensions()
  const [revealPhase, setRevealPhase] = useState<Phase>('cover')
  // Chapter detail navigation lives here (not in ReadingReport) so the overlay's
  // right-swipe can pop a detail before falling through to close.
  const [activeChapter, setActiveChapter] = useState<ChapterRef | null>(null)

  // Short cover hold lets MaskedView + the Skia canvas mount and paint their
  // first (empty) frame before the bloom kicks in.
  useEffect(() => {
    const id = setTimeout(() => setRevealPhase('wipe'), 90)
    return () => clearTimeout(id)
  }, [])

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
              origin={{ x: width / 2, y: height * 0.86 }}
              maxRadius={Math.hypot(width, height) * 1.1}
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
            <ReadingReport activeChapter={activeChapter} setActiveChapter={setActiveChapter} />
          </View>
        </MaskedView>
      </View>
    </GestureDetector>
  )
}

const S = StyleSheet.create({
  root: { zIndex: 100 },
  content: { flex: 1 },
  coverHidden: { opacity: 0 },
})
