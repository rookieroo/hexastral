/**
 * MakeIfZeshiCard — the make-if MACRO 择时 panel (ADR-0023b).
 *
 * "你在权衡一件事? 看命势更宜哪一年." The user picks a decision (a CYCLE_EVENTS
 * subset), and the card ranks the next-few-years 流年 windows by how well each
 * supports that move — the deterministic decision台 (lib/makeIfZeshi → astro-core
 * rankWindowsForMove). Tapping a year hands off to the day-level 择日 (/event), so
 * macro picks the YEAR and 择日 picks the DAY.
 *
 * Free + deterministic (the instant trust layer); the LLM synthesis is the
 * deploy-gated P2. Self-contained: own theme/strings/router; only birth + payload
 * come from the make-if screen.
 */

import type { RankedMoveWindow } from '@zhop/astro-core'
import { useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { AuspiceEvent, TimelinePayload } from '@/lib/api'
import { type Locale, useStrings } from '@/lib/i18n-context'
import { MAKEIF_EVENTS, rankMakeIfWindows } from '@/lib/makeIfZeshi'

interface ZeshiCopy {
  title: string
  prompt: string
  best: string
  cta: string
}

/** Card chrome only (event names + reasons come from `t`); keeps lib/i18n.ts
 *  untouched, matching the home banner's local-copy pattern. */
const ZESHI_COPY: Record<Locale, ZeshiCopy> = {
  'zh-Hans': {
    title: '择时 · 哪一年更宜',
    prompt: '你在权衡一件事? 选一项,看命势更宜哪一年',
    best: '最宜',
    cta: '看吉日',
  },
  'zh-Hant': {
    title: '擇時 · 哪一年更宜',
    prompt: '你在權衡一件事? 選一項,看命勢更宜哪一年',
    best: '最宜',
    cta: '看吉日',
  },
  ja: {
    title: '択時 · どの年が向くか',
    prompt: '迷っている選択を一つ。命勢が向く年を見る',
    best: '最適',
    cta: '吉日を見る',
  },
  en: {
    title: 'Timing · which year fits',
    prompt: 'Weighing a choice? Pick one — see which year your chart favors',
    best: 'best',
    cta: 'see days',
  },
}

const FIT_DOT: Record<string, (c: ReturnType<typeof useTheme>['colors']) => string> = {
  吉: (c) => c.accent,
  平: (c) => c.secondary,
  凶: (c) => c.dim,
}

export function MakeIfZeshiCard({
  birth,
  payload,
}: {
  birth: { birthDate: string; birthHour: number; gender: 'M' | 'F' }
  payload: TimelinePayload
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const copy = ZESHI_COPY[locale]
  const [event, setEvent] = useState<AuspiceEvent | null>(null)

  const ranked = useMemo(
    () => (event ? rankMakeIfWindows(birth, event, payload) : []),
    [birth, event, payload]
  )
  const topScore = ranked[0]?.score

  const openZeji = (year: string, ev: AuspiceEvent) =>
    router.push(
      `/event?event=${ev}&from=${year}-02-01&to=${year}-05-01` as Parameters<typeof router.push>[0]
    )

  return (
    <View
      style={{
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: colors.separator,
        backgroundColor: colors.card,
        gap: spacing.sm,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{copy.title}</Text>
      <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{copy.prompt}</Text>

      {/* Decision chips — the CYCLE_EVENTS subset worth 择运. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingVertical: 2 }}
      >
        {MAKEIF_EVENTS.map((ev) => {
          const on = ev === event
          return (
            <Pressable
              key={ev}
              onPress={() => setEvent(on ? null : ev)}
              accessibilityRole='button'
              style={({ pressed }) => ({
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 0.5,
                borderColor: on ? colors.accent : colors.separator,
                backgroundColor: on ? colors.accentGhost : 'transparent',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{ color: on ? colors.accent : colors.text, fontSize: 13, fontWeight: '500' }}
              >
                {t.events[ev]}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {/* Ranked years — tap any to drop into day-level 择日 for that window. */}
      {event && ranked.length > 0 ? (
        <View style={{ gap: 2, marginTop: 2 }}>
          {ranked.map((w: RankedMoveWindow) => {
            const reasons = w.reasons.map((k) => t.yinzheng.signals[k]).join(' · ')
            const isBest = w.score === topScore && w.score > 0
            return (
              <Pressable
                key={w.key}
                onPress={() => openZeji(w.key, event)}
                accessibilityRole='button'
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: 7,
                  borderTopWidth: 0.5,
                  borderTopColor: colors.separator,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: (FIT_DOT[w.fit] ?? FIT_DOT.平)(colors),
                  }}
                />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600', width: 48 }}>
                  {w.key}
                </Text>
                <Text style={{ color: colors.dim, fontSize: 12, flex: 1 }} numberOfLines={1}>
                  {reasons || '—'}
                </Text>
                {isBest ? (
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '700' }}>
                    {copy.best}
                  </Text>
                ) : null}
                <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '600' }}>
                  {copy.cta}
                </Text>
                <ChevronRight size={14} color={colors.accent} strokeWidth={1.7} />
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
