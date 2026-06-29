import { getTokens } from '@zhop/hexastral-tokens/palette'
import { SatelliteOnboarding } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

export default function DreamOracleOnboardingScreen() {
  const router = useRouter()
  const isDark = useColorScheme() === 'dark'
  const colors = getTokens(isDark)
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <SatelliteOnboarding
        appTitle='DreamOracle'
        appSubtitle='Capture dreams, decode patterns, and turn symbols into action.'
        storagePrefix={PORTFOLIO_STORAGE_PREFIX}
        targetApp={PORTFOLIO_TARGET_APP}
        requireBirthInput={false}
        showAuthStep={false}
        onboardingKey='dream_oracle_onboarded'
        onFinish={() => router.replace('/(tabs)')}
      />
    </SafeAreaView>
  )
}
