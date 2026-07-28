/**
 * Welcome — first-launch entrance.
 *
 * Logo matches home: live 月相 PhaseLogo (no PNG→moon morph mismatch).
 * Copy stays short: brand + one line + CTA.
 */

import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { moonPhaseFromLunarDay } from '@/components/DailyCard'
import { PhaseLogo } from '@/components/PhaseLogo'
import { fetchAuspiceDay } from '@/lib/api'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { markOnboardingSeen } from '@/lib/onboarding-seen'
import { useAppTheme } from '@/lib/theme'

const BRAND = 'Yuun'
const LOGO_SIZE = 72

interface WelcomeCopy {
  headline: string
  cta: string
}

const COPY: Record<Locale, WelcomeCopy> = {
  'zh-Hans': {
    headline: '今日黄历',
    cta: '开始',
  },
  'zh-Hant': {
    headline: '今日黃曆',
    cta: '開始',
  },
  ja: {
    headline: '今日の黄暦',
    cta: 'はじめる',
  },
  en: {
    headline: 'Today’s almanac',
    cta: 'Start',
  },
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { locale } = useStrings()
  const copy = COPY[locale]
  const [entering, setEntering] = useState(false)
  const [phase, setPhase] = useState(0.35)

  useEffect(() => {
    const d = new Date()
    const iso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    void fetchAuspiceDay(iso)
      .then((p) => {
        setPhase(moonPhaseFromLunarDay(p.day.lunarDate?.day))
      })
      .catch(() => {})
  }, [])

  const enter = () => {
    if (entering) return
    setEntering(true)
    void markOnboardingSeen()
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={[S.root, { backgroundColor: colors.bg }]}>
      <View style={[S.body, entering && { opacity: 0 }]}>
        <View style={S.brandBlock}>
          <PhaseLogo phase={phase} size={LOGO_SIZE} />
          <Text style={[S.brand, { color: colors.text }]}>{BRAND}</Text>
        </View>

        <Text style={[S.headline, { color: colors.text }]}>{copy.headline}</Text>
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
      </View>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  body: { flex: 1, justifyContent: 'center', gap: 28 },
  brandBlock: { alignItems: 'center', gap: 16 },
  brand: { fontSize: 28, fontWeight: '300', letterSpacing: 6 },
  headline: { fontSize: 20, fontWeight: '400', textAlign: 'center', letterSpacing: 1 },
  footer: { paddingBottom: 24, gap: 12 },
  cta: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '600', letterSpacing: 1 },
})
