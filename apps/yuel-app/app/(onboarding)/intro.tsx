/**
 * Intro — the Yuel (缘) cold-open, now THREAD-LED (see components/intro/IntroThread).
 *
 * The previous articulated stick-figure rig chased realism (joints + grounded
 * gait) and read MORE fake for it — the uncanny valley for a symbol. This screen
 * is now a thin shell: it owns the locale copy (the four-beat parable) and the
 * tap contract (tap ANYWHERE, at ANY time → onboarding, never a wall); all the
 * craft lives in IntroThread, where the thread between two ink dots — 缘 itself —
 * is the protagonist (controllable, believable, on-brand) instead of a walk.
 */

import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable } from 'react-native'
import { IntroThread } from '@/components/intro/IntroThread'
import { resolveLocale } from '@/lib/i18n'

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

interface IntroCopy {
  continue: string
  /** One caption per act — arrival, the near-miss, the one who parts, the one who stays. */
  acts: [string, string, string, string]
}

const INTRO_COPY: Record<CopyLocale, IntroCopy> = {
  // The thesis builds across four captions, each more personal and warmer than
  // the last: you start alone → some you reach for but can't hold → some you
  // come to know then part → but one is meant to stay (the CTA picks it up).
  en: {
    continue: 'tap to begin',
    acts: [
      'you come into the world alone',
      'some you reach for, but never hold',
      'some you come to know, then let go',
      'but one of them is meant to stay',
    ],
  },
  zh: {
    continue: '轻触开始',
    acts: [
      '你来到这世上，独自一人',
      '有人与你相识，却没能在一起',
      '有人与你相知，却终究分开',
      '但总有一个人，会留在你身边',
    ],
  },
  'zh-Hant': {
    continue: '輕觸開始',
    acts: [
      '你來到這世上，獨自一人',
      '有人與你相識，卻沒能在一起',
      '有人與你相知，卻終究分開',
      '但總有一個人，會留在你身邊',
    ],
  },
  ja: {
    continue: 'タップで始める',
    acts: [
      'あなたはひとりで、この世に来た',
      '出会っても、結ばれない人がいる',
      '深く知り合っても、別れる人もいる',
      'それでも、あなたのそばに残る人がいる',
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
  // Advance exactly once — the tap and the timeline's onDone can both fire.
  const advanced = useRef(false)
  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    router.replace('/(onboarding)/pair-input')
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={advance} accessibilityRole='button'>
      <IntroThread acts={copy.acts} continueLabel={copy.continue} onDone={advance} />
    </Pressable>
  )
}
