/**
 * Birth onboarding · Step 1 — Date
 *
 * Inline iOS DateTimePicker. Default 1990-01-01 (mid-millennial baseline,
 * not "today" which would be cognitively jarring). Persists to draft, no
 * server roundtrip yet.
 */

import DateTimePicker from '@react-native-community/datetimepicker'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator'
import { updateBirthDraft, useBirthDraft } from '@/lib/birthDraft'
import { useI18n } from '@/lib/i18n'
import { useIosPalette, useTheme } from '@/lib/theme'

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function isoToDate(iso: string): Date {
  if (!iso) return new Date(1990, 0, 1)
  const [y, m, d] = iso.split('-').map((v) => Number.parseInt(v, 10))
  if (!y || !m || !d) return new Date(1990, 0, 1)
  return new Date(y, m - 1, d)
}

function dateToIso(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

export default function BirthDateScreen() {
  const router = useRouter()
  const { t, locale } = useI18n()
  const ios = useIosPalette()
  const { isDark } = useTheme()
  const draft = useBirthDraft()
  const [date, setDate] = useState<Date>(isoToDate(draft.solarDate || '1990-01-01'))

  const handleNext = () => {
    const iso = dateToIso(date)
    if (iso > todayIso()) return
    Haptics.selectionAsync()
    updateBirthDraft({ solarDate: iso })
    router.push('/birth-time')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        <ProgressIndicator step={1} total={5} />
        <View style={{ height: 28 }} />
        <Text style={{ color: ios.text, fontSize: 26, fontWeight: '500', letterSpacing: 0.4 }}>
          {t('birth_conv_date_title')}
        </Text>
        <View style={{ height: 28 }} />
        <DateTimePicker
          value={date}
          mode="date"
          display="inline"
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
          onChange={(_, selected) => {
            if (selected) setDate(selected)
          }}
          textColor={ios.text}
          accentColor={ios.text}
          themeVariant={isDark ? 'dark' : 'light'}
          locale={locale}
        />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleNext}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', paddingVertical: 12 }}
        >
          <Text
            style={{
              color: ios.text,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            {t('birth_conv_next')}
          </Text>
        </Pressable>
        <View style={{ height: 24 }} />
      </View>
    </SafeAreaView>
  )
}
