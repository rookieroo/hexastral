/**
 * Home 文化导览 — the six concepts (节日 / 节气 / 时辰 / 干支 / 八字 / 紫微). Collapsed by
 * default (2026-06 feedback); expanding reveals each concept's summary inline
 * (no deeper in-app page) with a direct Wikipedia link for more.
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { CultureWikiLink } from '@/components/culture/CultureWikiLink'
import { CULTURE_CATEGORIES, type CultureCategoryKey, getWikipediaUrl } from '@/lib/culture'
import { useStrings } from '@/lib/i18n-context'

function categoryLabel(key: CultureCategoryKey, t: ReturnType<typeof useStrings>['t']): string {
  switch (key) {
    case 'festivals':
      return t.festivalsSection
    case 'jieqi':
      return t.solarTermsSection
    case 'shichen':
      return t.glossaryShichen
    case 'ganzhi':
      return t.glossaryGanzhi
    case 'sizhu':
      return t.glossarySizhu
    case 'ziwei':
      return t.glossaryZiwei
  }
}

export function CultureTopicsGrid() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const [open, setOpen] = useState(false)

  return (
    <View style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole='button'
        accessibilityLabel={t.cultureTopicsTitle}
        hitSlop={8}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
          {t.cultureTopicsTitle}
        </Text>
        {open ? (
          <ChevronDownIcon size={18} color={colors.secondary} />
        ) : (
          <ChevronRightIcon size={18} color={colors.secondary} />
        )}
      </Pressable>

      {open ? (
        <View style={{ borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
          {CULTURE_CATEGORIES.map((cat, i) => (
            <View
              key={cat.key}
              style={{
                borderTopWidth: i === 0 ? 0 : 0.5,
                borderTopColor: colors.separator,
                padding: spacing.lg,
                gap: 6,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                {categoryLabel(cat.key, t)}
              </Text>
              <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 19 }}>
                {cat.intro[locale]}
              </Text>
              <CultureWikiLink url={getWikipediaUrl(locale, cat.wikipediaTitle[locale])} />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}
