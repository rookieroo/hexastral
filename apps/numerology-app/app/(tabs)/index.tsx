/**
 * Home tab — primary entry. Tap "Calculate" → opens the compute sheet.
 *
 * Single hero card with a numeric "1" glyph (matching the App Store icon spec)
 * and a violet brand accent (per ADR-0004 §1).
 */

import { Button, useTheme } from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { SafeAreaView, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

export default function NumerologyHomeScreen() {
  const router = useRouter()
  const { t } = useI18n()
  const { colors } = useAppTheme()
  const { spacing } = useTheme()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            width: 144,
            height: 144,
            borderRadius: 72,
            borderWidth: 0.5,
            borderColor: colors.accent,
            backgroundColor: `${colors.accent}14`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 80,
              color: colors.accent,
              fontWeight: '300',
              lineHeight: 96,
            }}
          >
            1
          </Text>
        </View>

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

        <Text
          style={{
            color: colors.secondary,
            fontSize: 14,
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 320,
          }}
        >
          {t('homeTagline')}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl }}>
        <Button variant='primary' fullWidth onPress={() => router.push('/compute')}>
          {t('homeStartCta')}
        </Button>
      </View>
    </SafeAreaView>
  )
}
