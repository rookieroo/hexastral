/**
 * Shared day renderer — three Today zones: Almanac · Personal · Explore.
 *
 * Monetization: 宜忌 is table-stakes; Pro wall sits on 对你而言 per-reason detail.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { type Href, useRouter } from 'expo-router'
import { Share2 } from 'lucide-react-native'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Text, useWindowDimensions, View } from 'react-native'
import { Pressable } from 'react-native-gesture-handler'
import type { AuspiceDayPayload, RokuyoInfo } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { CultureSnippetCard } from '@/components/CultureSnippetCard'
import {
  dayIdentityLunarLabel,
  formatGregorianIdentity,
} from '@/lib/calendar-display'
import { localizeSolarTermName } from '@/lib/culture'
import { cultureSnippetForHome, resolveCultureTargetId } from '@/lib/culture-preview'
import type { Locale, RokuyoStrings } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
import { buildLuckyGuide, favorableElementOf } from '@/lib/luckyGuide'
import { dayShareUrl, shareTaglineFor } from '@/lib/share'
import { ganzhiPinyin } from '@/lib/ganzhi-pinyin'
import { displayYijiVerb } from '@/lib/yiji-vocab'
import { useYijiDisplayMode } from '@/lib/yiji-mode-context'
import { AuspicePaywallSheet } from './AuspicePaywallSheet'
import { ExplainSheet } from './ExplainSheet'
import { PersonalCard } from './PersonalCard'
import { type SharePalette, ShareableCard, sharePaletteFor } from './ShareableCard'
import { YiJiBlock } from './YiJiBlock'

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>{children}</Text>
  )
}

const ROKUYO_TONE = ['good', 'bad', 'mixed', 'good', 'mixed', 'bad'] as const

function RokuyoStrip({ rokuyo, strings }: { rokuyo: RokuyoInfo; strings: RokuyoStrings }) {
  const { colors, spacing } = useTheme()
  const tone = ROKUYO_TONE[rokuyo.index] ?? 'mixed'
  const accent = tone === 'good' ? colors.accent : tone === 'bad' ? colors.dim : colors.secondary
  const meaning = strings.items[rokuyo.index] ?? ''
  return (
    <View style={{ gap: spacing.sm }}>
      <SectionLabel>{strings.label}</SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: accent,
            backgroundColor: colors.card,
            alignItems: 'center',
            minWidth: 64,
          }}
        >
          <Text style={{ color: accent, fontSize: 20, fontWeight: '600', letterSpacing: 1 }}>
            {rokuyo.name}
          </Text>
          <Text style={{ color: colors.dim, fontSize: 10, marginTop: 2 }}>{rokuyo.reading}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 13, lineHeight: 19 }}>{meaning}</Text>
          <Text style={{ color: colors.dim, fontSize: 11, lineHeight: 16 }}>{strings.caption}</Text>
        </View>
      </View>
    </View>
  )
}

export function DayView({
  payload,
  pushHook,
  onPersonalSectionLayout,
  festivalChip,
}: {
  payload: AuspiceDayPayload
  /** Daily hook from push payload — rendered atop PersonalCard, not a separate hero. */
  pushHook?: { title: string; lens: string } | null
  /** Reports Y offset of the personal zone for scroll-to on notification tap. */
  onPersonalSectionLayout?: (y: number) => void
  /** Optional festival / solar-term chip rendered in the almanac zone. */
  festivalChip?: ReactNode
}) {
  const { colors, spacing, isDark } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const { date, day } = payload
  const [explainField, setExplainField] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(true)
  const sharePalette = sharePaletteFor(isDark)
  const { shotRef, capturing, share: shareImage } = useImageShare({
    prewarm: true,
    warmKey: `${date}-${isDark ? 'd' : 'l'}`,
  })
  const lunar = day.lunarDate ? dayIdentityLunarLabel(day.lunarDate, locale as Locale) : undefined
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const hookShown = pushHook != null

  const isZh = locale === 'zh-Hans' || locale === 'zh-Hant'
  const dayGanzhiLabel = `${day.ganZhi}${isZh || locale === 'ja' ? '日' : ''}`
  const dayGanzhiPinyin = locale === 'en' ? (ganzhiPinyin(day.ganZhi)?.toned ?? null) : null
  const gregorian = formatGregorianIdentity(date, locale as Locale)
  const yg = day.yearGanZhi
  const identitySub = [
    gregorian,
    lunar,
    isZh && yg ? `${yg.stem}${yg.branch}年` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  const [favEl, setFavEl] = useState<ReturnType<typeof favorableElementOf>>(null)
  useEffect(() => {
    let alive = true
    void getAuspiceBirthInfo().then((b) => {
      if (alive) setFavEl(favorableElementOf(b))
    })
    return () => {
      alive = false
    }
  }, [])
  const lucky = useMemo(
    () => (payload.personalization ? buildLuckyGuide(favEl, day.hours) : null),
    [favEl, day.hours, payload.personalization]
  )

  const cultureId = resolveCultureTargetId(day)
  const snippet = cultureSnippetForHome(day, locale)
  const onCultureDay = cultureId !== null
  const upcomingTagline =
    snippet && !onCultureDay
      ? t.cultureUpcomingTerm.replace('{name}', snippet.title)
      : undefined

  return (
    <View style={{ gap: spacing.xl }}>
      {/* ── Zone 1: Almanac ── */}
      <View style={{ gap: spacing.md }}>
        {festivalChip}

        {locale === 'ja' && day.rokuyo && t.rokuyo ? (
          <RokuyoStrip rokuyo={day.rokuyo} strings={t.rokuyo} />
        ) : null}

        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.md,
              marginBottom: spacing.sm,
            }}
          >
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: spacing.sm,
              }}
            >
              <View>
                <Text
                  style={{ color: colors.text, fontSize: 22, fontWeight: '500', letterSpacing: 1 }}
                >
                  {dayGanzhiLabel}
                </Text>
                {dayGanzhiPinyin ? (
                  <Text style={{ color: colors.dim, fontSize: 12, letterSpacing: 0.5 }}>
                    {dayGanzhiPinyin}
                  </Text>
                ) : null}
              </View>
              {identitySub ? (
                <Text style={{ color: colors.dim, fontSize: 13 }}>{identitySub}</Text>
              ) : null}
            </View>
            <Pressable
              onPress={() => shareImage(`${shareTaglineFor(locale)}\n${dayShareUrl(date, locale)}`)}
              hitSlop={12}
              accessibilityRole='button'
              accessibilityLabel='Share'
              style={({ pressed }) => ({
                minWidth: 44,
                minHeight: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.55 : 1,
              })}
            >
              <View pointerEvents='none'>
                <Share2 size={18} color={colors.secondary} strokeWidth={1.6} />
              </View>
            </Pressable>
          </View>
          <YiJiBlock goodFor={day.goodFor} avoid={day.avoid} onSelect={setExplainField} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <SectionLabel>{t.solarTerm}</SectionLabel>
          <Text style={{ color: colors.text, fontSize: 14 }}>
            {localizeSolarTermName(day.solarTerm.prev.name, locale)} ({day.solarTerm.prev.date}) →{' '}
            {localizeSolarTermName(day.solarTerm.next.name, locale)} ({day.solarTerm.next.date})
          </Text>
        </View>
      </View>

      {capturing ? (
        <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents='none'>
          <ShareableCard
            ref={shotRef}
            width={screenWidth}
            locale={locale}
            title={dayGanzhiLabel}
            subtitle={[date, lunar].filter(Boolean).join(' · ')}
          >
            <ShareYiJi
              goodFor={day.goodFor}
              avoid={day.avoid}
              locale={locale}
              t={t}
              palette={sharePalette}
            />
          </ShareableCard>
        </View>
      ) : null}

      {/* ── Zone 2: Personal (push anchor) ── */}
      <View
        style={{ gap: spacing.sm }}
        onLayout={(e) => {
          onPersonalSectionLayout?.(e.nativeEvent.layout.y)
        }}
      >
        <SectionLabel>{t.personal.forYou}</SectionLabel>
        {payload.personalization ? (
          <PersonalCard
            data={payload.personalization}
            lucky={lucky}
            locked={!isPro}
            pushHook={pushHook}
            hideSummaryLine={hookShown}
            onUnlock={() => setPaywallOpen(true)}
            onDeepRead={() => setExplainField(t.personal.fit[payload.personalization!.fit])}
          />
        ) : (
          <View
            style={{
              borderRadius: 16,
              borderWidth: 0.5,
              borderColor: colors.separator,
              backgroundColor: colors.card,
              padding: spacing.lg,
              gap: spacing.sm,
            }}
          >
            {pushHook ? (
              <View style={{ gap: 4, marginBottom: spacing.xs }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                  {pushHook.title}
                </Text>
                <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
                  {pushHook.lens}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                {t.personal.forYou}
              </Text>
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </View>
            <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 19 }}>
              {t.personalEmptyBody}
            </Text>
            {/* CTA only — wrapping the whole card in Pressable made left-swipe fire
                both the home Settings pan and a touch-up push to /me. */}
            <Pressable
              onPress={() => router.push('/me')}
              accessibilityRole='button'
              accessibilityLabel={t.personalEmptyCta}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1, alignSelf: 'flex-start' })}
            >
              <Text
                style={{
                  color: colors.accent,
                  fontSize: 13,
                  fontWeight: '600',
                  letterSpacing: 1,
                  marginTop: 2,
                }}
              >
                {t.personalEmptyCta}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Zone 3: Explore (expanded by default) ── */}
      {snippet ? (
        <View>
          <Pressable
            onPress={() => setExploreOpen((v) => !v)}
            accessibilityRole='button'
            accessibilityState={{ expanded: exploreOpen }}
            accessibilityLabel={exploreOpen ? t.exploreCollapse : t.exploreExpand}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 6,
              marginBottom: exploreOpen ? spacing.sm : 0,
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <SectionLabel>{t.exploreSection}</SectionLabel>
            {/* pointerEvents none — SVG chevrons can swallow the Pressable tap. */}
            <View
              pointerEvents='none'
              style={{ transform: [{ rotate: exploreOpen ? '180deg' : '0deg' }] }}
            >
              <ChevronDownIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </View>
          </Pressable>
          {exploreOpen ? (
            <CultureSnippetCard snippet={snippet} upcomingTagline={upcomingTagline} />
          ) : null}
        </View>
      ) : null}

      <ExplainSheet
        date={date}
        field={explainField}
        ganZhi={day.ganZhi}
        dayMaster={payload.personalization?.dayMaster}
        onClose={() => setExplainField(null)}
        onUpgrade={() => {
          setExplainField(null)
          setPaywallOpen(true)
        }}
      />
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </View>
  )
}

