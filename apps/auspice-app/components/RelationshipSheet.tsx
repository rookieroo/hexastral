/**
 * 关系 reading (Pro) — the deterministic relationship between the user and a 亲友.
 * Free users never reach this (the 亲友 screen opens the paywall instead). Pro
 * users see:
 *   1. the 生肖 verdict (合/冲/平) — the at-a-glance preview, no API
 *   2. 今日 · 你和TA — today's pair pulse (同气/相激/平和) over both charts
 *   3. 为你俩择吉日 — the next good days for the two of you
 *   4. a hand-off to Kindred for the full 八字/紫微 合盘
 *
 * (2) + (3) are the Auspice×Kindred bridge — the calendar-shaped relationship
 * action. They come from POST /api/auspice/pair (deterministic, no LLM; both
 * charts are the user's own data). Lunar-only 亲友 skip the pair section (the
 * day-pillar compute needs a solar date) and fall through to the Kindred note.
 */

import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspicePairResult, fetchAuspicePair, type PairStatus } from '@/lib/api'
import { type AuspiceBirthInfo, getAuspiceBirthInfo } from '@/lib/birth'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import type { AuspicePerson } from '@/lib/people'
import { type RelVerdict, relationship } from '@/lib/relationship'
import { sharePairDays } from '@/lib/share'

const TITLE: Record<Locale, string> = {
  'zh-Hans': '与 TA 的关系',
  'zh-Hant': '與 TA 的關係',
  ja: '相性',
  en: 'Relationship',
}

const VERDICT_LINE: Record<RelVerdict, Record<Locale, string>> = {
  合: {
    'zh-Hans': '生肖相合，相处和顺；多走动，情分更添。',
    'zh-Hant': '生肖相合，相處和順；多走動，情分更添。',
    ja: '干支の相性が良く、和やかに過ごせる間柄。',
    en: 'A harmonious zodiac match — an easy, warm rapport.',
  },
  冲: {
    'zh-Hans': '生肖相冲，性子易碰；多一分体谅，便化冲为合。',
    'zh-Hant': '生肖相沖，性子易碰；多一分體諒，便化沖為合。',
    ja: '干支が相沖；少しの思いやりで角が取れる。',
    en: 'A clashing zodiac pair — a little patience smooths it over.',
  },
  平: {
    'zh-Hans': '生肖平和，各自安好；顺其自然即可。',
    'zh-Hant': '生肖平和，各自安好；順其自然即可。',
    ja: '干支は穏やかな関係；自然体で問題なし。',
    en: 'A neutral zodiac pairing — comfortable as it is.',
  },
}

/** Intl tag per app locale — for the compact 吉日 date labels. */
const LOCALE_TAG: Record<Locale, string> = {
  'zh-Hans': 'zh-CN',
  'zh-Hant': 'zh-TW',
  ja: 'ja-JP',
  en: 'en-US',
}

