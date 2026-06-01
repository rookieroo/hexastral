/**
 * Onboarding · Screen 4 — Your birth time
 *
 * Time picker + "I don't know" skip. Backend uses 0-12 shichen indexing —
 * we convert HH:mm → shichen on submit.
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

/** Convert a Date (only hh:mm matters) to 0..12 shichen index */
function hourToTimeIndex(date: Date): number {
  const h = date.getHours()
  if (h === 0) return 0
  if (h === 23) return 12
  return Math.floor((h + 1) / 2)
}

export default function BirthTimeScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const [time, setTime] = useState<Date>(() => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    return d
  })

  const handleNext = () => {
    updateDraft({ selfTimeIndex: hourToTimeIndex(time) })
    router.push('/(onboarding)/birth-place')
  }

  const handleSkip = () => {
    updateDraft({ selfTimeIndex: null })
    router.push('/(onboarding)/birth-place')
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
        <ProgressIndicator step={3} total={6} />
        <View style={{ height: yuanSpacing.xxl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'time.title')}</Text>
        <View style={{ height: yuanSpacing.xl }} />
        <DateTimePicker
          value={time}
          mode="time"
          display="spinner"
          onChange={(_, selected) => {
            if (selected) setTime(selected)
          }}
          textColor={yuanLight.text}
          themeVariant="light"
          locale={locale}
        />
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Text style={[yuanType.caption, { color: yuanLight.textMuted, textDecorationLine: 'underline' }]}>
              {t(locale, 'time.unknown')}
            </Text>
          </Pressable>
          <Pressable onPress={handleNext} hitSlop={12}>
            <Text style={yuanPresets.ctaText}>{t(locale, 'common.next')}</Text>
          </Pressable>
        </View>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}
