import { SatelliteOnboarding } from '@zhop/satellite-ui'
import { useRouter } from 'expo-router'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

export default function FaceOracleOnboardingScreen() {
  const router = useRouter()
  return (
    <SatelliteOnboarding
      appTitle='FaceOracle'
      appSubtitle='Scan, interpret, and refine your next move with concise feature insights.'
      storagePrefix={PORTFOLIO_STORAGE_PREFIX}
      targetApp={PORTFOLIO_TARGET_APP}
      requireBirthInput={false}
      onboardingKey='face_oracle_onboarded'
      onFinish={() => router.replace('/(tabs)')}
    />
  )
}
