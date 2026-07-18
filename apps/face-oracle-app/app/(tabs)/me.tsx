import { darkTokens } from '@zhop/hexastral-tokens/palette'
import { SatelliteMePanel } from '@zhop/satellite-ui'
import { Stack, useRouter } from 'expo-router'
import { Linking, StyleSheet, View } from 'react-native'
import { PORTFOLIO_TARGET_APP } from '@/lib/growth-config'

export default function FaceOracleMeScreen() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Me' }} />
      <SatelliteMePanel
        target={PORTFOLIO_TARGET_APP}
        historyTitle='Reading History'
        emptyText='No face readings yet.'
        privacyUrl='https://www.hexastral.com/en/privacy/faceoracle'
        appStoreUrl='https://www.hexastral.com'
        onOpenUrl={(url) => {
          if (url.includes('privacy')) {
            router.push('/privacy')
            return
          }
          void Linking.openURL(url)
        }}
        onViewHistory={() => router.push('/history')}
        onUpgrade={() => router.push('/paywall')}
        onRestore={() => router.push('/paywall')}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: darkTokens.bg },
})
