/**
 * /glossary — the 文化 hub. Single-screen toggle list (2026-06 redesign): each
 * big category is an accordion; expanding shows its content inline, so the IA is
 * hub → content (no separate category page, no list→list). 节气/节日 expand to a
 * flat tappable list → /festival/[id] intro; 时辰/干支/八字 render their reference
 * visual inline; 紫微 shows intro + Wikipedia. Each section opens with a localized
 * cultural-background blurb + Wikipedia link. 100% free (ADR-0020).
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { type Href, useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CultureIntroBlock } from '@/components/culture/CultureIntroBlock'
import { BaziPillars } from '@/components/glossary/BaziPillars'
import { GanzhiGrid } from '@/components/glossary/GanzhiGrid'
import { ShichenWheel } from '@/components/glossary/ShichenWheel'
import { ZiweiIntro } from '@/components/glossary/ZiweiIntro'
import { type CycleYearOverviewPayload, fetchCycleYearOverview } from '@/lib/api'
import {
  CULTURE_CATEGORIES,
  type CultureCategoryKey,
  getCultureCategory,
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
  const router = useRouter()
  const params = useLocalSearchParams<{ open?: string }>()
  const [open, setOpen] = useState<CultureCategoryKey | null>(() => parseGlossaryOpen(params.open))

  useEffect(() => {
    const next = parseGlossaryOpen(params.open)
    if (next) setOpen(next)
  }, [params.open])

  const [overview, setOverview] = useState<CycleYearOverviewPayload | null>(null)
  const [ovLoading, setOvLoading] = useState(false)
  const [ovError, setOvError] = useState(false)
  const loadOverview = useCallback(() => {
    setOvLoading(true)
    setOvError(false)
    fetchCycleYearOverview(new Date().getFullYear())
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
                      onOpen={(id) => router.push(`/festival/${id}` as Href)}
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
  onOpen,
}: {
  cat: CultureCategoryKey
  overview: CycleYearOverviewPayload | null
  loading: boolean
  error: boolean
  onRetry: () => void
  colors: ThemeColors
  spacing: ThemeSpacing
  t: Strings
  locale: Locale
  onOpen: (id: string) => void
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
      <View>
        {overview.festivals.map((f) => (
          <ListRow
            key={f.id}
            label={localizeFestival(f.id, locale, f.name)}
            sub={f.solarDate}
            onPress={() => onOpen(f.id)}
            colors={colors}
            spacing={spacing}
          />
        ))}
      </View>
    )
  }

  const terms = [...overview.solarTerms].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <View>
      {terms.map((term) => {
        const target = solarTermTargetId(term.name)
        return (
          <ListRow
            key={term.index}
            label={localizeSolarTermName(term.name, locale)}
            sub={fmtMonthDay(term.date)}
            onPress={() => target && onOpen(target)}
            disabled={!target}
            colors={colors}
            spacing={spacing}
          />
        )
      })}
    </View>
  )
}

function ListRow({
  label,
  sub,
  onPress,
  disabled,
  colors,
  spacing,
}: {
  label: string
  sub: string
  onPress: () => void
  disabled?: boolean
  colors: ThemeColors
  spacing: ThemeSpacing
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole='button'
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
      <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 1 }}>{sub}</Text>
    </Pressable>
  )
}
