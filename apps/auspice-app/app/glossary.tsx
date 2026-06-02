/**
 * /glossary — the 文化 hub. Single-screen toggle list: each big category is an
 * accordion; expanding shows its content inline. IA is hub → content with no
 * separate detail page (per 2026-06 feedback the /festival/[id] drill-in felt
 * too deep when browsing the lists). 节气/节日 expand to a list where each
 * entry shows its own date + 1-2 sentence summary + Wikipedia link inline.
 * 时辰/干支/八字 render their reference visual inline; 紫微 shows intro + Wiki.
 * Each section opens with a localized cultural-background blurb + Wikipedia
 * link. 100% free (ADR-0020).
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CultureIntroBlock } from '@/components/culture/CultureIntroBlock'
import { CultureWikiLink } from '@/components/culture/CultureWikiLink'
import { BaziPillars } from '@/components/glossary/BaziPillars'
import { GanzhiGrid } from '@/components/glossary/GanzhiGrid'
import { ShichenWheel } from '@/components/glossary/ShichenWheel'
import { ZiweiIntro } from '@/components/glossary/ZiweiIntro'
import { type AuspiceYearOverviewPayload, fetchAuspiceYearOverview } from '@/lib/api'
import {
  CULTURE_CATEGORIES,
  type CultureCategoryKey,
  cultureSummary,
  getCultureCategory,
  getCultureEntryWikipediaUrl,
  isCultureCategoryKey,
  localizeFestival,
  localizeSolarTermName,
} from '@/lib/culture'
import { solarTermTargetId } from '@/lib/festival-content'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'

type Strings = ReturnType<typeof useStrings>['t']
type ThemeColors = ReturnType<typeof useTheme>['colors']
type ThemeSpacing = ReturnType<typeof useTheme>['spacing']

function parseGlossaryOpen(raw: string | string[] | undefined): CultureCategoryKey | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && isCultureCategoryKey(value) ? value : null
}

function categoryLabel(key: CultureCategoryKey, t: Strings): string {
  switch (key) {
    case 'festivals':
      return t.festivalsSection
    case 'jieqi':
      return t.solarTermsSection
    case 'shichen':
      return t.glossaryShichen
    case 'ganzhi':
      return t.glossaryGanzhi
    case 'sizhu':
      return t.glossarySizhu
    case 'ziwei':
      return t.glossaryZiwei
  }
}

function fmtMonthDay(iso: string): string {
  return `${iso.slice(5, 7)}/${iso.slice(8, 10)}`
}

export default function GlossaryScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const params = useLocalSearchParams<{ open?: string }>()
  const [open, setOpen] = useState<CultureCategoryKey | null>(() => parseGlossaryOpen(params.open))

  useEffect(() => {
    const next = parseGlossaryOpen(params.open)
    if (next) setOpen(next)
  }, [params.open])

  const [overview, setOverview] = useState<AuspiceYearOverviewPayload | null>(null)
  const [ovLoading, setOvLoading] = useState(false)
  const [ovError, setOvError] = useState(false)
  const loadOverview = useCallback(() => {
    setOvLoading(true)
    setOvError(false)
    fetchAuspiceYearOverview(new Date().getFullYear())
      .then(setOverview)
      .catch(() => setOvError(true))
      .finally(() => setOvLoading(false))
  }, [])
  useEffect(() => {
    if ((open === 'jieqi' || open === 'festivals') && !overview && !ovLoading && !ovError) {
      loadOverview()
    }
  }, [open, overview, ovLoading, ovError, loadOverview])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '300' }}>
          {t.glossaryTitle}
        </Text>
        <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
          {CULTURE_CATEGORIES.map((cat, i) => {
            const expanded = open === cat.key
            return (
              <View
                key={cat.key}
                style={{ borderTopWidth: i === 0 ? 0 : 0.5, borderTopColor: colors.separator }}
              >
                <Pressable
                  onPress={() => setOpen((cur) => (cur === cat.key ? null : cat.key))}
                  accessibilityRole='button'
                  accessibilityLabel={categoryLabel(cat.key, t)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.lg,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>
                    {categoryLabel(cat.key, t)}
                  </Text>
                  {expanded ? (
                    <ChevronDownIcon size={16} color={colors.dim} />
                  ) : (
                    <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
                  )}
                </Pressable>
                {expanded ? (
                  <View
                    style={{
                      paddingHorizontal: spacing.lg,
                      paddingBottom: spacing.lg,
                      gap: spacing.md,
                    }}
                  >
                    <CultureIntroBlock material={getCultureCategory(cat.key)} locale={locale} />
                    <CategoryBody
                      cat={cat.key}
                      overview={overview}
                      loading={ovLoading}
                      error={ovError}
                      onRetry={loadOverview}
                      colors={colors}
                      spacing={spacing}
                      t={t}
                      locale={locale}
                    />
                  </View>
                ) : null}
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function CategoryBody({
  cat,
  overview,
  loading,
  error,
  onRetry,
  colors,
  spacing,
  t,
  locale,
}: {
  cat: CultureCategoryKey
  overview: AuspiceYearOverviewPayload | null
  loading: boolean
  error: boolean
  onRetry: () => void
  colors: ThemeColors
  spacing: ThemeSpacing
  t: Strings
  locale: Locale
}) {
  if (cat === 'shichen') return <ShichenWheel />
  if (cat === 'ganzhi') return <GanzhiGrid />
  if (cat === 'sizhu') return <BaziPillars />
  if (cat === 'ziwei') return <ZiweiIntro />

  if (loading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }
  if (error || !overview) {
    return (
      <Pressable onPress={onRetry} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
        <Text style={{ color: colors.secondary, fontSize: 13 }}>
          {t.loadFailed} · {t.retry}
        </Text>
      </Pressable>
    )
  }

  if (cat === 'festivals') {
    return (
      <View style={{ gap: spacing.md }}>
        {overview.festivals.map((f) => (
          <EntryCard
            key={f.id}
            entryId={f.id}
            label={localizeFestival(f.id, locale, f.name)}
            sub={f.solarDate}
            colors={colors}
            spacing={spacing}
            locale={locale}
          />
        ))}
      </View>
    )
  }

  const terms = [...overview.solarTerms].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <View style={{ gap: spacing.md }}>
      {terms.map((term) => {
        const target = solarTermTargetId(term.name)
        return (
          <EntryCard
            key={term.index}
            entryId={target}
            label={localizeSolarTermName(term.name, locale)}
            sub={fmtMonthDay(term.date)}
            colors={colors}
            spacing={spacing}
            locale={locale}
          />
        )
      })}
    </View>
  )
}

/**
 * Flat inline entry card — no drill-in. Shows name + date + the 1-2 sentence
 * CULTURE_SUMMARIES blurb + a Wikipedia link. Replaces the prior ListRow that
 * pushed /festival/[id] (per 2026-06 feedback: the 3rd-level page felt too
 * deep for browsing the 8 festivals or 24 solar terms).
 */
function EntryCard({
  entryId,
  label,
  sub,
  colors,
  spacing,
  locale,
}: {
  entryId: string | null
  label: string
  sub: string
  colors: ThemeColors
  spacing: ThemeSpacing
  locale: Locale
}) {
  const summary = entryId ? cultureSummary(entryId, locale) : null
  const wikiUrl = entryId ? getCultureEntryWikipediaUrl(entryId, locale) : null
  return (
    <View
      style={{
        paddingVertical: spacing.sm,
        borderTopWidth: 0.5,
        borderTopColor: colors.separator,
        gap: 4,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{label}</Text>
        <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 1 }}>{sub}</Text>
      </View>
      {summary ? (
        <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>{summary}</Text>
      ) : null}
      {wikiUrl ? <CultureWikiLink url={wikiUrl} /> : null}
    </View>
  )
}
