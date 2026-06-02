/**
 * Onboarding · About them (name + relationship).
 *
 * Quick prefix to the other person's BirthInfoForm — collects the two fields
 * that don't fit the standard birth-info wizard: their name (used as display
 * label) and the relationship type. CTA → /(onboarding)/other-birth.
 */

import { V15Moon } from '@zhop/core-ui/motion'
import { yuanDark, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-yuan'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'

export default function OtherMetaScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()

  const relType: RelationshipType | null = (draft.relationshipLabel as RelationshipType) || null
  const canContinue = draft.otherName.trim().length > 0 && relType !== null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanDark.bg }}>
      <View style={{ flex: 1, paddingHorizontal: yuanSpacing.screenH, paddingTop: yuanSpacing.xl }}>
        <View style={{ alignItems: 'center', marginBottom: yuanSpacing.xl }}>
          <V15Moon size={56} />
        </View>
        <Text style={[yuanType.title, { color: yuanDark.text }]}>
          {t(locale, 'pair.other.about')}
        </Text>

        <View style={{ height: yuanSpacing.xl }} />
        <Text
          style={[yuanType.seal, { color: yuanDark.textSecondary, marginBottom: yuanSpacing.sm }]}
        >
          {t(locale, 'fill.name')}
        </Text>
        <TextInput
          value={draft.otherName}
          onChangeText={(name) => updateDraft({ otherName: name })}
          placeholder={t(locale, 'name.placeholder')}
          placeholderTextColor={yuanDark.textMuted}
          style={{
            fontSize: yuanType.heading.fontSize,
            color: yuanDark.text,
            borderBottomWidth: 0.5,
            borderBottomColor: yuanDark.border,
            paddingVertical: yuanSpacing.md,
          }}
        />

        <View style={{ height: yuanSpacing.xl }} />
        <Text
          style={[yuanType.seal, { color: yuanDark.textSecondary, marginBottom: yuanSpacing.sm }]}
        >
          {t(locale, 'fill.relationship')}
        </Text>
        <RelationshipTypeSelector
          value={relType}
          onChange={(rt) => updateDraft({ relationshipLabel: rt })}
        />

        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push('/(onboarding)/other-birth')}
          disabled={!canContinue}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canContinue ? 1 : 0.3 }}
        >
          <Text style={yuanPresets.ctaText}>{t(locale, 'common.next')}</Text>
        </Pressable>
        <View style={{ height: yuanSpacing.xl }} />
      </View>
    </SafeAreaView>
  )
}
