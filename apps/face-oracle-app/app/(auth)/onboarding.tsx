import { SatelliteOnboarding } from '@zhop/satellite-ui'
import { PORTFOLIO_STORAGE_PREFIX, PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

export default function FaceOracleOnboardingScreen() {
  return (
    <SatelliteOnboarding
      appTitle='FaceOracle'
      appSubtitle='Scan, interpret, and refine your next move with concise feature insights.'
      storagePrefix={PORTFOLIO_STORAGE_PREFIX}
      targetApp={PORTFOLIO_TARGET_APP}
      requireBirthInput={false}
      onboardingKey='face_oracle_onboarded'
    />
  )
}
