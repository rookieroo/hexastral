/**
 * Welcome — first-launch entrance.
 *
 * Single screen: logo + brand, one-line promise (黄历宜忌), one personal-tier
 * line, one CTA. Never gates the free almanac — birth is invited for the
 * personal edition, not required.
 *
 * Shown once (`lib/onboarding-seen.ts`); `app/index.tsx` routes here on first launch.
 * CTA morphs the logo into the home header mark (see `lib/brand-logo-morph`).
 */

import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  type LogoRect,
  useBrandLogoMorph,
  WELCOME_LOGO_SIZE,
} from '@/lib/brand-logo-morph'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { markOnboardingSeen } from '@/lib/onboarding-seen'
import { useAppTheme } from '@/lib/theme'

const BRAND = 'Yuun'
const LOGO = require('../assets/icon.png')

interface WelcomeCopy {
  /** Core promise — almanac yi/ji, no hedging. */
  headline: string
  /** Personal edition — birth unlocks a customized almanac. */
  personal: string
  cta: string
  birthHint: string
}

const COPY: Record<Locale, WelcomeCopy> = {
  'zh-Hans': {
    headline: '黄历宜忌，今日可知',
    personal: '免费每日黄历；录入生辰，解锁个人定制版',
    cta: '查看今日宜忌',
    birthHint: '稍后可在设置中录入生辰',
  },
  'zh-Hant': {
    headline: '黃曆宜忌，今日可知',
    personal: '免費每日黃曆；錄入生辰，解鎖個人定製版',
    cta: '查看今日宜忌',
    birthHint: '稍後可在設定中錄入生辰',
  },
  ja: {
    headline: '黄暦の宜忌、今日を知る',
    personal: '毎日の黄暦は無料。生年月日で個人版を解放',
    cta: '今日の宜忌を見る',
    birthHint: 'あとで設定から生年月日を登録できます',
  },
  en: {
    headline: 'Daily yi & ji — today’s almanac',
    personal: 'Free Chinese almanac; add birth for your personal edition',
    cta: 'See today’s almanac',
    birthHint: 'You can add birth info later in Settings',
  },
}

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { locale } = useStrings()
  const copy = COPY[locale]
  const logoRef = useRef<View>(null)
  const { beginFromWelcome } = useBrandLogoMorph()
  const [entering, setEntering] = useState(false)

  const enter = () => {
    if (entering) return
    const node = logoRef.current
    const go = (from: LogoRect | null) => {
      setEntering(true)
      void markOnboardingSeen()
      if (from) beginFromWelcome(from)
      router.replace('/(tabs)')
    }
    if (!node) {
      go(null)
      return
    }
    node.measureInWindow((x, y, width, height) => {
      go({
        x,
        y,
        width: width || WELCOME_LOGO_SIZE,
        height: height || WELCOME_LOGO_SIZE,
      })
    })
  }

  return (
    <SafeAreaView style={[S.root, { backgroundColor: colors.bg }]}>
      <View style={[S.body, entering && { opacity: 0 }]}>
        <View style={S.brandBlock}>
          <View ref={logoRef} collapsable={false} style={entering ? { opacity: 0 } : undefined}>
            <Image
              source={LOGO}
              style={S.logo}
              resizeMode='contain'
              accessibilityIgnoresInvertColors
            />
          </View>
          <Text style={[S.brand, { color: colors.text }]}>{BRAND}</Text>
        </View>

        <View style={S.copyBlock}>
          <Text style={[S.headline, { color: colors.text }]}>{copy.headline}</Text>
          <Text style={[S.personal, { color: colors.dim }]}>{copy.personal}</Text>
        </View>
      </View>

      <View style={[S.footer, entering && { opacity: 0 }]}>
        <Pressable
          onPress={enter}
          accessibilityRole='button'
          style={({ pressed }) => [
            S.cta,
            { backgroundColor: colors.accent },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={[S.ctaText, { color: colors.bg }]}>{copy.cta}</Text>
        </Pressable>
        <Text style={[S.birthHint, { color: colors.dim }]}>{copy.birthHint}</Text>
      </View>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  body: { flex: 1, justifyContent: 'center', gap: 40 },
  brandBlock: { alignItems: 'center', gap: 16 },
  logo: { width: WELCOME_LOGO_SIZE, height: WELCOME_LOGO_SIZE, borderRadius: 16 },
  brand: { fontSize: 28, fontWeight: '600', letterSpacing: 0.5 },
  copyBlock: { gap: 12, alignItems: 'center' },
  headline: { fontSize: 22, fontWeight: '600', textAlign: 'center', lineHeight: 32 },
  personal: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  footer: { paddingBottom: 28, gap: 14, alignItems: 'center' },
  cta: {
    borderRadius: 0,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '600' },
  birthHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
})
