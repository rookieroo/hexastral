/**
 * Horizontal page-snap pager for Xingqi report chapters.
 */

import { type ReactNode, useCallback } from 'react'
import {
  Dimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  View,
} from 'react-native'

import type { XingqiChapter } from '@/lib/report-chapters'

import { ChapterCard } from './ChapterCard'

export function ChapterPager({
  chapters,
  currentIndex,
  onIndexChange,
  locale,
  colors,
  renderCenterpiece,
  onPickQuote,
  highlightedQuotes,
}: {
  chapters: XingqiChapter[]
  currentIndex: number
  onIndexChange: (i: number) => void
  locale: string
  colors: {
    bg: string
    text: string
    secondary: string
    dim: string
    accent: string
    separator: string
  }
  renderCenterpiece?: (chapter: XingqiChapter, index: number) => ReactNode
  onPickQuote?: (quote: string) => void
  highlightedQuotes?: readonly string[]
}) {
  const screenWidth = Dimensions.get('window').width

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x
      const next = Math.round(offsetX / screenWidth)
      if (next !== currentIndex) onIndexChange(next)
    },
    [currentIndex, onIndexChange, screenWidth]
  )

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate='fast'
        disableIntervalMomentum
        directionalLockEnabled
        onMomentumScrollEnd={handleScrollEnd}
        contentOffset={{ x: currentIndex * screenWidth, y: 0 }}
        style={{ flex: 1 }}
      >
        {chapters.map((chapter, idx) => (
          <View key={`${chapter.kind}-${idx}`} style={{ width: screenWidth }}>
            <ChapterCard
              chapter={chapter}
              index={idx}
              total={chapters.length}
              locale={locale}
              centerpiece={renderCenterpiece?.(chapter, idx)}
              colors={colors}
              onPickQuote={onPickQuote}
              highlightedQuotes={highlightedQuotes}
            />
          </View>
        ))}
      </ScrollView>
      <View
        style={{
          position: 'absolute',
          bottom: 28,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 6,
          pointerEvents: 'none',
        }}
      >
        {chapters.map((ch, i) => (
          <View
            key={ch.kind}
            style={{
              width: i === currentIndex ? 16 : 6,
              height: 6,
              backgroundColor: i === currentIndex ? colors.accent : colors.dim,
              opacity: i === currentIndex ? 1 : 0.4,
            }}
          />
        ))}
      </View>
    </View>
  )
}
