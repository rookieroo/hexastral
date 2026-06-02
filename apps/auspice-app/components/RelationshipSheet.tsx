/**
 * 关系 reading (Pro) — the deterministic 生肖 relationship between the user and a
 * 亲友. Free users never reach this (the 亲友 screen opens the paywall instead);
 * Pro users see the two 生肖 + verdict (合/冲/平) + a line. No LLM / no API.
 */

import { useTheme } from '@zhop/core-ui'
import { SatelliteBottomSheet } from '@zhop/satellite-ui'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { type AuspiceBirthInfo, getAuspiceBirthInfo } from '@/lib/birth'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { openKindredCompose } from '@/lib/kindred-handoff'
import type { AuspicePerson } from '@/lib/people'
import { type RelVerdict, relationship } from '@/lib/relationship'

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

function verdictColor(v: RelVerdict, colors: ReturnType<typeof useTheme>['colors']): string {
  return v === '合' ? colors.success : v === '冲' ? colors.danger : colors.secondary
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
  const rel = selfDate && person ? relationship(selfDate, person.solarDate) : null

  // Load the full self birth info for the Kindred hand-off URL — selfDate alone
  // isn't enough; Kindred's draft accepts time/gender/city too. Only loads when
  // the sheet is opened to keep the unmount path cheap.
  const [self, setSelf] = useState<AuspiceBirthInfo | null>(null)
  useEffect(() => {
    if (!visible) return
    getAuspiceBirthInfo()
      .then((info) => setSelf(info ?? null))
      .catch(() => {})
  }, [visible])

  const personIsLunar = person?.calendar === 'lunar'
  const canOpenYuan = !!person && !personIsLunar
  const openYuan = () => {
    if (!person || personIsLunar) return
    void openKindredCompose({ person, self })
  }

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
            {/* Kindred hand-off — the 生肖 verdict is the cycle-side preview; the
                full 八字/紫微 合盘 lives in Kindred. Falls through to App Store
                if Kindred isn't installed. */}
            {canOpenYuan ? (
              <Pressable
                onPress={openYuan}
                accessibilityRole='button'
                accessibilityLabel={t.kindredComposeCta}
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
                  {t.kindredComposeCta}
                </Text>
              </Pressable>
            ) : personIsLunar ? (
              <Text
                style={{
                  color: colors.dim,
                  fontSize: 12,
                  lineHeight: 18,
                  textAlign: 'center',
                  paddingHorizontal: spacing.lg,
                }}
              >
                {t.kindredComposeLunarNote}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{t.people.needBirthBody}</Text>
        )}
      </View>
    </SatelliteBottomSheet>
  )
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
