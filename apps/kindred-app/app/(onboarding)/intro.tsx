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

import { kindredDark } from '@zhop/hexastral-tokens/kindred'
import { useRouter } from 'expo-router'
import { useMemo, useRef } from 'react'
import { Pressable, StyleSheet } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { IntroThread } from '@/components/intro/IntroThread'
import { resolveLocale } from '@/lib/i18n'

type CopyLocale = 'en' | 'zh' | 'zh-Hant' | 'ja'

interface IntroCopy {
  continue: string
  /** One caption per act — among the stars, the pull that misses, the flare that repels, the orbit. */
  acts: [string, string, string, string]
}

const INTRO_COPY: Record<CopyLocale, IntroCopy> = {
  // Four beats on gravity: among countless stars → the ones that pull then drift
  // → the ones that flare then push you away → the one that settles into orbit.
  // Pure physics, no cultural key — it lands East and West alike.
  en: {
    continue: 'find your star',
    acts: [
      'among countless stars, two are drawn together',
      'some pull you close, then drift past',
      'some flare bright, then push you away',
      'one settles into your orbit, and stays',
    ],
  },
  zh: {
    continue: '寻你的那颗星',
    acts: [
      '茫茫星海，总有两颗，彼此吸引',
      '有的把你拉近，却又擦身而过',
      '有的骤然炽烈，转身将你推开',
      '而那一颗，落入你的轨道，不再离开',
    ],
  },
  'zh-Hant': {
    continue: '尋你的那顆星',
    acts: [
      '茫茫星海，總有兩顆，彼此吸引',
      '有的把你拉近，卻又擦身而過',
      '有的驟然熾烈，轉身將你推開',
      '而那一顆，落入你的軌道，不再離開',
    ],
  },
  ja: {
    continue: 'あなたの星を探す',
    acts: [
      '無数の星の中で、惹かれ合う二つがある',
      '近づいても、すれ違って離れる星がある',
      '激しく輝いて、あなたを弾く星もある',
      'けれど一つは、あなたの軌道に留まる',
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
  const exit = useSharedValue(0)
  const exitStyle = useAnimatedStyle(() => ({ opacity: exit.value }))
  const go = () => router.replace('/(onboarding)/pair-input')
  const advance = () => {
    if (advanced.current) return
    advanced.current = true
    // 定格 → graceful fade to the dark ground, THEN swap routes. pair-input
    // rises from the same dark, so the hand-off reads continuous, not a cut.
    exit.value = withTiming(1, { duration: 440, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) runOnJS(go)()
    })
  }

  return (
    <Pressable style={{ flex: 1 }} onPress={advance} accessibilityRole='button'>
      <IntroThread acts={copy.acts} continueLabel={copy.continue} onDone={advance} />
      <Animated.View
        pointerEvents='none'
        style={[StyleSheet.absoluteFill, { backgroundColor: kindredDark.bg }, exitStyle]}
      />
    </Pressable>
  )
}
