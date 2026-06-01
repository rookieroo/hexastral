/**
 * Onboarding · Screen 3 — Your birth date
 *
 * Inline date picker (iOS). Default value 1995-01-01 (mid-millennial baseline,
 * not "today" which would be cognitively jarring).
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { useDraft, updateDraft } from '@/lib/onboardingDraft'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isoToDate(iso: string): Date {
  if (!iso) return new Date(1995, 0, 1)
  const [y, m, d] = iso.split('-').map((v) => Number.parseInt(v, 10))
  if (!y || !m || !d) return new Date(1995, 0, 1)
  return new Date(y, m - 1, d)
}

function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function BirthDateScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const [date, setDate] = useState<Date>(isoToDate(draft.selfSolarDate || '1995-01-01'))

  const handleNext = () => {
    const iso = dateToIso(date)
    if (iso > todayIso()) return
    updateDraft({ selfSolarDate: iso })
    router.push('/(onboarding)/birth-time')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
        }}
      >
        <ProgressIndicator step={2} total={6} />
        <View style={{ height: yuanSpacing.xxl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'date.title')}</Text>
        <View style={{ height: yuanSpacing.xl }} />
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(_, selected) => {
            if (selected) setDate(selected)
          }}
          textColor={yuanLight.text}
          accentColor={yuanLight.accent}
          themeVariant="light"
          locale={locale}
        />
        <View style={{ flex: 1 }} />
        <Pressable onPress={handleNext} hitSlop={12} style={{ alignSelf: 'flex-end' }}>
          <Text style={yuanPresets.ctaText}>{t(locale, 'common.next')}</Text>
        </Pressable>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}
