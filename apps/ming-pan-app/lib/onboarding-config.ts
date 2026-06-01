/**
 * fate-app's onboarding posture.
 *
 * Mirrors what other birth-required apps (yuan / cycle / numerology) will
 * declare for themselves. feng-app declares `optional`; the 3 episodic apps
 * (dream-read / face-read / coin-cast) don't import this at all.
 */

import type { OnboardingEntryGateProps } from '@zhop/satellite-runtime'

import { PORTFOLIO_STORAGE_PREFIX } from './growth-config'

export const ONBOARDING_CONFIG: Pick<
  OnboardingEntryGateProps,
  'storagePrefix' | 'kind' | 'onboardingHref' | 'homeHref'
> = {
  storagePrefix: PORTFOLIO_STORAGE_PREFIX,
  kind: 'required',
  onboardingHref: '/birth?mode=onboarding',
  homeHref: '/(tabs)',
}
