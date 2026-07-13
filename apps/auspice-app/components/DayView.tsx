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
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import type { AuspiceDayPayload, RokuyoInfo } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { CultureSnippetCard } from '@/components/CultureSnippetCard'
import { dayIdentityLunarLabel } from '@/lib/calendar-display'
import { localizeSolarTermName } from '@/lib/culture'
import { cultureSnippetForHome, resolveCultureTargetId } from '@/lib/culture-preview'
import type { Locale, RokuyoStrings } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
import { buildLuckyGuide, favorableElementOf } from '@/lib/luckyGuide'
import { dayShareUrl, shareTaglineFor } from '@/lib/share'
import { localizeYijiVerb } from '@/lib/yiji-vocab'
import { AuspicePaywallSheet } from './AuspicePaywallSheet'
import { ExplainSheet } from './ExplainSheet'
import { PersonalCard } from './PersonalCard'
import { SHARE_PALETTE, ShareableCard } from './ShareableCard'
import { YiJiBlock } from './YiJiBlock'

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

const ROKUYO_TONE = ['good', 'bad', 'mixed', 'good', 'mixed', 'bad'] as const

function RokuyoStrip({ rokuyo, strings }: { rokuyo: RokuyoInfo; strings: RokuyoStrings }) {
  const { colors, spacing } = useTheme()
  const tone = ROKUYO_TONE[rokuyo.index] ?? 'mixed'
  const accent = tone === 'good' ? colors.accent : tone === 'bad' ? colors.dim : colors.secondary
  const meaning = strings.items[rokuyo.index] ?? ''
  return (
    <View>
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
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const { date, day } = payload
  const [explainField, setExplainField] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [exploreOpen, setExploreOpen] = useState(true)
  const { shotRef, capturing, share: shareImage } = useImageShare({ prewarm: true, warmKey: date })
  const lunar = day.lunarDate ? dayIdentityLunarLabel(day.lunarDate, locale as Locale) : undefined
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  const hookShown = pushHook != null

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
        <SectionLabel>{t.almanacSection}</SectionLabel>
        {festivalChip}

        {locale === 'ja' && day.rokuyo && t.rokuyo ? (
          <RokuyoStrip rokuyo={day.rokuyo} strings={t.rokuyo} />
        ) : null}

        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable
              onPress={() => shareImage(`${shareTaglineFor(locale)}\n${dayShareUrl(date, locale)}`)}
              hitSlop={12}
              accessibilityRole='button'
              accessibilityLabel='Share'
              style={{ padding: 4 }}
            >
              <Share2 size={18} color={colors.secondary} strokeWidth={1.6} />
            </Pressable>
          </View>
          <YiJiBlock goodFor={day.goodFor} avoid={day.avoid} onSelect={setExplainField} />
        </View>

        <View>
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
            title={`${day.ganZhi}${locale.startsWith('zh') || locale === 'ja' ? '日' : ''}`}
            subtitle={[date, lunar].filter(Boolean).join(' · ')}
          >
            <ShareYiJi goodFor={day.goodFor} avoid={day.avoid} locale={locale} t={t} />
          </ShareableCard>
        </View>
      ) : null}

      {/* ── Zone 2: Personal (push anchor) ── */}
      <View
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
          <Pressable
            onPress={() => router.push('/me')}
            accessibilityRole='button'
            accessibilityLabel={t.personalEmptyCta}
            style={({ pressed }) => ({
              borderRadius: 16,
              borderWidth: 0.5,
              borderColor: colors.separator,
              backgroundColor: colors.card,
              padding: spacing.lg,
              gap: spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
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
        )}
      </View>

      {/* ── Zone 3: Explore (expanded by default) ── */}
      {snippet ? (
        <View>
          <Pressable
            onPress={() => setExploreOpen((v) => !v)}
            accessibilityRole='button'
            accessibilityLabel={exploreOpen ? t.exploreCollapse : t.exploreExpand}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: exploreOpen ? spacing.sm : 0,
            }}
          >
            <SectionLabel>{t.exploreSection}</SectionLabel>
            <ChevronDownIcon
              size={16}
              color={colors.dim}
              strokeWidth={1.4}
              style={{ transform: [{ rotate: exploreOpen ? '180deg' : '0deg' }] }}
            />
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

const CHIP_HEIGHT = 32

function ShareYiJi({
  goodFor,
  avoid,
  locale,
  t,
}: {
  goodFor: string[]
  avoid: string[]
  locale: Parameters<typeof localizeYijiVerb>[1]
  t: ReturnType<typeof useStrings>['t']
}) {
  const Row = ({ label, items, color }: { label: string; items: string[]; color: string }) => (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <View style={{ minWidth: 24, minHeight: CHIP_HEIGHT, justifyContent: 'center' }}>
        <Text style={{ color, fontSize: 17, fontWeight: '700' }}>{label}</Text>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.length === 0 ? (
          <Text style={{ color: SHARE_PALETTE.dim, fontSize: 15 }}>—</Text>
        ) : (
          items.slice(0, 6).map((v) => (
            <View
              key={v}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 9,
                backgroundColor: `${color}14`,
                borderWidth: 1,
                borderColor: `${color}33`,
              }}
            >
              <Text style={{ color, fontSize: 15 }}>{localizeYijiVerb(v, locale)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
  return (
    <View style={{ gap: 14 }}>
      <Row label={t.suitable} items={goodFor} color='#16A34A' />
      <Row label={t.avoid} items={avoid} color='#DC2626' />
    </View>
  )
}
