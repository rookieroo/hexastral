/**
 * Birth onboarding · Step 0 — Intro / Welcome
 *
 * Phase C.1 form-as-conversation entry. Replaces the previous accordion-style
 * edit page. Existing callers `router.push('/birth-info')` land here.
 *
 * Contract preserved: the draft accumulates `solarDate`, `timeIndex`, `gender`,
 * `birthCity`, `latitude`, `longitude`, `timezoneId`, then the review step
 * issues the same `PUT /api/user/:userId/birth-info` payload as before, so the
 * server is unchanged.
 *
 * If a user already has birth info, we seed the draft so they can review or
 * edit individual fields without re-entering everything.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { seedBirthDraftFrom } from '@/lib/birthDraft'
import { getBirthInfo } from '@/lib/domain/birthInfo'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

export default function BirthInfoIntroScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const ios = useIosPalette()

  // Pre-fill the draft from any existing birth info so the flow doubles as edit.
  useEffect(() => {
    void getBirthInfo().then((info) => {
      seedBirthDraftFrom({
        solarDate: info.solarDate,
        timeIndex: info.timeIndex,
        gender: info.gender,
        birthCity: info.birthCity,
        latitude: info.latitude,
        longitude: info.longitude,
        timezoneId: info.timezoneId,
      })
    })
  }, [])

  const handleStart = () => {
    Haptics.selectionAsync()
    router.push('/birth-form' as never)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ios.bg }}>
      <Pressable onPress={handleStart} style={{ flex: 1 }} accessibilityRole='button'>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <HexastralPlanetLogo size={96} />
          <View style={{ height: 32 }} />
          <Text
            style={{
              color: ios.text,
              fontSize: 24,
              fontWeight: '500',
              letterSpacing: 0.4,
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            {t('birth_conv_intro_title')}
          </Text>
          <View style={{ height: 12 }} />
          <Text
            style={{
              color: ios.secondary,
              fontSize: 14,
              fontWeight: '300',
              textAlign: 'center',
              paddingHorizontal: 32,
            }}
          >
            {t('birth_conv_intro_subtitle')}
          </Text>
        </View>
        <View style={{ paddingBottom: 64, alignItems: 'center' }}>
          <Text
            style={{
              color: ios.text,
              fontSize: 12,
              fontWeight: '400',
              letterSpacing: 2,
              textTransform: 'uppercase',
              opacity: 0.7,
            }}
          >
            {t('birth_conv_intro_cta')}
          </Text>
        </View>
      </Pressable>
    </SafeAreaView>
  )
}
