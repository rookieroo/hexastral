/**
 * Intro — the Yuel (缘) cold-open, framed on TWO STARS and the gravity between
 * them. The red-thread (红线) framing read as nothing to a Western audience, so
 * the metaphor is now universal physics that lives in the starfield: a star pulled
 * toward you that slings past, one that flares and repels, and the one that settles
 * into your orbit — the widest ache anyone who's looked for their person knows.
 *
 * This screen is a thin shell: it owns the locale copy + the tap contract (tap
 * ANYWHERE, ANY time → onboarding, never a wall) + the 定格 hand-off (the final
 * frame holds, then fades to the dark the pair-input moon rises from, so the
 * transition is continuous, not a hard cut). All the craft lives in IntroThread.
 */

import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable } from 'react-native'
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated'
import { IntroThread } from '@/components/intro/IntroThread'
import { resolveLocale } from '@/lib/i18n'

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

interface IntroCopy {
  continue: string
  /** One caption per act — among the stars, the pull that misses, the flare that repels, the orbit. */
  acts: [string, string, string, string]
}

const INTRO_COPY: Record<CopyLocale, IntroCopy> = {
  // Four beats on gravity, matched to the storyboard: the sky fills → B passes
  // close but never stops → C circles with you a while, then breaks away → D
  // falls into a lasting orbit. Pure physics, no cultural key — lands East + West.
  en: {
    continue: 'find your star',
    acts: [
      'among countless stars, two are drawn together',
      'some pass close enough to touch, and keep going',
      'some circle with you a while, then slip away',
      'one falls into orbit with you, and stays',
    ],
  },
  zh: {
    continue: '寻你的那颗星',
    acts: [
      '茫茫星海，总有两颗，彼此吸引',
      '有的擦身而过，近在咫尺，却未停留',
      '有的与你同行一段，终究转身离去',
      '而那一颗，与你同轨同行，不再离开',
    ],
  },
  'zh-Hant': {
    continue: '尋你的那顆星',
    acts: [
      '茫茫星海，總有兩顆，彼此吸引',
      '有的擦身而過，近在咫尺，卻未停留',
      '有的與你同行一段，終究轉身離去',
      '而那一顆，與你同軌同行，不再離開',
    ],
  },
  ja: {
    continue: 'あなたの星を探す',
    acts: [
      '無数の星の中で、惹かれ合う二つがある',
      'すぐそばを通り過ぎて、行ってしまう星がある',
      'しばらく寄り添い、やがて離れていく星もある',
      'けれど一つは、同じ軌道で回りつづける',
    ],
  },
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
  // Advance exactly once. The TAP is the ONLY way forward — the timeline never
  // auto-advances; it resolves into a held close-up (the pair slowly orbiting)
  // and waits for the user to decide to enter. `exit` is owned here (the host
  // decides WHEN) but rendered inside IntroThread, so the moon can survive the
  // fade and morph into the onboarding mark.
  const advanced = useRef(false)
  const exit = useSharedValue(0)
  const go = () => router.replace('/(onboarding)/pair-input')
  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    // Fade the scene to the dark ground while the moon settles to its onboarding
    // resting size; THEN swap routes. pair-input rises from the same dark with
    // the same centred moon, so the hand-off reads continuous, not a cut.
    exit.value = withTiming(1, { duration: 520, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) runOnJS(go)()
    })
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={advance} accessibilityRole='button'>
      <IntroThread acts={copy.acts} continueLabel={copy.continue} exit={exit} />
    </Pressable>
  )
}
