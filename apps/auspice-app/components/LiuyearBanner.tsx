/**
 * LiuyearBanner — Sprint 4.5 (ADR-0020).
 *
 * Compact banner shown above the day-detail on Today. When birth info is set it
 * surfaces the user's current 大运 + 流年 干支 as two pills (timeline + make-if).
 * When no birth is set, it shows a full-width invitation card — the timeline/
 * what-if promise made visible before any chart exists. Both tap through to
 * /timeline (the Pro page; its own no-birth state guides to birth entry).
 *
 * The banner self-fetches its data — the server-side cache (30-day TTL,
 * keyed by birth+locale) makes redundant client fetches cheap, and keeps
 * this component drop-in usable anywhere on the home without parent state.
 */

import { useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { ChevronRight, GitBranch, GitCommitVertical } from 'lucide-react-native'
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

/** Short localized hook under the make-if CTA. Motivation, NOT novelty: the old
 *  "推演另一种人生 / your alternate timelines" read as a parallel-universe toy with
 *  no reason to tap. make-if is a decision engine — "weighing a choice? see which
 *  timing your chart favors" — so the subtitle states that intent (ADR-0023b). The
 *  title stays the brand metaphor (假如 / What-If — itself decision-flavored). */
const MAKEIF_TAGLINE: Record<string, string> = {
  'zh-Hans': '抉择之前,先看时机',
  'zh-Hant': '抉擇之前,先看時機',
  ja: '決断の前に、時機を読む',
  en: 'time a real decision',
}

export function LiuyearBanner() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const [data, setData] = useState<TimelinePayload | null>(null)
  // null = birth check still in flight; false = no birth set; true = set.
  const [hasBirth, setHasBirth] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    getAuspiceBirthInfo()
      .then((info) => {
        if (cancelled) return
        if (!info?.gender) {
          setHasBirth(false)
          return
        }
        setHasBirth(true)
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

  // Birth-less: a full-width invitation card that surfaces the timeline/what-if
  // promise BEFORE any chart exists (the thin 干支 pills said nothing to a user
  // with no birth). Taps into /timeline, whose own no-birth state guides to entry.
  // The aggressive timeline-first framing lives in the store CPP; here it stays an
  // invitation under the calendar-anchored home, not the hero (4.3(b) posture).
  if (hasBirth === false) {
    return (
      <Pressable
        onPress={() => router.push('/timeline')}
        accessibilityRole='button'
        accessibilityLabel={t.timelineInviteTitle}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: colors.accent,
          backgroundColor: colors.accentGhost,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <GitCommitVertical size={20} color={colors.accent} strokeWidth={1.6} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>
            {t.timelineInviteTitle}
          </Text>
          <Text style={{ color: colors.dim, fontSize: 11, marginTop: 2 }} numberOfLines={2}>
            {t.timelineInviteBody}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.accent} strokeWidth={1.6} />
      </Pressable>
    )
  }

  // Hide while the birth check resolves — avoids flashing the pills before
  // swapping to the invite card for a birth-less user.
  if (hasBirth === null) return null

  const dayun = data?.dayun[data.currentDayunIndex]
  const liunian = data?.liunian[data.currentLiunianIndex]
  const makeifLabel = makeIfInteractiveCopyForLocale(locale).screenTitle
  // Subtitle: the live 大运·流年 干支 is meaningful to CJK readers, so they keep it.
  // For en the raw 干支 reads as jargon (and the hint→干支 swap "jumps"), so en shows
  // the legible luck-cycles hook instead — en users can't parse 甲子·乙卯 anyway.
  const periodSub =
    locale === 'en' || !dayun || !liunian
      ? t.timelineBannerHint
      : `${dayun.pillar.stem}${dayun.pillar.branch} · ${liunian.pillar.stem}${liunian.pillar.branch}`

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
