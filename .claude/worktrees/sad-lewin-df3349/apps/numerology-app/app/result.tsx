/**
 * Result screen — six-number panel.
 *
 * v1.0 displays the deterministic numbers only. Each number is shown with a
 * one-line description; master numbers (11/22/33) get a small "Master" badge.
 * v1.5 will add an LLM-narrated paragraph per number — the slot is reserved
 * in the API response (`interpretation`).
 */

import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NumerologyResultCard } from '@/components/NumerologyResultCard'
import type { NumerologyReading } from '@/lib/api'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

function isReading(v: unknown): v is NumerologyReading {
  if (!v || typeof v !== 'object') return false
  const r = v as Record<string, unknown>
  return (
    typeof r.lifePath === 'number' &&
    typeof r.birthday === 'number' &&
    typeof r.expression === 'number' &&
    typeof r.soulUrge === 'number' &&
    typeof r.personality === 'number' &&
    typeof r.personalYear === 'number'
  )
}

export default function ResultScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const { colors } = useAppTheme()
  const { payload } = useLocalSearchParams<{ payload?: string }>()

  const reading = useMemo<NumerologyReading | null>(() => {
    if (!payload) return null
    try {
      const parsed = JSON.parse(payload)
      return isReading(parsed) ? parsed : null
    } catch {
      return null
    }
  }, [payload])

  if (!reading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 24 }}>
        <Text style={{ color: colors.secondary, fontSize: 13 }}>{t('computeError')}</Text>
        <View style={{ height: 16 }} />
        <Pressable onPress={() => router.replace('/compute')}>
          <Text style={{ color: colors.text, fontWeight: '500' }}>{t('resultRecompute')}</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const items = [
    { label: t('resultLifePath'), sub: t('resultLifePathSub'), n: reading.lifePath },
    { label: t('resultBirthday'), sub: t('resultBirthdaySub'), n: reading.birthday },
    { label: t('resultExpression'), sub: t('resultExpressionSub'), n: reading.expression },
    { label: t('resultSoulUrge'), sub: t('resultSoulUrgeSub'), n: reading.soulUrge },
    { label: t('resultPersonality'), sub: t('resultPersonalitySub'), n: reading.personality },
    { label: t('resultPersonalYear'), sub: t('resultPersonalYearSub'), n: reading.personalYear },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: 22,
          fontWeight: '500',
          letterSpacing: 0.4,
        }}
      >
        {t('resultTitle')}
      </Text>
      <Text
        style={{
          color: colors.secondary,
          fontSize: 12,
          marginTop: 4,
          letterSpacing: 0.4,
        }}
      >
        {reading.fullName} · {reading.birthDate}
      </Text>

      <View style={{ height: 24 }} />

      <View style={{ gap: 12 }}>
        {items.map((it) => (
          <NumerologyResultCard
            key={it.label}
            label={it.label}
            sub={it.sub}
            n={it.n}
            masterLabel={t('resultMaster')}
          />
        ))}
      </View>

      <View style={{ height: 32 }} />

      <Pressable
        onPress={() => router.replace('/compute')}
        style={{
          paddingVertical: 14,
          alignItems: 'center',
          borderWidth: 0.5,
          borderColor: colors.separator,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '400', letterSpacing: 1.4 }}>
          {t('resultRecompute')}
        </Text>
      </Pressable>
    </ScrollView>
  )
}
