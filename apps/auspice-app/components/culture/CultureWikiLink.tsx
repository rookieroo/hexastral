/**
 * Wikipedia deep link — a deliberately SUBTLE affordance.
 *
 * Was a full "Learn more on Wikipedia" CTA in accent colour, which made every
 * culture card read like an external-link shell. Now it's a small muted "W"
 * chip that trails the text — the source is still one tap away (and fully
 * labelled for screen readers), but it no longer dominates the card.
 */

import { useTheme } from '@zhop/core-ui'
import { Linking, Pressable, StyleSheet, Text } from 'react-native'

import { useStrings } from '@/lib/i18n-context'

interface CultureWikiLinkProps {
  url: string
}

export function CultureWikiLink({ url }: CultureWikiLinkProps) {
  const { colors } = useTheme()
  const { t } = useStrings()

  return (
    <Pressable
      onPress={() => {
        Linking.openURL(url).catch(() => {})
      }}
      accessibilityRole='link'
      accessibilityLabel={t.cultureWikipediaCta}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 20,
        height: 20,
        borderRadius: 5,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.separator,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.5 : 0.9,
      })}
    >
      <Text style={{ color: colors.secondary, fontSize: 12, fontWeight: '600', lineHeight: 14 }}>
        W
      </Text>
    </Pressable>
  )
}
