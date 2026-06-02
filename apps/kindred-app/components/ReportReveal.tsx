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
 * Requires @shopify/react-native-skia + @react-native-masked-view/masked-view
 * (added to yuan-app deps; needs a native rebuild).
 */

import MaskedView from '@react-native-masked-view/masked-view'
import { InkBloomMask } from '@zhop/core-ui/motion'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

type Phase = 'cover' | 'wipe' | 'done'

export function ReportReveal({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions()
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'cover')

  // Short cover hold lets MaskedView + the Skia canvas paint their first frame.
  useEffect(() => {
    if (reduced || phase !== 'cover') return
    const id = setTimeout(() => setPhase('wipe'), 90)
    return () => clearTimeout(id)
  }, [reduced, phase])

  // Once fully bloomed (or under reduced motion) render the report with NO mask
  // so paging / scroll gestures are pristine.
  if (phase === 'done') return <>{children}</>

  return (
    <MaskedView
      style={{ flex: 1 }}
      maskElement={
        <InkBloomMask
          active={phase === 'wipe'}
          origin={{ x: width / 2, y: height * 0.86 }}
          maxRadius={Math.hypot(width, height) * 1.1}
          width={width}
          height={height}
          duration={1600}
          onOpened={() => setPhase('done')}
          onCollapsed={() => {}}
        />
      }
    >
      <View style={[{ flex: 1 }, phase === 'cover' && { opacity: 0 }]}>{children}</View>
    </MaskedView>
  )
}
