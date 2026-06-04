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
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { AuspiceDayPayload, RokuyoInfo } from '@/lib/api'
import { localizeSolarTermName } from '@/lib/culture'
import type { RokuyoStrings } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { AuspicePaywallSheet } from './AuspicePaywallSheet'
import { ExplainSheet } from './ExplainSheet'
import { PersonalCard } from './PersonalCard'
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

export function DayView({ payload }: { payload: AuspiceDayPayload }) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { date, day } = payload
  // 干支日 · 农历 · 年干支 now lives ABOVE the calendar (see app/(tabs)/index.tsx,
  // DayIdentityHeader) per 2026-06 layout feedback — the calendar's bottom half
  // leads with 宜忌, the 重点 of a 黄历. DayView itself starts at 宜忌.
  const [explainField, setExplainField] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
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
        <YiJiBlock goodFor={day.goodFor} avoid={day.avoid} onSelect={setExplainField} />
      </View>

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
