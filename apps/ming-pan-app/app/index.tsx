/**
 * Onboarding-first entry gate (now consumes @zhop/satellite-runtime).
 *
 * Replaces the previous inline AsyncStorage check with the shared
 * <OnboardingEntryGate>. Local onboarding-config holds the routes + kind.
 */

import { OnboardingEntryGate } from '@zhop/satellite-runtime'

import { ONBOARDING_CONFIG } from '@/lib/onboarding-config'

export default function EntryScreen() {
  return <OnboardingEntryGate {...ONBOARDING_CONFIG} />
}
