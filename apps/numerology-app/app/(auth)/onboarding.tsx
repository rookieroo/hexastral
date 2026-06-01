import { SatelliteOnboarding } from '@zhop/satellite-ui'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'
import { useI18n } from '@/lib/i18n'
import { NUMEROLOGY_ONBOARDING_STORAGE_KEY } from '@/lib/numerology-constants'
import { useAppTheme } from '@/lib/theme'

export default function NumerologyOnboardingScreen() {
  const { colors } = useAppTheme()
  const { t } = useI18n()
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.bg }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <SatelliteOnboarding
        appTitle='Numerology'
        appSubtitle={t('onboardSubtitle')}
        storagePrefix={PORTFOLIO_STORAGE_PREFIX}
        targetApp={PORTFOLIO_TARGET_APP}
        requireBirthInput={false}
        // Numerology mirrors face/dream pattern (per Phase G alignment): Apple
        // Sign In lives in the Me tab, not in onboarding. Keeps first-run cost
        // minimal; sign-in only when the user wants to save history.
        showAuthStep={false}
        onboardingKey={NUMEROLOGY_ONBOARDING_STORAGE_KEY}
        copy={{
          kicker: t('onboardKicker'),
          getStarted: t('onboardGetStarted'),
          continue: t('onboardContinue'),
          back: t('onboardBack'),
        }}
      />
    </SafeAreaView>
  )
}
