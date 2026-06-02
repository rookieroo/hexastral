/**
 * Category intro paragraph + Wikipedia deep link (glossary accordion).
 */

import { useTheme } from '@zhop/core-ui'
import { Text, View } from 'react-native'

import type { CultureCategoryMaterial } from '@/lib/culture'
import { getWikipediaUrl } from '@/lib/culture'
import type { Locale } from '@/lib/i18n'

import { CultureWikiLink } from './CultureWikiLink'

interface CultureIntroBlockProps {
  material: CultureCategoryMaterial
  locale: Locale
}

export function CultureIntroBlock({ material, locale }: CultureIntroBlockProps) {
  const { colors, spacing } = useTheme()
  const wikiUrl = getWikipediaUrl(locale, material.wikipediaTitle[locale])

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 20 }}>
        {material.intro[locale]}
      </Text>
      <CultureWikiLink url={wikiUrl} />
    </View>
  )
}
