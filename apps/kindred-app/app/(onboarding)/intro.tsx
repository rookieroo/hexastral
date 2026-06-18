/**
 * Cold-open — a calm Logo first-screen (2026-06: the elaborate two-stars intro was
 * retired for pacing/perf; the IntroThread craft is in git history if it's wanted
 * back). Just the brand moon + wordmark + a couple of quiet lines + "tap to begin".
 *
 * Reached ONLY when onboarding isn't done (first open or a half-finished flow); a
 * returning user goes straight to the home (app/index.tsx decides). This screen is a
 * thin shell: it owns the locale copy + the tap contract (tap ANYWHERE → onboarding)
 * + the 定格 hand-off (the moon settles to pair-input's centred mark as the scene
 * fades, so the transition is continuous, not a cut). The craft lives in IntroLogo.
 */

import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable } from 'react-native'
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated'
import { IntroLogo } from '@/components/intro/IntroLogo'
import { resolveLocale } from '@/lib/i18n'

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

interface IntroCopy {
  /** "tap to begin" — the only way forward. */
  continue: string
  /** A couple of short tagline lines under the wordmark. */
  lines: [string, string]
}

const INTRO_COPY: Record<CopyLocale, IntroCopy> = {
  en: { continue: 'tap to begin', lines: ["Some people you're drawn to.", 'It was never chance.'] },
  zh: { continue: '轻触开始', lines: ['有些人，你总会被吸引。', '这从来不是偶然。'] },
  'zh-Hant': { continue: '輕觸開始', lines: ['有些人，你總會被吸引。', '這從來不是偶然。'] },
  ja: { continue: 'タップして始める', lines: ['惹かれてしまう人がいる。', 'それは偶然ではない。'] },
}

function pickIntroCopy(locale: string): IntroCopy {
  if (locale === 'en' || locale === 'zh' || locale === 'zh-Hant' || locale === 'ja') {
    return INTRO_COPY[locale]
  }
  return INTRO_COPY.en
}

export default function IntroScreen() {
  const router = useRouter()
  const copy = useMemo(() => pickIntroCopy(resolveLocale()), [])
  // Advance exactly once. The tap is the ONLY way forward; the splash never
  // auto-advances. `exit` is owned here (the host decides WHEN) but rendered inside
  // IntroLogo, so the moon can survive the fade and morph into the onboarding mark.
  const advanced = useRef(false)
  const exit = useSharedValue(0)
  const go = () => router.replace('/(onboarding)/pair-input')
  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    // Fade the scene to the dark ground while the moon settles to its onboarding
    // resting size; THEN swap routes. pair-input rises from the same dark with the
    // same centred moon, so the hand-off reads continuous, not a cut.
    exit.value = withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) runOnJS(go)()
    })
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={advance} accessibilityRole='button'>
      <IntroLogo lines={copy.lines} hint={copy.continue} exit={exit} />
    </Pressable>
  )
}
