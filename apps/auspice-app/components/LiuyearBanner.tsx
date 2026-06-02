/**
 * LiuyearBanner — Sprint 4.5 (ADR-0020).
 *
 * Compact 1-line banner shown above the day-detail on Today when birth info
 * is set. Surfaces the user's current 大运 + 流年 干支 and taps through to
 * /timeline (the Pro page). Renders nothing when no birth info is set or
 * gender is missing (gender is required to compute 大运 direction).
 *
 * The banner self-fetches its data — the server-side cache (30-day TTL,
 * keyed by birth+locale) makes redundant client fetches cheap, and keeps
 * this component drop-in usable anywhere on the home without parent state.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { fetchTimeline, type TimelinePayload } from '@/lib/api'
import { getCycleBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'

/** Convert a stored shichen-index (0-11) into a representative wall-clock hour. */
function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  // 子时 (index 0) covers 23:00–00:59; representative hour = 0 (still falls in 子).
  // Other indexes: index*2 lands inside the 2-hour window.
  return timeIndex * 2
}

export function LiuyearBanner() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const [data, setData] = useState<TimelinePayload | null>(null)

  useEffect(() => {
    let cancelled = false
    getCycleBirthInfo()
      .then((info) => {
        if (!info?.gender) return
        const birthHour = shichenToHour(info.timeIndex)
        const gender = info.gender === '男' ? 'M' : 'F'
        return fetchTimeline({ birthDate: info.solarDate, birthHour, gender, locale })
      })
      .then((payload) => {
        if (!cancelled && payload) setData(payload)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [locale])

  if (!data) return null
  const dayun = data.dayun[data.currentDayunIndex]
  const liunian = data.liunian[data.currentLiunianIndex]
  if (!dayun || !liunian) return null

  return (
    <Pressable
      onPress={() => router.push('/timeline')}
      accessibilityRole='button'
      accessibilityLabel={t.timelineTitle}
      style={({ pressed }) => ({
        marginHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
        {t.timelineBannerHint}
      </Text>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
          {dayun.pillar.stem}
          {dayun.pillar.branch}
        </Text>
        <Text style={{ color: colors.dim, fontSize: 14 }}>·</Text>
        <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
          {liunian.pillar.stem}
          {liunian.pillar.branch}
        </Text>
      </View>
      <ChevronRightIcon size={14} color={colors.dim} strokeWidth={1.4} />
    </Pressable>
  )
}
