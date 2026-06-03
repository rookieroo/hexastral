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
import type { AuspiceDayPayload } from '@/lib/api'
import { localizeSolarTermName } from '@/lib/culture'
import { useStrings } from '@/lib/i18n-context'
import { AuspicePaywallSheet } from './AuspicePaywallSheet'
import { ExplainSheet } from './ExplainSheet'
import { HourScrubber } from './HourScrubber'
import { PersonalCard } from './PersonalCard'
import { YiJiBlock } from './YiJiBlock'

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** The 地支 of the 时辰 covering the current wall-clock hour (子时 spans 23:00). */
function currentBranch(): string {
  const h = new Date().getHours()
  return BRANCHES[h === 23 ? 0 : Math.floor((h + 1) / 2)] ?? '子'
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

export function DayView({
  payload,
  today = false,
}: {
  payload: AuspiceDayPayload
  today?: boolean
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const { date, day } = payload
  // Slim 黄历 header bits — replaces the removed DailyCard hero on home (that
  // card is really a widget/watch preview, not home content). 干支日 · 农历 · 年.
  const ld = day.lunarDate
  const yg = day.yearGanZhi
  const dayGanzhiLabel = `${day.ganZhi}${locale.startsWith('zh') ? '日' : ''}`
  const dayHeaderSub = [
    ld ? (locale === 'en' ? `Lunar ${ld.month}/${ld.day}` : `${ld.monthName}${ld.dayName}`) : '',
    yg && locale !== 'en' ? `${yg.stem}${yg.branch}年` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const [explainField, setExplainField] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)
  // Pro gating (Sprint 2 chunk 8). `universe_pro` mirrors into `auspice_pro`
  // server-side per ADR-0015 §"Universe Bundle", and `useEntitlements` mirrors
  // that locally too, so checking `auspice_pro` alone covers both purchase paths.
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

  return (
    <View style={{ gap: spacing.xl }}>
      {/* Slim 黄历 identity — 干支日 · 农历 · 年干支. The bulky hero card moved out
          (it reads as a widget/watch preview, not home content; 2026-06 IA feedback). */}
      <View
        style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: spacing.sm }}
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '500', letterSpacing: 1 }}>
          {dayGanzhiLabel}
        </Text>
        {dayHeaderSub ? (
          <Text style={{ color: colors.dim, fontSize: 13 }}>{dayHeaderSub}</Text>
        ) : null}
      </View>

      {/* 宜忌 — table-stakes for a 黄历, so it leads the day detail right under the
          calendar (the 重点), above 对你而言. (2026-06 IA feedback.) */}
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
        <SectionLabel>{t.auspiciousHours}</SectionLabel>
        <HourScrubber hours={day.hours} activeBranch={today ? currentBranch() : undefined} />
      </View>

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
      />
      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </View>
  )
}
