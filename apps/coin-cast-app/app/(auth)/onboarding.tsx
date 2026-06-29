import { SatelliteOnboarding } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { COIN_CAST_ONBOARDING_STORAGE_KEY } from '@/lib/coincast-constants'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'
import { useAppTheme } from '@/lib/theme'

export default function CoinCastOnboardingScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { t } = useSatelliteI18n()
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <SatelliteOnboarding
        appTitle='CoinCast'
        appSubtitle={t('onboardSubtitle')}
        storagePrefix={PORTFOLIO_STORAGE_PREFIX}
        targetApp={PORTFOLIO_TARGET_APP}
        requireBirthInput={false}
        // Phase G alignment (ADR-0006): Apple Sign In lives in the Me tab, not
        // in onboarding. Matches face-oracle / dream-oracle / numerology;
        // first-run cost stays minimal and sign-in surfaces only when the
        // user genuinely wants to save history.
        showAuthStep={false}
        onboardingKey={COIN_CAST_ONBOARDING_STORAGE_KEY}
        copy={{
          kicker: t('onboardKicker'),
          getStarted: t('onboardGetStarted'),
          continue: t('onboardContinue'),
          back: t('onboardBack'),
        }}
        onFinish={() => router.replace('/(tabs)')}
      />
    </SafeAreaView>
  )
}
