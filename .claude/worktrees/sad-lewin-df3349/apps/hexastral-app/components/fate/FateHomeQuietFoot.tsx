/**
 * FateHomeQuietFoot — fills short scrolls with a single hint (no History CTA:
 * Recent row already exposes “See all” to History).
 */

import { Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'

export function FateHomeQuietFoot() {
  const { t } = useI18n()
  const ios = useIosPalette()

  return (
    <View
      style={{
        flexGrow: 1,
        minHeight: 100,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 32,
      }}
    >
      <Text
        style={{
          color: ios.secondary,
          fontSize: 13,
          lineHeight: 22,
          fontWeight: '300',
        }}
      >
        {t('fate_home_quiet_hint')}
      </Text>
    </View>
  )
}
