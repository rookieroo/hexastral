import { Stack } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useSatelliteI18n } from '@/lib/i18n'
import { SheetHandle } from '@/lib/SheetHandle'
import { useAppTheme } from '@/lib/theme'

type L = 'en' | 'zh' | 'zh-Hant' | 'ja'

const UI: Record<L, { title: string; intro: string }> = {
  en: {
    title: 'Credits & sources',
    intro: 'The casting scene uses procedural wood and coin materials — no third-party textures.',
  },
  zh: {
    title: '来源与致谢',
    intro: '摇卦场景的木案与铜钱均为程序生成材质，未使用第三方贴图。',
  },
  'zh-Hant': {
    title: '來源與致謝',
    intro: '搖卦場景的木案與銅錢均為程式生成材質，未使用第三方貼圖。',
  },
  ja: {
    title: 'クレジットと出典',
    intro: '占いシーンの木製台と銅銭はプロシージャル材質で、第三者テクスチャは使用していません。',
  },
}

const ENTRIES: { name: string; source: string; license: string }[] = []

export default function CreditsScreen() {
  const { colors } = useAppTheme()
  const { uiLocale } = useSatelliteI18n()
  const ui = UI[uiLocale as L] ?? UI.en

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Stack.Screen options={{ title: ui.title }} />
      <SheetHandle />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.intro, { color: colors.secondary }]}>{ui.intro}</Text>
        {ENTRIES.map((e) => (
          <View
            key={e.name}
            style={[styles.card, { borderColor: colors.separator, backgroundColor: colors.card }]}
          >
            <Text style={[styles.name, { color: colors.text }]}>{e.name}</Text>
            <Text style={[styles.src, { color: colors.secondary }]}>{e.source}</Text>
            <Text style={[styles.lic, { color: colors.dim }]}>{e.license}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28, gap: 12 },
  intro: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  card: { borderWidth: 0.5, borderRadius: 0, padding: 14, gap: 4 },
  name: { fontSize: 15, fontWeight: '500' },
  src: { fontSize: 12, lineHeight: 17 },
  lic: { fontSize: 11 },
})
