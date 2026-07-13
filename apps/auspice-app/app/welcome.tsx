/**
 * Welcome — the first-launch entrance.
 *
 * Auspice had no onboarding at all (app/index.tsx booted straight into the
 * tabs), so a first-time user landed cold on a dense 黄历 with no framing. This
 * is a single, restrained welcome — date-led to read as a CALENDAR utility (per
 * docs/publish/screenshot-direction.md: no moon-phase, no mystic motifs), three plain
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

/** The store wordmark. One-line flip when the Auspice→Yuun rename ships (it must
 *  land together with i18n.appName + app.json name + ASO — a coordinated sweep,
 *  not a piecemeal edit). Kept a constant so this screen isn't the thing that
 *  drifts. */
const BRAND = 'YUUN'

interface WelcomeCopy {
  /** One paragraph — calendar-anchored on purpose: App Review launches the app,
   *  and the welcome is the first thing it sees, so it must read as a utility,
   *  not a fortune product (docs/publish/screenshot-direction.md). The timeline/what-if
   *  story is sold in the store CPP, not here. */
  intro: string
  cta: string
  birthHint: string
}

const COPY: Record<Locale, WelcomeCopy> = {
  'zh-Hans': {
    intro: '一份中华黄历——每日宜忌、节气与农历，家人的农历生日到点提醒；可选录入生辰，解锁「对你而言」个人层。',
    cta: '进入今天',
    birthHint: '随时在「设置」中录入生辰，解锁「对你而言」',
  },
  'zh-Hant': {
    intro: '一份中華黃曆——每日宜忌、節氣與農曆，家人的農曆生日到點提醒；可選錄入生辰，解鎖「對你而言」個人層。',
    cta: '進入今天',
    birthHint: '隨時在「設定」中錄入生辰，解鎖「對你而言」',
  },
  ja: {
    intro:
      '中華の黄暦——毎日の宜忌、節気と旧暦、家族の旧暦誕生日の通知。生年月日を登録すると「あなたへ」の個人層が開きます。',
    cta: '今日をひらく',
    birthHint: 'いつでも「設定」で生年月日を登録し「あなたへ」を解放',
  },
  en: {
    intro:
      'A Chinese almanac for everyday life — daily yi/ji, solar terms, and lunar dates, with family birthday reminders. Add your birth in Settings to unlock the personal For You layer.',
    cta: 'Open today',
    birthHint: 'Add your birth anytime in Settings to unlock “For You”',
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
        {/* Logo lockup: wordmark + today's date — one mark, reads as a calendar. */}
        <View style={S.head}>
          <Text style={[S.brand, { color: colors.dim }]}>{BRAND}</Text>
          <Text style={[S.date, { color: colors.text }]}>{todayStamp()}</Text>
        </View>

        {/* One paragraph. */}
        <Text style={[S.intro, { color: colors.text }]}>{copy.intro}</Text>
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
  body: { flex: 1, justifyContent: 'center', gap: 28 },
  head: { gap: 12 },
  brand: { fontSize: 12, letterSpacing: 6, fontWeight: '600' },
  date: { fontSize: 46, fontWeight: '300', letterSpacing: 1 },
  intro: { fontSize: 16, lineHeight: 26 },
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
