/**
 * Onboarding · About them (name + relationship).
 *
 * Quick prefix to the other person's BirthInfoForm — collects the two fields
 * that don't fit the standard birth-info wizard: their name (used as display
 * label) and the relationship type. CTA → /(onboarding)/other-birth.
 */

import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'

export default function OtherMetaScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()

  const relType: RelationshipType | null = (draft.relationshipLabel as RelationshipType) || null
  const canContinue = draft.otherName.trim().length > 0 && relType !== null

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.xl,
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xl }}>
          <KindredMoon size={56} />
        </View>
        <Text style={[kindredType.title, { color: kindredDark.text }]}>
          {t(locale, 'pair.other.about')}
        </Text>

        <View style={{ height: kindredSpacing.xl }} />
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.sm },
          ]}
        >
          {t(locale, 'fill.name')}
        </Text>
        <TextInput
          value={draft.otherName}
          onChangeText={(name) => updateDraft({ otherName: name })}
          placeholder={t(locale, 'name.placeholder')}
          placeholderTextColor={kindredDark.textMuted}
          style={{
            fontSize: kindredType.heading.fontSize,
            color: kindredDark.text,
            borderBottomWidth: 0.5,
            borderBottomColor: kindredDark.border,
            paddingVertical: kindredSpacing.md,
          }}
        />

        <View style={{ height: kindredSpacing.xl }} />
        <Text
          style={[
            kindredType.seal,
            { color: kindredDark.textSecondary, marginBottom: kindredSpacing.sm },
          ]}
        >
          {t(locale, 'fill.relationship')}
        </Text>
        <RelationshipTypeSelector
          value={relType}
          onChange={(rt) => updateDraft({ relationshipLabel: rt })}
        />

        <View style={{ flex: 1 }} />
        <PrimaryButton
          label={t(locale, 'common.next')}
          onPress={() => router.push('/(onboarding)/other-birth')}
          disabled={!canContinue}
        />
        <View style={{ height: kindredSpacing.xl }} />
      </View>
    </SafeAreaView>
  )
}
