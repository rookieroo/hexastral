import { useTheme } from '@zhop/core-ui'
import { useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSatelliteI18n } from '@/lib/i18n'

/** v1b stub — AI ledger confirmation. */
export default function LantaiConfirmScreen() {
  const { colors, spacing } = useTheme()
  const insets = useSafeAreaInsets()
  const { t } = useSatelliteI18n()
  const { jobId } = useLocalSearchParams<{ jobId: string }>()

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
        {t('confirmStub')}
      </Text>
      <Text style={{ color: colors.dim, fontSize: 13 }}>{jobId}</Text>
    </View>
  )
}
