import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { useSatelliteI18n } from '@/lib/i18n'

export default function FaceOracleHomeScreen() {
  const router = useRouter()
  const { t } = useSatelliteI18n()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Face Oracle</Text>
      <Text style={styles.body}>Start with a camera capture to generate your reading.</Text>
      <Pressable
        style={styles.btn}
        onPress={() => router.push('/capture')}
        accessibilityRole='button'
      >
        <Text style={styles.btnText}>{t('homePrimaryCta')}</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: darkTokens.bg },
  title: { color: darkTokens.text, fontSize: 24, fontWeight: '600' },
  body: { color: darkTokens.secondary, fontSize: 15, lineHeight: 22 },
  btn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: darkTokens.separator,
    borderRadius: 0,
    backgroundColor: darkTokens.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnText: { color: darkTokens.text, fontSize: 15, fontWeight: '500' },
})
