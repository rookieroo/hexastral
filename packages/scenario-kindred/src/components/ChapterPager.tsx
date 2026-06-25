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
import { ChapterCard, type ChapterCardTheme } from './ChapterCard'

export interface ChapterPagerProps {
  report: SynastryReport
  currentIndex: number
  onIndexChange: (index: number) => void
  onShareChapter: (chapterIndex: number) => void
  /** Optional trailing page rendered after the last chapter (e.g. the unlock wall). */
  trailing?: ReactNode
  /** Progressive report: how many chapters are still composing in the background.
   *  Rendered as swipeable skeleton pages AFTER the present chapters so the reader
   *  sees the report has more coming (instead of an abrupt end), and each fills in
   *  as the poll lands it. Only meaningful for an unlocked report (a locked report
   *  shows the unlock wall instead). */
  pendingCount?: number
  /** Day-master elements — shown in the chapter subtitle. */
  aElement?: string
  bElement?: string
  /** Report locale — drives the card's fonts + static labels. */
  locale?: string
  /** Device/UI locale — the language a tapped term's explanation shows in. */
  glossaryLocale?: string
  /** Provides each chapter's centerpiece (水墨粒子 Skia ink) — supplied by the app. */
  renderCenterpiece?: (chapter: SynastryReport['chapters'][number], index: number) => ReactNode
  /** 划词 — long-press a body paragraph to pick it (drives the selection bar). */
  onPickQuote?: (quote: string) => void
  /** Highlighted paragraph texts — rendered with a cinnabar wash. */
  highlightedQuotes?: string[]
  /** Surface theme — 'paper' (default) or 'dark' (in-app 水墨黑 report). */
  theme?: ChapterCardTheme
}

export function ChapterPager({
  report,
  currentIndex,
  onIndexChange,
  onShareChapter,
  trailing,
  aElement,
  bElement,
  locale,
  glossaryLocale,
  renderCenterpiece,
  onPickQuote,
  highlightedQuotes,
  theme = 'paper',
  pendingCount = 0,
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
            aElement={aElement}
            bElement={bElement}
            locale={locale}
            glossaryLocale={glossaryLocale}
            centerpiece={renderCenterpiece?.(chapter, idx)}
            onPickQuote={onPickQuote}
            highlightedQuotes={highlightedQuotes}
            theme={theme}
          />
        </View>
      ))}
      {Array.from({ length: Math.max(0, pendingCount) }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed-order placeholder pages
        <View key={`pending-${i}`} style={{ width: screenWidth }}>
          <ChapterSkeletonPage theme={theme} />
        </View>
      ))}
      {trailing ? <View style={{ width: screenWidth }}>{trailing}</View> : null}
    </ScrollView>
  )
}

/**
 * Placeholder page for a chapter still being composed by the background pass. Pure
 * faint ink bars (no text) so it's i18n-free and reads as "more is coming" against
 * both the paper and 水墨黑 surfaces.
 */
function ChapterSkeletonPage({ theme }: { theme: ChapterCardTheme }) {
  const bar = theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const barStrong = theme === 'dark' ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.10)'
  const widths = ['82%', '94%', '70%', '90%', '88%', '64%'] as const
  return (
    <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 96, gap: 18 }}>
      {/* Title bar + centerpiece placeholder */}
      <View style={{ width: '48%', height: 22, borderRadius: 6, backgroundColor: barStrong }} />
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          backgroundColor: bar,
          alignSelf: 'center',
          marginVertical: 16,
        }}
      />
      {widths.map((w, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: static decorative bars
          key={i}
          style={{ width: w, height: 13, borderRadius: 4, backgroundColor: bar }}
        />
      ))}
    </View>
  )
}