const CHIP_HEIGHT = 28

function ShareYiJi({
  goodFor,
  avoid,
  locale,
  t,
  palette,
}: {
  goodFor: string[]
  avoid: string[]
  locale: Locale
  t: ReturnType<typeof useStrings>['t']
  palette: SharePalette
}) {
  const { colors, spacing, isDark } = useTheme()
  const { mode } = useYijiDisplayMode()
  // Match on-screen YiJiBlock: only the 宜/忌 headers are tinted; chips stay neutral.
  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(43,33,24,0.04)'

  const Column = ({
    label,
    items,
    accent,
  }: {
    label: string
    items: string[]
    accent: string
  }) => (
    <View style={{ flex: 1, gap: spacing.sm }}>
      <Text
        style={{
          color: accent,
          fontSize: 13,
          fontWeight: '700',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
        {items.length === 0 ? (
          <Text style={{ color: palette.dim, fontSize: 14 }}>—</Text>
        ) : (
          items.slice(0, 8).map((v) => (
            <View
              key={v}
              style={{
                paddingHorizontal: spacing.sm,
                paddingVertical: 4,
                minHeight: CHIP_HEIGHT,
                borderRadius: 8,
                backgroundColor: chipBg,
                borderWidth: 0.5,
                borderColor: palette.separator,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: palette.text, fontSize: 14 }}>
                {displayYijiVerb(v, locale, mode)}
              </Text>
            </View>
          ))
        )}
      </View>
    </View>
  )

  return (
    <View style={{ flexDirection: 'row', gap: spacing.lg }}>
      <Column label={t.suitable} items={goodFor} accent={colors.success} />
      <Column label={t.avoid} items={avoid} accent={colors.danger} />
    </View>
  )
}