function fmtMonthDay(dateStr: string, locale: Locale): string {
  try {
    return new Date(`${dateStr}T00:00:00`).toLocaleDateString(LOCALE_TAG[locale], {
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function verdictColor(v: RelVerdict, colors: ReturnType<typeof useTheme>['colors']): string {
  return v === '合' ? colors.success : v === '冲' ? colors.danger : colors.secondary
}

function pairStatusColor(s: PairStatus, colors: ReturnType<typeof useTheme>['colors']): string {
  return s === 'resonance' ? colors.success : s === 'tension' ? colors.danger : colors.secondary
}

export function RelationshipSheet({
  visible,
  onClose,
  selfDate,
  person,
}: {
  visible: boolean
  onClose: () => void
  selfDate: string | null
  person: AuspicePerson | null
}) {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const router = useRouter()
  const rel = selfDate && person ? relationship(selfDate, person.solarDate) : null

  // Full self birth info — needed for the Kindred hand-off URL (time/gender/city)
  // AND for the pair compute's 时柱 (self hour). Only loads while open.
  const [self, setSelf] = useState<AuspiceBirthInfo | null>(null)
  useEffect(() => {
    if (!visible) return
    getAuspiceBirthInfo()
      .then((info) => setSelf(info ?? null))
      .catch(() => {})
  }, [visible])

  const personIsLunar = person?.calendar === 'lunar'
  // The in-Auspice relationship timeline handles 农历 too, so it's reachable for any 亲友.
  const canOpenTimeline = !!person

  // ── 关系桥: 今日你和TA + 择吉日 (POST /api/auspice/pair) ──────────────────────
  // Eligible only once self birth is loaded and the 亲友 has a solar date — the
  // day-pillar synastry needs both Gregorian dates.
  const [pair, setPair] = useState<AuspicePairResult | null>(null)
  const [pairLoading, setPairLoading] = useState(false)
  useEffect(() => {
    if (!visible || !person || personIsLunar || !self?.solarDate) {
      setPair(null)
      setPairLoading(false)
      return
    }
    let cancelled = false
    setPair(null)
    setPairLoading(true)
    const selfHour = self.timeIndex == null ? -1 : self.timeIndex * 2
    const otherHour = person.timeIndex == null ? -1 : person.timeIndex * 2
    fetchAuspicePair({
      self: { date: self.solarDate, hour: selfHour },
      other: { date: person.solarDate, hour: otherHour },
      days: 45,
      locale,
    })
      .then((r) => {
        if (!cancelled) setPair(r)
      })
      .catch(() => {
        if (!cancelled) setPair(null)
      })
      .finally(() => {
        if (!cancelled) setPairLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [visible, person, personIsLunar, self, locale])

  // Open the full relationship timeline IN Auspice (the Kindred hand-off is frozen).
  const openTimeline = () => {
    if (!person) return
    onClose()
    router.push(`/relationship/${person.id}`)
  }

  const statusLabel = (s: PairStatus): string =>
    s === 'resonance' ? t.pair.resonance : s === 'tension' ? t.pair.tension : t.pair.neutral
  const statusLine = (s: PairStatus): string =>
    s === 'resonance'
      ? t.pair.resonanceLine
      : s === 'tension'
        ? t.pair.tensionLine
        : t.pair.neutralLine

  const today = pair?.today ?? null
  const picks = pair?.picks ?? []

  return (
    <SatelliteBottomSheet visible={visible} onClose={onClose} title={TITLE[locale]}>
      <View style={{ paddingHorizontal: spacing.xl, gap: spacing.lg, alignItems: 'center' }}>
        {rel ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <Pole label={t.people.self} animal={rel.selfAnimal} colors={colors} />
              <View
                style={{
                  paddingHorizontal: spacing.md,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: verdictColor(rel.verdict, colors),
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
                  {rel.verdict}
                </Text>
              </View>
              <Pole label={person?.name ?? 'TA'} animal={rel.otherAnimal} colors={colors} />
            </View>
            <Text style={{ color: colors.text, fontSize: 15, lineHeight: 24, textAlign: 'center' }}>
              {VERDICT_LINE[rel.verdict][locale]}
            </Text>

            {/* 今日你和TA + 择吉日 — the calendar-shaped relationship action. */}
            {!personIsLunar ? (
              <View style={{ alignSelf: 'stretch', gap: spacing.lg }}>
                {pairLoading && !pair ? (
                  <Text style={{ color: colors.dim, fontSize: 13, textAlign: 'center' }}>
                    {t.pair.loading}
                  </Text>
                ) : null}

                {today ? (
                  <View style={{ gap: 8 }}>
                    <SectionLabel colors={colors}>{t.pair.todayHeading}</SectionLabel>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: pairStatusColor(today.status, colors),
                        }}
                      >
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                          {statusLabel(today.status)}
                        </Text>
                      </View>
                      <Text style={{ color: colors.dim, fontSize: 12 }}>{today.ganZhi}</Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
                      {statusLine(today.status)}
                    </Text>
                  </View>
                ) : null}

                {pair ? (
                  <View style={{ gap: 8 }}>
                    <SectionLabel colors={colors}>{t.pair.picksHeading}</SectionLabel>
                    {picks.length > 0 ? (
                      picks.map((p) => (
                        <View
                          key={p.date}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: spacing.sm,
                          }}
                        >
                          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                            {fmtMonthDay(p.date, locale)}
                          </Text>
                          <Text
                            style={{ color: colors.dim, fontSize: 12, flexShrink: 1 }}
                            numberOfLines={1}
                          >
                            {p.ganZhi}
                            {p.yi.length ? `  ${t.suitable} ${p.yi.slice(0, 3).join(' ')}` : ''}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={{ color: colors.dim, fontSize: 13, lineHeight: 20 }}>
                        {t.pair.picksEmpty}
                      </Text>
                    )}
                    {picks.length > 0 && person ? (
                      <Pressable
                        onPress={() =>
                          void sharePairDays(
                            {
                              name: person.name,
                              days: picks.map((p) => ({ date: p.date, ganZhi: p.ganZhi })),
                            },
                            locale
                          )
                        }
                        accessibilityRole='button'
                        accessibilityLabel={t.pair.shareCta}
                        style={({ pressed }) => ({
                          alignSelf: 'flex-start',
                          marginTop: 4,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                          {t.pair.shareCta}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* The in-app pieces above are the 今日/择吉 preview; the full
                relationship timeline (大运/流年 节点 + 化解) opens IN Auspice. */}
            {canOpenTimeline ? (
              <Pressable
                onPress={openTimeline}
                accessibilityRole='button'
                accessibilityLabel={t.synastryTl.title}
                style={({ pressed }) => ({
                  alignSelf: 'stretch',
                  paddingVertical: 14,
                  borderRadius: 12,
                  borderWidth: 0.5,
                  borderColor: colors.accent,
                  backgroundColor: colors.accentGhost,
                  alignItems: 'center',
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
                  {t.synastryTl.title} →
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{t.people.needBirthBody}</Text>
        )}
      </View>
    </SatelliteBottomSheet>
  )
}

function SectionLabel({
  children,
  colors,
}: {
  children: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>{children}</Text>
}

function Pole({
  label,
  animal,
  colors,
}: {
  label: string
  animal: string
  colors: ReturnType<typeof useTheme>['colors']
}) {
  return (
    <View style={{ alignItems: 'center', gap: 4, minWidth: 56 }}>
      <Text style={{ color: colors.accent, fontSize: 30, fontWeight: '300' }}>{animal}</Text>
      <Text style={{ color: colors.dim, fontSize: 12 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}
