import { useTheme } from '@zhop/core-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { LANTAI_SHORTCUT_NAME, lantaiShortcutRunUrl } from '@/lib/growth-config'
import { useSatelliteI18n } from '@/lib/i18n'

export default function LantaiInstallScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { t } = useSatelliteI18n()
  const { configId } = useLocalSearchParams<{ configId?: string }>()
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    void Linking.canOpenURL('shortcuts://').then((ok) => setMissing(!ok))
  }, [])

  const onRun = async () => {
    if (!configId || typeof configId !== 'string') {
      router.back()
      return
    }
    const ok = await Linking.canOpenURL('shortcuts://')
    if (!ok) {
      setMissing(true)
      return
    }
    await Linking.openURL(lantaiShortcutRunUrl(configId))
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
        {t('installTitle')}
      </Text>
      <Text style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
        {t('installBody')}
      </Text>
      <Text style={{ color: colors.dim, fontSize: 13 }}>{LANTAI_SHORTCUT_NAME}</Text>
      {missing ? <Text style={{ color: colors.secondary }}>{t('installMissing')}</Text> : null}
      <Pressable
        onPress={() => {
          void onRun()
        }}
        style={{
          borderWidth: 0.5,
          borderRadius: 0,
          borderColor: colors.separator,
          backgroundColor: colors.card,
          padding: spacing.md,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 16 }}>{t('installRun')}</Text>
      </Pressable>
    </View>
  )
}
