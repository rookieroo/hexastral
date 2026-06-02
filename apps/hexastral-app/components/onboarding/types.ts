export type OnboardingStep = 'birthdate' | 'birthtime' | 'gender' | 'birthcity' | 'auth' | 'notify'

export const ONBOARDING_STEP_ORDER: OnboardingStep[] = [
  'birthdate',
  'birthtime',
  'gender',
  'birthcity',
  'auth',
  'notify',
]

export const ONBOARDING_KEY = 'hexastral_onboarded'
