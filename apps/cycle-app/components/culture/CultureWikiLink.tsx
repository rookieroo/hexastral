/**
 * Opens the localized Wikipedia article in the system browser.
 */

import { useTheme } from '@zhop/core-ui'
import { ExternalLink } from 'lucide-react-native'
import { Linking, Pressable, Text } from 'react-native'

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
      hitSlop={8}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingVertical: 4,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <ExternalLink size={14} color={colors.accent} strokeWidth={1.6} />
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '500' }}>
        {t.cultureWikipediaCta}
      </Text>
    </Pressable>
  )
}
