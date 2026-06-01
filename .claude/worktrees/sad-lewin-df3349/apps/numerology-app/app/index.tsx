/**
 * Home — single-screen entry. Tap "Calculate" → opens the compute sheet.
 *
 * Intentionally minimal: numerology v1.0 is one input form + one result panel.
 * Avoids the complex casting ritual coin-cast needs, which keeps the satellite
 * scaffold a clean reference implementation for the Phase D.5 generator.
 */

import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Pressable, SafeAreaView, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

export default function HomeScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const { colors } = useAppTheme()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
        <Text
          style={{
            color: colors.text,
            fontSize: 36,
            fontWeight: '500',
            letterSpacing: 1.4,
            textAlign: 'center',
          }}
        >
          {t('homeTitle')}
        </Text>
        <View style={{ height: 16 }} />
        <Text
          style={{
            color: colors.secondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {t('homeTagline')}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, paddingBottom: 32, gap: 12 }}>
        <Pressable
          accessibilityRole='button'
          onPress={() => {
            Haptics.selectionAsync()
            router.push('/compute')
          }}
          style={{
            paddingVertical: 16,
            alignItems: 'center',
            backgroundColor: colors.text,
          }}
        >
          <Text
            style={{
              color: colors.bg,
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            {t('homeStartCta')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole='button'
          onPress={() => router.push('/settings')}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ color: colors.secondary, fontSize: 12, letterSpacing: 1.2 }}>
            {t('homeSettingsCta')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}
