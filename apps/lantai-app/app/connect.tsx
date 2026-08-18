import { useTheme } from '@zhop/core-ui'
import { getPortfolioUserId } from '@zhop/satellite-runtime'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { startNotionOauth } from '@/lib/api'
import { useSatelliteI18n } from '@/lib/i18n'

export default function LantaiConnectScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t } = useSatelliteI18n()
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onConnect = async () => {
    setBusy(true)
    setMessage(null)
    try {
      const userId = await getPortfolioUserId()
      if (!userId) {
        setMessage(t('connectNeedSignIn'))
        return
      }
      const url = await startNotionOauth()
      if (!url) {
        setMessage(t('connectFail'))
        return
      }
      const result = await WebBrowser.openAuthSessionAsync(url, 'lantai://connect')
      if (result.type === 'success' && result.url.includes('ok=1')) {
        setMessage(t('connectOk'))
        router.back()
        return
      }
      setMessage(t('connectFail'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: insets.top + spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.md,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 28, fontWeight: '600' }}>
        {t('connectTitle')}
      </Text>
      <Pressable
        disabled={busy}
        onPress={() => {
          void onConnect()
        }}
        style={{
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          backgroundColor: colors.card,
          padding: spacing.md,
          opacity: busy ? 0.5 : 1,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16 }}>{t('connectCta')}</Text>
      </Pressable>
      {message ? <Text style={{ color: colors.secondary }}>{message}</Text> : null}
    </View>
  )
}
