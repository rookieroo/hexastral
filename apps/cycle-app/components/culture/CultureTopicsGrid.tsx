/**
 * Home 文化导览 — a single drill-in row that opens /glossary (the culture hub).
 *
 * Earlier revisions surfaced the 6 categories directly on home, but per
 * 2026-06 feedback that made the drill-in feel redundant (same list on both
 * screens). Now home shows ONE entry; glossary owns the 6-category list and
 * each category's 二级分类 (festivals list, solar terms list, ShichenWheel,
 * GanzhiGrid, BaziPillars, ZiweiIntro).
 */

import { useTheme } from '@zhop/core-ui'
import { ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { useStrings } from '@/lib/i18n-context'

export function CultureTopicsGrid() {
  const { colors, spacing } = useTheme()
  const { t } = useStrings()
  const router = useRouter()

  return (
    <View style={{ borderRadius: 12, backgroundColor: colors.card, overflow: 'hidden' }}>
      <Pressable
        onPress={() => router.push('/glossary')}
        accessibilityRole='button'
        accessibilityLabel={t.cultureTopicsTitle}
        style={({ pressed }) => ({
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
            {t.cultureTopicsTitle}
          </Text>
          <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 17 }}>
            {t.cultureHubBlurb}
          </Text>
        </View>
        <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
      </Pressable>
    </View>
  )
}
