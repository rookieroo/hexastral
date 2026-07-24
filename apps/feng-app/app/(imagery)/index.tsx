/**
 * Imagery guide — explains each report chapter's 意象图 (SVG seal).
 * Same illustrations as FengChapterImage in the report pager.
 */

import type { FengChapterKind } from '@zhop/scenario-feng'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FengChapterImage } from '@/components/FengChapterImage'
import { resolveLocale, type Strings, useStrings } from '@/lib/i18n'
import { FENG_PAPER, spacing } from '@/lib/theme'

const KINDS: FengChapterKind[] = [
  'external_landform',
  'personal_fit',
  'flying_stars',
  'annual_directions',
  'remediation',
  'auspicious_objects',
]

function chapterTitle(kind: FengChapterKind, t: Strings): string {
  switch (kind) {
    case 'external_landform':
      return t.chapter_external_landform
    case 'personal_fit':
      return t.chapter_personal_fit
    case 'flying_stars':
      return t.chapter_flying_stars
    case 'annual_directions':
      return t.chapter_annual_directions
    case 'remediation':
      return t.chapter_remediation
    case 'auspicious_objects':
      return t.chapter_auspicious_objects
  }
}

function imageryBlurb(kind: FengChapterKind, t: Strings): string {
  switch (kind) {
    case 'external_landform':
      return t.imagery_blurb_external_landform
    case 'personal_fit':
      return t.imagery_blurb_personal_fit
    case 'flying_stars':
      return t.imagery_blurb_flying_stars
    case 'annual_directions':
      return t.imagery_blurb_annual_directions
    case 'remediation':
      return t.imagery_blurb_remediation
    case 'auspicious_objects':
      return t.imagery_blurb_auspicious_objects
  }
}

export default function ImageryGuideScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const locale = resolveLocale()
  const t = useStrings(locale)

  return (
    <View style={{ flex: 1, backgroundColor: FENG_PAPER.bg }}>
      <StatusBar style='light' />
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
          {t.tool_imagery}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.xl,
        }}
      >
        <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 13, lineHeight: 20 }}>
          {t.imagery_intro}
        </Text>

        {KINDS.map((kind) => (
          <View
            key={kind}
            style={{
              borderWidth: 0.5,
              borderColor: FENG_PAPER.hair,
              backgroundColor: FENG_PAPER.sheet,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: FENG_PAPER.ink, fontSize: 16, fontWeight: '700' }}>
              {chapterTitle(kind, t)}
            </Text>
            <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
              <FengChapterImage kind={kind} width={220} />
            </View>
            <Text style={{ color: FENG_PAPER.inkSoft, fontSize: 14, lineHeight: 22 }}>
              {imageryBlurb(kind, t)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
