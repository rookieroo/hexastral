/**
 * Term Glossary — the plain-language decoder for the 命理 terms a reading can use.
 *
 * Distinct from `glossary.tsx` (the SYMBOL glossary — it decodes the report's
 * visual language: seals, brush marks, numerals). This one decodes the WORDS:
 * 五行 / 十神 / 神煞 / 格局 / 合冲 / 用神·通关·日主 / 大运·流年·流月.
 *
 * Single source of truth is `@zhop/astro-i18n`'s curated `terms` table
 * (getTermsByCategory) — the same table that feeds the generation prompt's
 * glosses — so the page and the prose can never drift. Meaning-first by design:
 * a reader who can't read Chinese never needs this to follow their report; it's
 * here purely for the curious. Content is zh + en today; ja/ko fall back to en.
 */

import { getTermsByCategory } from '@zhop/astro-i18n'
import { kindredPaper, kindredSpacing } from '@zhop/hexastral-tokens/kindred'
import { kindredFonts } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { EdgeBackSwipe } from '@/components/EdgeBackSwipe'
import { resolveLocale, type TranslationKey, t } from '@/lib/i18n'

export default function TermGlossaryScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const tr = (key: TranslationKey) => t(locale, key)
  const groups = useMemo(() => getTermsByCategory(locale), [locale])

  return (
    <EdgeBackSwipe onBack={() => router.back()}>
      <SafeAreaView style={{ flex: 1, backgroundColor: kindredPaper.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.lg,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={{ fontSize: 22, color: kindredPaper.muted }}>←</Text>
        </Pressable>
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 12,
            letterSpacing: 3,
            color: kindredPaper.muted,
            textTransform: 'uppercase',
          }}
        >
          {tr('terms.title')}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
          paddingBottom: kindredSpacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontFamily: kindredFonts.serif,
            fontSize: 16,
            lineHeight: 24,
            color: kindredPaper.inkSoft,
            marginBottom: kindredSpacing.xl,
          }}
        >
          {tr('terms.intro')}
        </Text>

        {groups.map((group) => (
          <Section key={group.category} title={group.label}>
            {group.terms.map((term) => (
              <TermRow key={term.id} zh={term.zh} pinyin={term.pinyin} meaning={term.long} />
            ))}
          </Section>
        ))}
      </ScrollView>
      </SafeAreaView>
    </EdgeBackSwipe>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: kindredSpacing.xxl }}>
      <Text
        style={{
          fontFamily: kindredFonts.mono,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: kindredPaper.cinnabar,
          marginBottom: kindredSpacing.sm,
        }}
      >
        {title}
      </Text>
      <View style={{ borderTopWidth: 0.5, borderTopColor: kindredPaper.hair }}>{children}</View>
    </View>
  )
}

/** One term: 中文 + pinyin on a heading line, the plain-language meaning below.
 *  Stacked (not columned) so 1-char 金 and 4-char 天乙贵人 both read cleanly. */
function TermRow({ zh, pinyin, meaning }: { zh: string; pinyin: string; meaning: string }) {
  return (
    <View
      style={{
        paddingVertical: kindredSpacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: kindredPaper.hair,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <Text style={{ fontFamily: kindredFonts.serif, fontSize: 18, color: kindredPaper.ink }}>
          {zh}
        </Text>
        <Text
          style={{
            fontFamily: kindredFonts.mono,
            fontSize: 11,
            letterSpacing: 0.5,
            color: kindredPaper.muted,
          }}
        >
          {pinyin}
        </Text>
      </View>
      <Text
        style={{
          fontFamily: kindredFonts.serif,
          fontSize: 14,
          lineHeight: 20,
          color: kindredPaper.inkSoft,
          marginTop: 3,
        }}
      >
        {meaning}
      </Text>
    </View>
  )
}
