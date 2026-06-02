import { Text, View } from 'react-native'
import { AuthButtons } from '@/components/auth/AuthButtons'
import { BRAND_PHASE, HexastralPlanetLogo } from '@/components/branding/HexastralPlanetLogo'
import { useI18n } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import { onboardingStyles as ob } from './styles'

export function AuthStep({
  onApple,
  onGoogle,
  onGuest,
  appleAvailable,
  loadingType,
}: {
  onApple: () => void
  onGoogle: () => void
  onGuest: () => void
  appleAvailable: boolean
  loadingType: 'apple' | 'google' | 'guest' | null
}) {
  const { colors, isDark } = useTheme()
  const { t } = useI18n()

  const ios = {
    text: isDark ? '#FAFAFA' : '#09090B',
    secondary: isDark ? '#A1A1AA' : '#71717A',
  }

  return (
    <View style={[ob.stepWrap, { backgroundColor: colors.background }]}>
      {/* Branding — centered vertically in the upper area */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingBottom: 24,
        }}
      >
        <HexastralPlanetLogo size={72} phase={BRAND_PHASE} withBackground />
        <Text
          style={{
            fontSize: 22,
            fontWeight: '500',
            color: ios.text,
            textAlign: 'center',
            marginTop: 28,
            lineHeight: 30,
          }}
        >
          {t('ob_auth_q')}
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '300',
            color: ios.secondary,
            textAlign: 'center',
            marginTop: 10,
          }}
        >
          {t('ob_auth_hint')}
        </Text>
      </View>

      {/* Buttons pinned to bottom */}
      <View style={ob.stepFooter}>
        <AuthButtons
          onApple={onApple}
          onGoogle={onGoogle}
          onGuest={onGuest}
          loadingType={loadingType}
          appleAvailable={appleAvailable}
          showBranding={false}
        />
      </View>
    </View>
  )
}

// ─── Step: NOTIFY ─────────────────────────────────────────────────────────────
