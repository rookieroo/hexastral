/**
 * Onboarding · Screen 7b — Fill in for the other person (solo mode)
 *
 * For when A doesn't want to send an invite (e.g., "what's my compatibility
 * with [public figure]" or "how do I match with my late grandmother").
 *
 * Single screen with 4 fields (intentionally breaks form-as-conversation
 * here — this isn't the primary path, it's the power-user shortcut).
 *
 * v0 stub: collects inputs but doesn't yet POST. Solo bond creation hits
 * /api/bonds/solo which is still wrapped by hexastral-app's
 * lib/domain/bonds.ts; scenario-yuan will add useSoloBond() in a follow-up.
 */

import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { RelationshipTypeSelector, type RelationshipType } from '@zhop/scenario-yuan'
import { yuanLight, yuanType, yuanSpacing, yuanPresets } from '@zhop/hexastral-tokens/yuan'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { useDraft, updateDraft } from '@/lib/onboardingDraft'

export default function FillOtherScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const [name, setName] = useState<string>(draft.otherName)
  const [date, setDate] = useState<string>(draft.otherSolarDate)
  const [city, setCity] = useState<string>(draft.otherBirthCity)
  const [relType, setRelType] = useState<RelationshipType | null>(null)

  const canContinue = name.trim().length > 0 && date.length === 10 && city.trim().length > 0 && relType !== null

  const handleNext = () => {
    if (!canContinue) return
    updateDraft({
      otherName: name.trim(),
      otherSolarDate: date,
      otherBirthCity: city.trim(),
      relationshipLabel: relType ?? '',
    })
    router.push('/(onboarding)/reveal')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: yuanLight.bg }}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: yuanSpacing.screenH,
          paddingTop: yuanSpacing.xl,
        }}
      >
        <ProgressIndicator step={6} total={6} />
        <View style={{ height: yuanSpacing.xl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'fill.title')}</Text>
        <View style={{ height: yuanSpacing.xl }} />

        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Birth date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="1995-01-01" />
        <Field label="Birth place" value={city} onChangeText={setCity} />

        <View style={{ marginTop: yuanSpacing.lg }}>
          <Text style={[yuanType.caption, { color: yuanLight.textSecondary, marginBottom: yuanSpacing.sm }]}>
            Relationship
          </Text>
          <RelationshipTypeSelector value={relType} onChange={setRelType} />
        </View>

        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canContinue ? 1 : 0.3 }}
        >
          <Text style={yuanPresets.ctaText}>{t(locale, 'fill.done')}</Text>
        </Pressable>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}

interface FieldProps {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
}

function Field({ label, value, onChangeText, placeholder }: FieldProps) {
  return (
    <View style={{ marginBottom: yuanSpacing.lg }}>
      <Text style={[yuanType.seal, { color: yuanLight.textSecondary, marginBottom: yuanSpacing.xs }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={yuanLight.textMuted}
        style={{
          fontSize: yuanType.body.fontSize,
          color: yuanLight.text,
          borderBottomWidth: 0.5,
          borderBottomColor: yuanLight.border,
          paddingVertical: yuanSpacing.sm,
        }}
      />
    </View>
  )
}
