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
    intro:
      'Coin forms are public-domain historical artifacts. The rubbing-style art is reproduced from Public Domain / CC0 sources — never invented lettering. The full per-coin license ledger ships in the repository (SOURCING.md).',
  },
  zh: {
    title: '来源与致谢',
    intro:
      '钱币形制为公共领域历史文物。碑拓风格美术基于公共领域 / CC0 素材忠实再现,绝不杜撰文字。每枚钱的完整授权台账见仓库 SOURCING.md。',
  },
  'zh-Hant': {
    title: '來源與致謝',
    intro:
      '錢幣形制為公共領域歷史文物。碑拓風格美術基於公共領域 / CC0 素材忠實再現,絕不杜撰文字。每枚錢的完整授權台帳見倉庫 SOURCING.md。',
  },
  ja: {
    title: 'クレジットと出典',
    intro:
      '貨幣の意匠は公共領域の歴史的遺物です。拓本風アートはパブリックドメイン / CC0 素材を基に忠実に再現しています。各貨幣のライセンス台帳はリポジトリ (SOURCING.md) に含まれます。',
  },
}

const ENTRIES: { name: string; source: string; license: string }[] = [
  { name: '素钱 · Plain (default)', source: 'Original artwork — CoinCast', license: '© CoinCast' },
  {
    name: '五銖 · Wu Zhu (Han)',
    source: 'After a public-domain 五銖 coin image, Wikimedia Commons',
    license: 'Public domain',
  },
  {
    name: '開元通寶 · Kaiyuan Tongbao (Tang)',
    source: 'After a public-domain 開元通寶 coin image, Wikimedia Commons',
    license: 'Public domain',
  },
]

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
