/**
 * Shared onboarding-gate hook + entry component.
 *
 * Three onboarding modes (declared by the consuming app):
 *
 *   • `required` — birth data is non-negotiable (八字 / 紫微 / cycle / numerology
 *     / yuan). Entry gate redirects to the onboarding screen if no draft.
 *   • `optional` — soft prompt (feng-app). Entry gate passes through; the app
 *     surfaces an in-context prompt when relevant.
 *   • `none`     — episodic apps (dream-read / face-read / coin-cast). Entry
 *     gate is a pass-through; the app doesn't read birth data at all.
 *
 * Two ways to consume:
 *
 *   1. Hook (full control over routing):
 *        const state = useOnboardingState({ storagePrefix, kind: 'required' })
 *        if (state === 'loading') return null
 *        if (state === 'needs-onboarding') return <Redirect href='/birth?mode=onboarding' />
 *        return <Redirect href='/(tabs)' />
 *
 *   2. Component (one-line drop-in):
 *        <OnboardingEntryGate
 *          storagePrefix={PORTFOLIO_STORAGE_PREFIX}
 *          kind='required'
 *          onboardingHref='/birth?mode=onboarding'
 *          homeHref='/(tabs)'
 *        />
 *
 * The hook checks AsyncStorage once via `getLocalBirthDraft`. No subscription;
 * if you mutate the draft elsewhere, mount the gate again (typically via
 * `router.replace('/index')`) to re-check.
 */

import { Redirect } from 'expo-router'
import type { Href } from 'expo-router'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { getLocalBirthDraft } from './local-birth-draft'

export type OnboardingKind = 'required' | 'optional' | 'none'

export type OnboardingState = 'loading' | 'satisfied' | 'needs-onboarding'

export type UseOnboardingStateOptions = {
  /** Same prefix passed to `getLocalBirthDraft` / `saveLocalBirthDraft`. */
  storagePrefix: string
  /** What posture the app takes toward onboarding. */
  kind: OnboardingKind
}

/**
 * Returns the gate state. 'loading' while AsyncStorage is being read; then
 * either 'satisfied' (let the user pass) or 'needs-onboarding' (redirect them).
 */
export function useOnboardingState({
  storagePrefix,
  kind,
}: UseOnboardingStateOptions): OnboardingState {
  const [state, setState] = useState<OnboardingState>(
    // `none` and `optional` don't gate, so skip the async check entirely.
    kind === 'none' || kind === 'optional' ? 'satisfied' : 'loading',
  )

  useEffect(() => {
    if (kind === 'none' || kind === 'optional') {
      setState('satisfied')
      return
    }
    let active = true
    void (async () => {
      const draft = await getLocalBirthDraft(storagePrefix)
      if (!active) return
      setState(draft ? 'satisfied' : 'needs-onboarding')
    })()
    return () => {
      active = false
    }
  }, [storagePrefix, kind])

  return state
}

export type OnboardingEntryGateProps = {
  storagePrefix: string
  kind: OnboardingKind
  /** Route to send the user when birth is required and missing. */
  onboardingHref: Href
  /** Route to send the user when satisfied (typically the app's tabs root). */
  homeHref: Href
  /** Rendered while checking storage. Default: blank dark View. */
  loadingFallback?: ReactNode
}

/**
 * Drop-in entry-gate component. Mount at the app's `/index` route.
 *
 * Renders `loadingFallback` while resolving state, then a `<Redirect>` to
 * either `onboardingHref` or `homeHref`.
 */
export function OnboardingEntryGate({
  storagePrefix,
  kind,
  onboardingHref,
  homeHref,
  loadingFallback,
}: OnboardingEntryGateProps) {
  const state = useOnboardingState({ storagePrefix, kind })

  if (state === 'loading') {
    return (
      loadingFallback ?? (
        <View style={{ flex: 1, backgroundColor: '#0C0B0A' }} />
      )
    )
  }
  if (state === 'needs-onboarding') return <Redirect href={onboardingHref} />
  return <Redirect href={homeHref} />
}
