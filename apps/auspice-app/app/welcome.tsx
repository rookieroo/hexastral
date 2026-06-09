/**
 * Welcome — the first-launch entrance.
 *
 * Auspice had no onboarding at all (app/index.tsx booted straight into the
 * tabs), so a first-time user landed cold on a dense 黄历 with no framing. This
 * is a single, restrained welcome — date-led to read as a CALENDAR utility (per
 * docs/screenshot-direction.md: no moon-phase, no mystic motifs), three plain
 * value lines, and one CTA into Today. It never gates the almanac: the free
 * 黄历 works with no birth, so the welcome only ORIENTS, then steps aside. Birth
 * entry (for the 对你而言 layer) is invited, not required.
 *
 * Shown once (lib/onboarding-seen.ts); app/index.tsx routes here on first launch.
 */

import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { markOnboardingSeen } from '@/lib/onboarding-seen'
import { useAppTheme } from '@/lib/theme'

interface WelcomeCopy {
  tagline: string
  points: [string, string, string]
  cta: string
  birthHint: string
}

const COPY: Record<Locale, WelcomeCopy> = {
  'zh-Hans': {
    tagline: '一份为今日而生的中华日历',
    points: ['每日 干支 · 宜忌 · 节气', '二十四节气与节日深读', '记录家人的农历生日，到点提醒'],
    cta: '进入今天',
    birthHint: '随时在「我」中录入生辰，解锁「对你而言」',
  },
  'zh-Hant': {
    tagline: '一份為今日而生的中華日曆',
    points: ['每日 干支 · 宜忌 · 節氣', '二十四節氣與節日深讀', '記錄家人的農曆生日，到點提醒'],
    cta: '進入今天',
    birthHint: '隨時在「我」中錄入生辰，解鎖「對你而言」',
  },
  ja: {
    tagline: '今日のための中華暦',
    points: [
      '毎日の 干支 · 宜忌 · 節気',
      '二十四節気と節句の深掘り',
      '家族の旧暦の誕生日を登録して通知',
    ],
    cta: '今日をひらく',
    birthHint: 'いつでも「設定」で生年月日を登録し「あなたへ」を解放',
  },
  en: {
    tagline: 'The Chinese calendar, built for today',
    points: [
      'Daily 干支 · favorable & avoided · solar terms',
      'Deep reads on the 24 solar terms & festivals',
      'Track family lunar birthdays — reminded on the day',
    ],
    cta: 'Open today',
    birthHint: 'Add your birth anytime in Me to unlock “For You”',
  },
}

function todayStamp(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}.${mm}.${dd}`
}

export default function WelcomeScreen() {
  const router = useRouter()
  const { colors } = useAppTheme()
  const { locale } = useStrings()
  const copy = COPY[locale]

  const enter = () => {
    void markOnboardingSeen()
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={[S.root, { backgroundColor: colors.bg }]}>
      <View style={S.body}>
        {/* Brand + date hero — reads as a calendar, not a horoscope. */}
        <View style={S.head}>
          <Text style={[S.brand, { color: colors.dim }]}>AUSPICE</Text>
          <Text style={[S.date, { color: colors.text }]}>{todayStamp()}</Text>
          <Text style={[S.tagline, { color: colors.dim }]}>{copy.tagline}</Text>
        </View>

        {/* Three plain value lines. */}
        <View style={S.points}>
          {copy.points.map((p) => (
            <View key={p} style={S.pointRow}>
              <View style={[S.tick, { backgroundColor: colors.accent }]} />
              <Text style={[S.pointText, { color: colors.text }]}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* CTA + the (optional) birth invitation — never a gate. */}
      <View style={S.footer}>
        <Pressable
          onPress={enter}
          accessibilityRole='button'
          style={({ pressed }) => [
            S.cta,
            { borderColor: colors.accent },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[S.ctaText, { color: colors.text }]}>{copy.cta}</Text>
        </Pressable>
        <Text style={[S.birthHint, { color: colors.dim }]}>{copy.birthHint}</Text>
      </View>
    </SafeAreaView>
  )
}

const S = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 28 },
  body: { flex: 1, justifyContent: 'center', gap: 44 },
  head: { gap: 12 },
  brand: { fontSize: 12, letterSpacing: 6, fontWeight: '600' },
  date: { fontSize: 46, fontWeight: '300', letterSpacing: 1 },
  tagline: { fontSize: 15, lineHeight: 22 },
  points: { gap: 16 },
  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { width: 6, height: 6, borderRadius: 3 },
  pointText: { flex: 1, fontSize: 15, lineHeight: 21 },
  footer: { paddingBottom: 24, gap: 14, alignItems: 'center' },
  cta: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  ctaText: { fontSize: 17, fontWeight: '500', letterSpacing: 1 },
  birthHint: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
})
