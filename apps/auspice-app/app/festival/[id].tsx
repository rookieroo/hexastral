/**
 * /festival/[id] — per-entry detail page. Sprint 3 chunk 2.
 *
 * Reached from the 文化 hub's 节气/节日 category lists. The page resolves the id against the
 * `festival-content` registry (authored content) and falls back to a
 * "coming soon" placeholder when the id doesn't have content yet. This keeps
 * navigation from breaking while the bulk of Sprint 3's content authoring
 * fills out the 24 节气 + 8 festivals over subsequent chunks.
 *
 * Culture content is fully free (2026-06): every section shows its full body,
 * no paywall. The Pro wall lives on the 对你而言 personalization instead.
 */

import { useTheme } from '@zhop/core-ui'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CultureWikiLink } from '@/components/culture/CultureWikiLink'
import {
  type AuspiceFestival,
  type AuspiceSolarTermEntry,
  fetchAuspiceYearOverview,
} from '@/lib/api'
import {
  getCultureEntryWikipediaUrl,
  localizeCultureEntry,
  localizeSolarTermName,
} from '@/lib/culture'
import { getFestivalContent, JIEQI_PINYIN } from '@/lib/festival-content'
import { useStrings } from '@/lib/i18n-context'

/** Reverse of JIEQI_PINYIN — built once at module load (24 entries). */
const PINYIN_TO_JIEQI: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(JIEQI_PINYIN).map(([k, v]) => [v, k])
)

/** Format an ISO instant (UTC) as local "M/D HH:MM" — same helper shape as TodayHeroCard. */
function formatLocalInstant(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const m = d.getMonth() + 1
  const day = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${m}/${day} ${hh}:${mm}`
}

export default function FestivalDetailScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const params = useLocalSearchParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [festival, setFestival] = useState<AuspiceFestival | null>(null)
  const [solarTerm, setSolarTerm] = useState<AuspiceSolarTermEntry | null>(null)
  const [loading, setLoading] = useState(true)

  // Decode the id. `jieqi-{pinyin}` ids route to one of the 24 节气;
  // everything else is a festival id (the 8 entries on /festivals).
  const jieqiName = useMemo(() => {
    if (!id?.startsWith('jieqi-')) return null
    const pinyin = id.slice('jieqi-'.length)
    return PINYIN_TO_JIEQI[pinyin] ?? null
  }, [id])

  // Refetch the year overview to get the entry's current-year date — for
  // festivals from `festivals[]`, for 节气 from `solarTerms[]`. Lightweight
  // (returns 24 + 8 entries cached at edge), so the per-page roundtrip is
  // cheap and avoids passing complex objects via router params.
  useEffect(() => {
    setLoading(true)
    fetchAuspiceYearOverview(new Date().getFullYear())
      .then((overview) => {
        const festivalMatch = id ? overview.festivals.find((f) => f.id === id) : null
        const termMatch = jieqiName ? overview.solarTerms.find((s) => s.name === jieqiName) : null
        setFestival(festivalMatch ?? null)
        setSolarTerm(termMatch ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id, jieqiName])

  const content = useMemo(() => (id ? getFestivalContent(id) : null), [id])
  const sections = content?.sections[locale]
  const displayName =
    (id ? localizeCultureEntry(id, locale, festival?.name) : null) ??
    (jieqiName ? localizeSolarTermName(jieqiName, locale) : null) ??
    id ??
    ''
  const tagline = content?.tagline?.[locale]
  const wikiUrl = useMemo(() => (id ? getCultureEntryWikipediaUrl(id, locale) : null), [id, locale])

  // Unified hero display: prefer festival's solar/lunar pair, else solar-term's
  // date + second-level instant.
  const heroDate = festival?.solarDate ?? solarTerm?.date ?? null
  const heroSubtitle = festival?.lunarLabel
    ? festival.lunarLabel
    : solarTerm?.instant
      ? formatLocalInstant(solarTerm.instant)
      : null

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* No back button — minimalist drill-in (2026-06 chrome cleanup).
          iOS edge-swipe-back + Android system-back handle nav. The hero
          card below IS the page identity (name + tagline + date). */}
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
        {/* Hero — large name + tagline + date strip. The accent-bordered card
            visually anchors the page like the day hero on Today. */}
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.accent,
            backgroundColor: colors.card,
            padding: spacing.xl,
            gap: spacing.sm,
          }}
        >
          <Text style={{ color: colors.text, fontSize: 32, fontWeight: '300' }}>{displayName}</Text>
          {tagline ? (
            <Text style={{ color: colors.secondary, fontSize: 14, letterSpacing: 1 }}>
              {tagline}
            </Text>
          ) : null}
          {heroDate ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginTop: spacing.sm,
              }}
            >
              <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '500' }}>
                {heroDate}
              </Text>
              {heroSubtitle ? (
                <>
                  <Text style={{ color: colors.dim, fontSize: 12 }}>·</Text>
                  <Text style={{ color: colors.dim, fontSize: 13 }}>{heroSubtitle}</Text>
                </>
              ) : null}
            </View>
          ) : loading ? (
            <ActivityIndicator color={colors.accent} />
          ) : null}
          {wikiUrl ? (
            <View style={{ marginTop: spacing.sm }}>
              <CultureWikiLink url={wikiUrl} />
            </View>
          ) : null}
        </View>

        {/* Sections — authored content if available, "coming soon" placeholder
            otherwise. Free preview = first PREVIEW_LENGTH characters of body
            with a paywall pill; Pro shows the full body. */}
        {sections && sections.length > 0 ? (
          sections.map((section, i) => (
            <SectionCard
              key={`${id}-${i}`}
              title={section.title}
              body={section.body}
              colors={colors}
              spacing={spacing}
            />
          ))
        ) : (
          <View
            style={{
              borderRadius: 14,
              borderWidth: 0.5,
              borderColor: colors.separator,
              backgroundColor: colors.card,
              padding: spacing.lg,
            }}
          >
            <Text style={{ color: colors.dim, fontSize: 14 }}>{t.contentComingSoon}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

interface SectionColors {
  text: string
  accent: string
  card: string
  separator: string
}

function SectionCard({
  title,
  body,
  colors,
  spacing,
}: {
  title: string
  body: string
  colors: SectionColors
  spacing: { md: number; lg: number }
}) {
  return (
    <View
      style={{
        borderRadius: 14,
        backgroundColor: colors.card,
        borderWidth: 0.5,
        borderColor: colors.separator,
        padding: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600', letterSpacing: 2 }}>
        {title}
      </Text>
      <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24 }}>{body}</Text>
    </View>
  )
}
