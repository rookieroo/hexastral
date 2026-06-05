/**
 * ChapterPager — horizontal page snap container for a SynastryReport's chapters.
 *
 * Each chapter is rendered as a full-viewport-width page that snaps in place
 * using native ScrollView paging. The current page is reflected via the
 * `currentIndex` controlled prop so the parent can render an indicator
 * (or sync deep links like /report/[id]?chapter=3).
 *
 * Uses the OS pager (not Reanimated Carousel) for two reasons:
 *   1. Less RN-platform fragility (works on iOS + Android + web reliably)
 *   2. Native momentum / overscroll behavior matches platform conventions
 *
 * The visual chrome (indicator, header) is the responsibility of the parent —
 * this component renders only the chapter cards themselves.
 */

import { type ReactNode, useCallback } from 'react'
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native'
import type { SynastryReport } from '../types'
import { ChapterCard } from './ChapterCard'

export interface ChapterPagerProps {
  report: SynastryReport
  currentIndex: number
  onIndexChange: (index: number) => void
  onShareChapter: (chapterIndex: number) => void
  /** Optional trailing page rendered after the last chapter (e.g. the unlock wall). */
  trailing?: ReactNode
}

export function ChapterPager({
  report,
  currentIndex,
  onIndexChange,
  onShareChapter,
  trailing,
}: ChapterPagerProps) {
  const screenWidth = Dimensions.get('window').width

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x
      const next = Math.round(offsetX / screenWidth)
      if (next !== currentIndex) {
        onIndexChange(next)
      }
    },
    [currentIndex, onIndexChange, screenWidth]
  )

  return (
    <ScrollView
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScrollEnd}
      contentOffset={{ x: currentIndex * screenWidth, y: 0 }}
      style={{ flex: 1 }}
    >
      {report.chapters.map((chapter, idx) => (
        <View key={`${chapter.kind}-${idx}`} style={{ width: screenWidth }}>
          <ChapterCard
            chapter={chapter}
            index={idx}
            total={report.chapters.length}
            onShare={() => onShareChapter(idx)}
          />
        </View>
      ))}
      {trailing ? <View style={{ width: screenWidth }}>{trailing}</View> : null}
    </ScrollView>
  )
}
