import { Button, useTheme } from '@zhop/core-ui'
import { saveAndCacheBirthInfo } from '@zhop/satellite-runtime'
import { router, Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { OracleBirthForm, type OracleBirthValue } from '@/components/OracleBirthForm'
import {
  draftHasThreePhotos,
  draftReadyForPaywall,
  getReadingDraft,
  hydrateReadingDraft,
  patchReadingDraft,
} from '@/lib/reading-draft'
import { useSatelliteI18n } from '@/lib/i18n'

export default function BirthScreen() {
  const { colors, spacing } = useTheme()
  const { locale } = useSatelliteI18n()
  const zh = locale.startsWith('zh')
  const [value, setValue] = useState<OracleBirthValue>({
    date: { input: '', calendar: 'solar', isLeap: false, solarDate: null },
    timeIndex: null,
    gender: null,
    city: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void hydrateReadingDraft().then((d) => {
      if (!draftHasThreePhotos(d)) {
        router.replace('/capture')
        return
      }
      if (d.solarDate) {
        setValue({
          date: {
            input: d.solarDate,
            calendar: 'solar',
            isLeap: false,
            solarDate: d.solarDate,
          },
          timeIndex: d.timeIndex ?? null,
          gender: d.gender ?? null,
          city: d.city ?? '',
        })
      }
    })
  }, [])

  const onContinue = async () => {
    if (busy) return
    const solarDate = (value.date.solarDate ?? value.date.input).trim()
    if (!solarDate || value.timeIndex == null || !value.gender) {
      setError(zh ? '请完整填写日期、时辰与性别' : 'Date, hour, and gender are required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      patchReadingDraft({
        solarDate,
        timeIndex: value.timeIndex,
        gender: value.gender,
        city: value.city.trim() || undefined,
      })
      try {
        await saveAndCacheBirthInfo({
          birthSolarDate: solarDate,
          birthTimeIndex: value.timeIndex,
          gender: value.gender,
          birthCity: value.city.trim() || undefined,
        })
      } catch {
        // Local draft is enough to reach paywall; portfolio save may need sign-in later.
      }
      if (!draftReadyForPaywall(getReadingDraft())) {
        setError(zh ? '资料不完整' : 'Incomplete draft')
        return
      }
      router.push('/paywall')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: spacing.xl, gap: spacing.lg }}
    >
      <Stack.Screen options={{ title: zh ? '生辰信息' : 'Birth info', headerShown: true }} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>
        {zh ? '录入生辰' : 'Your birth details'}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>
        {zh
          ? '完整解读需要三张照片与生辰。生辰用于形气与八字对照，不会单独公开。'
          : 'A complete reading needs three photos plus birth info for physiognomy × BaZi contrast.'}
      </Text>
      <OracleBirthForm locale={locale} value={value} onChange={setValue} />
      {error ? <Text style={{ color: colors.accent }}>{error}</Text> : null}
      <Button variant='primary' onPress={() => void onContinue()} disabled={busy}>
        {zh ? '继续到解锁' : 'Continue to unlock'}
      </Button>
    </ScrollView>
  )
}
