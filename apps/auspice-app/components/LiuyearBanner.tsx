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
import { useRouter } from 'expo-router'
import { GitBranch, GitCommitVertical } from 'lucide-react-native'
import { type ReactNode, useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { fetchTimeline, type TimelinePayload } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { useStrings } from '@/lib/i18n-context'
import { makeIfInteractiveCopyForLocale } from '@/lib/makeIfBranches'

/** Convert a stored shichen-index (0-11) into a representative wall-clock hour. */
function shichenToHour(timeIndex: number | null): number {
  if (timeIndex === null || timeIndex < 0 || timeIndex > 11) return -1
  // 子时 (index 0) covers 23:00–00:59; representative hour = 0 (still falls in 子).
  // Other indexes: index*2 lands inside the 2-hour window.
  return timeIndex * 2
}

/** Short localized hook that introduces make-if under its CTA — the 干支 that used
 *  to sit on its own said nothing to users; this teases what the feature does. */
const MAKEIF_TAGLINE: Record<string, string> = {
  'zh-Hans': '推演另一种人生',
  'zh-Hant': '推演另一種人生',
  ja: 'もしもの人生を試す',
  en: 'explore a what-if life',
}

export function LiuyearBanner() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const [data, setData] = useState<TimelinePayload | null>(null)

  useEffect(() => {
    let cancelled = false
    getAuspiceBirthInfo()
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

  const dayun = data?.dayun[data.currentDayunIndex]
  const liunian = data?.liunian[data.currentLiunianIndex]
  const makeifLabel = makeIfInteractiveCopyForLocale(locale).screenTitle
  // The 大运·流年 干支 (jargon on its own) now rides as the timeline CTA's subtitle —
  // a meaningful home; make-if gets a one-line hook that actually introduces it.
  const periodSub =
    dayun && liunian
      ? `${dayun.pillar.stem}${dayun.pillar.branch} · ${liunian.pillar.stem}${liunian.pillar.branch}`
      : t.timelineBannerHint

  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <EntryPill
        icon={<GitCommitVertical size={18} color={colors.text} strokeWidth={1.6} />}
        label={t.timelineTitle}
        sub={periodSub}
        onPress={() => router.push('/timeline')}
        colors={colors}
        spacing={spacing}
      />
      <EntryPill
        icon={<GitBranch size={18} color={colors.accent} strokeWidth={1.6} />}
        label={makeifLabel}
        sub={MAKEIF_TAGLINE[locale] ?? MAKEIF_TAGLINE.en}
        onPress={() => router.push('/makeif')}
        colors={colors}
        spacing={spacing}
        accent
      />
    </View>
  )
}

function EntryPill({
  icon,
  label,
  sub,
  onPress,
  colors,
  spacing,
  accent,
}: {
  icon: ReactNode
  label: string
  sub?: string
  onPress: () => void
  colors: ReturnType<typeof useTheme>['colors']
  spacing: ReturnType<typeof useTheme>['spacing']
  accent?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: accent ? colors.accent : colors.separator,
        backgroundColor: accent ? colors.accentGhost : colors.card,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon}
      <View style={{ flexShrink: 1 }}>
        <Text
          style={{ color: accent ? colors.accent : colors.text, fontSize: 14, fontWeight: '600' }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {sub ? (
          <Text style={{ color: colors.dim, fontSize: 11, marginTop: 1 }} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}
