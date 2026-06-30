/**
 * Glossary — the full 风水 terms reference, grouped by school (玄空/八宅/峦头/
 * 格局/形理). Same data source as the inline FengTermBubble (lib/feng-terms), so
 * the legend always matches what the report explains. 宣纸 reading surface.
 */

import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  FENG_CATEGORY_LABEL,
  FENG_TERMS,
  type FengTermCategory,
  fengCategoryLabel,
  fengTermDef,
  fengTermPinyin,
} from '@/lib/feng-terms'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { FENG_PAPER, spacing } from '@/lib/theme'

const CATEGORY_ORDER: FengTermCategory[] = ['xuankong', 'bazhai', 'luantou', 'gameju', 'xingli']

export default function GlossaryScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const t = useStrings(locale)

  return (
    <View style={{ flex: 1, backgroundColor: FENG_PAPER.bg }}>
      <StatusBar style='dark' />
      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: FENG_PAPER.hair,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={t.nav_back}
          hitSlop={12}
        >
          <Text style={{ color: FENG_PAPER.bronze, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text style={{ color: FENG_PAPER.ink, fontSize: 18, fontWeight: '700' }}>
          {t.tool_glossary}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
      >
        <Text
          style={{
            color: FENG_PAPER.inkSoft,
            fontSize: 13,
            lineHeight: 20,
            marginBottom: spacing.lg,
          }}
        >
          {t.glossary_intro}
        </Text>

        {CATEGORY_ORDER.map((cat) => {
          const terms = FENG_TERMS.filter((term) => term.category === cat)
          if (terms.length === 0) return null
          return (
            <View key={cat} style={{ marginBottom: spacing.xl }}>
              <Text
                style={{
                  color: FENG_PAPER.bronze,
                  fontSize: 12,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginBottom: spacing.sm,
                }}
              >
                {fengCategoryLabel(cat, locale)}
                {locale === 'zh' || locale === 'zh-Hant'
                  ? ''
                  : `  ·  ${FENG_CATEGORY_LABEL[cat].zh}`}
              </Text>
              {terms.map((term) => (
                <View
                  key={term.id}
                  style={{
                    paddingVertical: spacing.md,
                    borderBottomWidth: 1,
                    borderBottomColor: FENG_PAPER.hairSoft,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                    <Text style={{ color: FENG_PAPER.ink, fontSize: 17, fontWeight: '700' }}>
                      {term.term}
                    </Text>
                    {fengTermPinyin(term, locale) ? (
                      <Text style={{ color: FENG_PAPER.muted, fontSize: 13, fontStyle: 'italic' }}>
                        {fengTermPinyin(term, locale)}
                      </Text>
                    ) : null}
                  </View>
                  <Text
                    style={{
                      color: FENG_PAPER.inkSoft,
                      fontSize: 14,
                      lineHeight: 22,
                      marginTop: 4,
                    }}
                  >
                    {fengTermDef(term, locale)}
                  </Text>
                  {term.source ? (
                    <Text
                      style={{
                        color: FENG_PAPER.muted,
                        fontSize: 12,
                        fontStyle: 'italic',
                        marginTop: 4,
                      }}
                    >
                      {t.term_source} · {term.source}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )
        })}
      </ScrollView>
    </View>
  )
}
