import { Stack } from 'expo-router'
import { ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

type L = 'en' | 'zh' | 'zh-Hant' | 'ja'

const TITLES: Record<L, string> = {
  en: 'Credits & sources',
  zh: '来源与致谢',
  'zh-Hant': '來源與致謝',
  ja: 'クレジットと出典',
}

export default function CreditsScreen() {
  const { colors } = useAppTheme()
  const { uiLocale } = useSatelliteI18n()
  const title = TITLES[uiLocale as L] ?? TITLES.en

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title }} />
      <SheetHandle />
      <ScrollView contentContainerStyle={styles.body} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
})
