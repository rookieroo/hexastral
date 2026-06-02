/**
 * Horizontal 12 时辰 scrubber — each chip shows 时辰 name, hour range, and the
 * 时干支. The current 时辰 auto-centers on mount + whenever the active branch
 * changes (e.g. on the hour rollover). (Per-时辰 黄黑道吉凶 is deferred —
 * needs the 黄黑道值时 table; see plan.)
 */

import { useTheme } from '@zhop/core-ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type { CycleHour } from '@/lib/api'
import { useStrings } from '@/lib/i18n-context'
import { localizeShichen } from '@/lib/shichen-vocab'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Cell minWidth — must mirror the inline style below so the scroll math works. */
const CELL_MIN_WIDTH = 64

export function HourScrubber({
  hours,
  activeBranch,
}: {
  hours: CycleHour[]
  activeBranch?: string
}) {
  const { colors, spacing } = useTheme()
  const { locale } = useStrings()
  const scrollRef = useRef<ScrollView>(null)
  const [viewportWidth, setViewportWidth] = useState(0)
  const activeIndex = useMemo(
    () => (activeBranch ? hours.findIndex((h) => h.branch === activeBranch) : -1),
    [activeBranch, hours]
  )

  // Auto-center the active 时辰. Runs after the ScrollView's onLayout fires so
  // `viewportWidth` is known; otherwise we'd center against 0 and land at x=0.
  useEffect(() => {
    if (activeIndex < 0 || viewportWidth <= 0 || !scrollRef.current) return
    const cellStride = CELL_MIN_WIDTH + spacing.sm // cell width + gap
    // Target: center of the active cell aligns with center of the viewport.
    const targetX = activeIndex * cellStride - (viewportWidth - CELL_MIN_WIDTH) / 2
    scrollRef.current.scrollTo({ x: Math.max(0, targetX), animated: false })
  }, [activeIndex, viewportWidth, spacing.sm])

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => setViewportWidth(e.nativeEvent.layout.width)}
      contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}
    >
      {hours.map((h) => {
        const active = h.branch === activeBranch
        return (
          <View
            key={h.branch}
            style={{
              minWidth: CELL_MIN_WIDTH,
              alignItems: 'center',
              gap: 2,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.sm,
              borderRadius: 12,
              backgroundColor: active ? colors.accent : colors.card,
              borderWidth: 0.5,
              borderColor: active ? colors.accent : colors.separator,
            }}
          >
            <Text style={{ color: active ? '#fff' : colors.text, fontSize: 15, fontWeight: '600' }}>
              {localizeShichen(h.name, locale)}
            </Text>
            <Text style={{ color: active ? '#fff' : colors.secondary, fontSize: 11 }}>
              {pad(h.startHour)}–{pad(h.endHour)}
            </Text>
            <Text style={{ color: active ? '#fff' : colors.dim, fontSize: 12 }}>{h.ganZhi}</Text>
          </View>
        )
      })}
    </ScrollView>
  )
}
