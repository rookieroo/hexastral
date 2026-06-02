/**
 * AskHexAstralCTA — primary CTA used at the bottom of every reading detail page.
 *
 * Single, unified design: filled tint button (Ink Brutalism flat),
 * "Ask HexAstral" label, optional small description below.
 * Replaces the previous bordered-card "Ask Master" entries.
 */

import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n'
import { useIosPalette } from '@/lib/theme'
import { hapticLight } from '@/lib/ux/haptics'

interface AskHexAstralCTAProps {
  onPress: () => void
  /** Optional secondary line under the label */
  description?: string
  /** Bottom margin (defaults 24) */
  marginBottom?: number
  /** Top margin (defaults 0) */
  marginTop?: number
}

export function AskHexAstralCTA({
  onPress,
  description,
  marginBottom = 24,
  marginTop = 0,
}: AskHexAstralCTAProps) {
  const { t } = useI18n()
  const ios = useIosPalette()
  const desc = description ?? t('chat_cta_desc')

  return (
    <Pressable
      onPress={() => {
        hapticLight()
        onPress()
      }}
      style={({ pressed }) => ({
        marginBottom,
        marginTop,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          backgroundColor: ios.tint,
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: ios.tintFg,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {t('chat_cta_label')}
        </Text>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '300',
            color: ios.tintFg,
            opacity: 0.75,
            letterSpacing: 0.4,
          }}
        >
          {desc}
        </Text>
      </View>
    </Pressable>
  )
}
