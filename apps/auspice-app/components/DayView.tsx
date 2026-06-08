/**
 * Shared day renderer — hero + 宜忌 + 12 时辰 + 节气 window. Used by the Today tab
 * (with live-时辰 highlight) and the day-detail screen.
 *
 * Monetization (2026-06 flip): 宜忌 is table-stakes for any 黄历, so it renders
 * in full for everyone. The Pro wall sits on the differentiated value instead —
 * the 对你而言 personalization: free users see the 吉/凶/平 verdict, Pro unlocks
 * the per-reason reading. Other Pro gates (大运流年, specialized 择日) stack onto
 * the same paywall sheet.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useRouter } from 'expo-router'
import { Share2 } from 'lucide-react-native'
import { type ReactNode, useState } from 'react'
import { Pressable, Text, useWindowDimensions, View } from 'react-native'
import type { AuspiceDayPayload, RokuyoInfo } from '@/lib/api'
import { localizeSolarTermName } from '@/lib/culture'
import type { RokuyoStrings } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { useImageShare } from '@/lib/imageShare'
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

// 六曜 tone by Rokuyo.index (0=大安 … 5=仏滅). Restrained 3-tier coloring — 大安 /
// 友引 lean auspicious (accent), 仏滅 / 赤口 muted (dim), the split days neutral.
// A standard カレンダー convention, kept subtle so it reads as annotation, not a
// personal fortune claim.
const ROKUYO_TONE = ['good', 'bad', 'mixed', 'good', 'mixed', 'bad'] as const

/** 六曜 strip — JP-only day annotation; rendered above 宜忌 in the ja DayView. */
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
  afterYiji,
}: {
  payload: AuspiceDayPayload
  /** Slot rendered directly under 宜忌 (the 重点) — the timeline + make-if CTAs. */
  afterYiji?: ReactNode
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { width: screenWidth } = useWindowDimensions()
  const { date, day } = payload
  // 干支日 · 农历 · 年干支 now lives ABOVE the calendar (see app/(tabs)/index.tsx,
  // DayIdentityHeader) per 2026-06 layout feedback — the calendar's bottom half
  // leads with 宜忌, the 重点 of a 黄历. DayView itself starts at 宜忌.
  const [explainField, setExplainField] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  // Image share: capture a 宜忌 card to a PNG on-device (instant — the old URL
  // share made iOS block on a cold-Worker OG fetch). The /s/day URL rides along
  // as the caption for the install funnel.
  // Pre-warm the capture so tapping share is instant (no 320ms paint+capture
  // wait). Re-warms when the day changes. The 宜忌 card is light (no Skia), so
  // keeping it mounted off-screen is cheap.
  const { shotRef, capturing, share: shareImage } = useImageShare({ prewarm: true, warmKey: date })
  const lunar = day.lunarDate
    ? locale === 'en'
      ? `Lunar ${day.lunarDate.month}/${day.lunarDate.day}`
      : `${day.lunarDate.monthName}${day.lunarDate.dayName}`
    : undefined
  // Pro gating (Sprint 2 chunk 8). `universe_pro` mirrors into `auspice_pro`
  // server-side per ADR-0015 §"Universe Bundle", and `useEntitlements` mirrors
  // that locally too, so checking `auspice_pro` alone covers both purchase paths.
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

  return (
    <View style={{ gap: spacing.xl }}>
      {/* 六曜 (JP only) —旧暦-derived calendar annotation Japanese users expect on
          any カレンダー. Sits above 宜忌 to group the day-quality read together. */}
      {locale === 'ja' && day.rokuyo && t.rokuyo ? (
        <RokuyoStrip rokuyo={day.rokuyo} strings={t.rokuyo} />
      ) : null}

      {/* 宜忌 — table-stakes for a 黄历, so it leads the day detail right under the
          calendar (the 重点), above 对你而言. The day identity (干支日 · 农历 · 年)
          moved above the calendar. (2026-06 IA feedback.) */}
      <View>
        {/* Share the day's 宜忌 as an IMAGE (captured on-device → instant; the
            old URL share made iOS wait on a cold-Worker OG fetch). */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Pressable
            onPress={() => shareImage(`${shareTaglineFor(locale)}\n${dayShareUrl(date, locale)}`)}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel='Share'
            style={{ padding: 4 }}
          >
            {/* `Share2` (share-network glyph); make-if uses `GitBranch`, so the
                two no longer collide. */}
            <Share2 size={18} color={colors.secondary} strokeWidth={1.6} />
          </Pressable>
        </View>
        <YiJiBlock goodFor={day.goodFor} avoid={day.avoid} onSelect={setExplainField} />
      </View>

      {/* Off-screen capture target for the 宜忌 image share (Skia-free). */}
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

      {/* Timeline + make-if CTAs — directly below 宜忌 (the most-tapped zone) per
          layout feedback, above 对你而言. */}
      {afterYiji}

      {/* Honest For-you (Sprint 3.5 / ADR-0020), now the primary Pro wall:
            - birth set → PersonalCard: 吉/凶/平 verdict free, per-reason locked
            - no birth → placeholder inviting user to /me to set birth
          The card NEVER appears as a mocked / static badge — its presence
          carries information about the user's setup. */}
      {payload.personalization ? (
        <PersonalCard
          data={payload.personalization}
          locked={!isPro}
          onUnlock={() => setPaywallOpen(true)}
          // Pro: open the deep LLM reading of today's 对你而言 (ExplainSheet carries
          // dayMaster, so it's personalized). The verdict is the explain subject.
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

      <View>
        <SectionLabel>{t.solarTerm}</SectionLabel>
        <Text style={{ color: colors.text, fontSize: 14 }}>
          {localizeSolarTermName(day.solarTerm.prev.name, locale)} ({day.solarTerm.prev.date}) →{' '}
          {localizeSolarTermName(day.solarTerm.next.name, locale)} ({day.solarTerm.next.date})
        </Text>
      </View>

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

/** Chip height (paddingVertical 6·2 + ~15px line + border) — the 宜/忌 label box
 *  matches it so the label centers on the first chip row. */
const CHIP_HEIGHT = 32

/** 宜 / 忌 chip rows for the shareable image card — fixed ivory palette, verbs
 *  localized. Mirrors the web `/s/day` OG card. */
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
      {/* Label box matches one chip's height + centers, so 宜/忌 sits on the
          baseline of the first chip row instead of floating above it. */}
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
      {/* 宜/忌 headings use the modern 五行 hues — emerald-600 (木, growth) for
          GOOD FOR, red-600 (火, caution) for AVOID. Coherent with the rest of
          the modernized palette. */}
      <Row label={t.suitable} items={goodFor} color='#16A34A' />
      <Row label={t.avoid} items={avoid} color='#DC2626' />
    </View>
  )
}
