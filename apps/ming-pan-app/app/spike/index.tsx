import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAppTheme } from '@/lib/theme'

export default function SpikeIndexScreen() {
  const { colors } = useAppTheme()

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.bg }]}>
      <Text style={[styles.title, { color: colors.text }]}>Motion spikes</Text>
      <Text style={[styles.sub, { color: colors.secondary }]}>
        Skia needs a dev build with @shopify/react-native-skia linked.
      </Text>
      <View style={styles.list}>
        <Link href='/spike/skia-moon' asChild>
          <Pressable style={[styles.row, { borderColor: colors.separator }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Skia moon loader</Text>
            <Text style={[styles.rowSub, { color: colors.secondary }]}>
              /spike/skia-moon · MoonPhaseLoader + 6 skins
            </Text>
          </Pressable>
        </Link>
        <Link href='/spike/flip-magic' asChild>
          <Pressable style={[styles.row, { borderColor: colors.separator }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>FLIP magic move</Text>
            <Text style={[styles.rowSub, { color: colors.secondary }]}>
              /spike/flip-magic · V15Moon + useMagicMove
            </Text>
          </Pressable>
        </Link>
        <Link href='/spike/ink-wipe' asChild>
          <Pressable style={[styles.row, { borderColor: colors.separator }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Ink wipe reveal</Text>
            <Text style={[styles.rowSub, { color: colors.secondary }]}>
              /spike/ink-wipe · InkWipeReveal (墨晕转场)
            </Text>
          </Pressable>
        </Link>
        <Link href='/spike/seal-stamp' asChild>
          <Pressable style={[styles.row, { borderColor: colors.separator }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Seal stamp</Text>
            <Text style={[styles.rowSub, { color: colors.secondary }]}>
              /spike/seal-stamp · SealStamp (石章落印)
            </Text>
          </Pressable>
        </Link>
        <Link href='/spike/unseal' asChild>
          <Pressable style={[styles.row, { borderColor: colors.separator }]}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Unseal reveal</Text>
            <Text style={[styles.rowSub, { color: colors.secondary }]}>
              /spike/unseal · UnsealReveal (蜡封启封)
            </Text>
          </Pressable>
        </Link>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  sub: { fontSize: 14, lineHeight: 20 },
  list: { marginTop: 8, gap: 10 },
  row: {
    borderWidth: 0.5,
    borderRadius: 0,
    padding: 14,
    gap: 4,
  },
  rowTitle: { fontSize: 16, fontWeight: '500' },
  rowSub: { fontSize: 12 },
})
