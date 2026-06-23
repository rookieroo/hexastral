/**
 * MonthlyFortuneCard — the home's 本月运势 (this-month forecast).
 *
 * The recurring hook: a card on the Yuel home that recomputes each month from the
 * current 流月 against the user's 命盘 (deterministic, no LLM — instant + free).
 * A cinnabar "已更新" dot shows when this month's reading hasn't been opened yet
 * (last-seen month persisted in AsyncStorage); tapping the card clears it.
 *
 * P6a (this): the deterministic taste, visible to everyone — the engagement engine.
 * P6b (next): an LLM-enriched depth for Pro layers on the same computation.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { isCjkLocale, kindredFonts } from '@zhop/scenario-kindred'
import { composeMonthlyFortune } from '@zhop/scenario-yuan/monthly-fortune'
import type { FateNatalChart } from '@zhop/scenario-yuan/natal'
import { useEffect, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { Locale } from '@/lib/i18n'

const SEEN_KEY = 'yuel_fortune_seen_month'

const KICKER: Record<Locale, string> = {
  en: 'THIS MONTH',
  zh: '本月运势',
  'zh-Hant': '本月運勢',
  ja: '今月の運勢',
}

export function MonthlyFortuneCard({ chart, locale }: { chart: FateNatalChart; locale: Locale }) {
  const fortune = useMemo(() => composeMonthlyFortune({ chart, locale }), [chart, locale])
  const cjk = isCjkLocale(locale)
  const bodyFont = cjk ? kindredFonts.cjk : kindredFonts.serif

  const [isNew, setIsNew] = useState(false)
  useEffect(() => {
    let cancelled = false
    void AsyncStorage.getItem(SEEN_KEY).then((seen) => {
      if (!cancelled && seen !== fortune.monthKey) setIsNew(true)
    })
    return () => {
      cancelled = true
    }
  }, [fortune.monthKey])

  const markSeen = () => {
    if (!isNew) return
    setIsNew(false)
    void AsyncStorage.setItem(SEEN_KEY, fortune.monthKey).catch(() => {})
  }

  return (
    <Pressable
      onPress={markSeen}
      accessibilityRole='button'
      style={({ pressed }) => [
        {
          marginHorizontal: 20,
          marginBottom: 8,
          borderWidth: 0.5,
          borderColor: kindredDark.border,
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 18,
          backgroundColor: kindredDark.card,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 10,
            letterSpacing: 2.5,
            color: kindredDark.accent,
            textTransform: 'uppercase',
          }}
        >
          {KICKER[locale]}
        </Text>
        {isNew ? (
          <View
            style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: kindredDark.seal }}
          />
        ) : null}
        <View style={{ flex: 1 }} />
        <Text style={{ fontFamily: kindredFonts.mono, fontSize: 10, color: kindredDark.textMuted }}>
          {fortune.monthLabel} · {fortune.ganZhi}
        </Text>
      </View>

      <Text
        style={{
          fontFamily: bodyFont,
          fontSize: 16,
          letterSpacing: 0.5,
          color: kindredDark.text,
          marginBottom: 8,
        }}
      >
        {fortune.headline}
      </Text>
      <Text
        style={{
          fontFamily: bodyFont,
          fontSize: 13.5,
          lineHeight: 21,
          color: kindredDark.textSecondary,
        }}
      >
        {fortune.body}
      </Text>
    </Pressable>
  )
}
