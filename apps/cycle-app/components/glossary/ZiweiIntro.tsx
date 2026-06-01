/**
 * 紫微斗数 — glossary inline intro (chart UI ships later).
 */

import { useTheme } from '@zhop/core-ui'
import { Text, View } from 'react-native'

import { CultureWikiLink } from '@/components/culture/CultureWikiLink'
import { getCultureCategory, getWikipediaUrl } from '@/lib/culture'
import { useStrings } from '@/lib/i18n-context'

export function ZiweiIntro() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const material = getCultureCategory('ziwei')
  const wikiUrl = getWikipediaUrl(locale, material.wikipediaTitle[locale])

  return (
    <View style={{ gap: spacing.md }}>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
        {material.intro[locale]}
      </Text>
      <Text style={{ color: colors.dim, fontSize: 14 }}>{t.ziweiChartComingSoon}</Text>
      <CultureWikiLink url={wikiUrl} />
    </View>
  )
}
