/**
 * Onboarding · Screen 8 — Reveal moment
 *
 * Wraps the scenario-yuan RevealMoment component, plays the 2.7s ceremony,
 * then routes to the freshly-created bond's detail page. For solo mode (7b),
 * the bond creation actually happens HERE since we collected inputs without
 * submitting. For invite mode (7a), control never reaches this screen — A
 * goes to /(bonds) waiting state instead.
 *
 * v0: Solo bond POST is not wired (see fill-other.tsx); reveal just animates
 * and routes home. Phase B+ will add useSoloBond() to scenario-yuan.
 */

import { useRouter } from 'expo-router'
import { RevealMoment } from '@zhop/scenario-yuan'
import { useMemo } from 'react'
import { resolveLocale, t } from '@/lib/i18n'
import { useDraft, clearDraft } from '@/lib/onboardingDraft'
import { markOnboardingComplete } from '../index'

export default function RevealScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()

  return (
    <RevealMoment
      selfGlyph="甲"
      otherGlyph="乙"
      playAnimation
      copy={{
        line1: t(locale, 'reveal.line1'),
        line2: t(locale, 'reveal.line2'),
        cta: t(locale, 'reveal.cta'),
      }}
      onContinue={async () => {
        await markOnboardingComplete()
        await clearDraft()
        router.replace('/(bonds)')
      }}
    />
  )
}
