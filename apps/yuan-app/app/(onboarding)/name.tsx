/**
 * Onboarding · Screen 2 — Your name
 *
 * Single-field input. Auto-focus, no border-box (just an underline).
 * Next CTA: gold underline text, disabled until ≥1 character.
 */

import { yuanLight, yuanPresets, yuanSpacing, yuanType } from '@zhop/hexastral-tokens/yuan'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'

export default function NameScreen() {
  const router = useRouter()
  const locale = useMemo(() => resolveLocale(), [])
  const draft = useDraft()
  const [name, setName] = useState<string>(draft.selfName)
  const canContinue = name.trim().length >= 1

  const handleNext = () => {
    if (!canContinue) return
    updateDraft({ selfName: name.trim() })
    router.push('/(onboarding)/birth-info')
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
        <ProgressIndicator step={1} total={6} />
        <View style={{ height: yuanSpacing.xxl }} />
        <Text style={[yuanType.title, { color: yuanLight.text }]}>{t(locale, 'name.title')}</Text>
        <Text style={[yuanType.title, { color: yuanLight.text, marginTop: 4 }]}>
          {t(locale, 'name.subtitle')}
        </Text>
        <View style={{ height: yuanSpacing.xl }} />
        <TextInput
          value={name}
          onChangeText={setName}
          autoFocus
          placeholder={t(locale, 'name.placeholder')}
          placeholderTextColor={yuanLight.textMuted}
          style={{
            fontSize: yuanType.heading.fontSize,
            lineHeight: yuanType.heading.lineHeight,
            color: yuanLight.text,
            borderBottomWidth: 0.5,
            borderBottomColor: yuanLight.border,
            paddingVertical: yuanSpacing.md,
          }}
          returnKeyType='next'
          onSubmitEditing={handleNext}
        />
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleNext}
          disabled={!canContinue}
          hitSlop={12}
          style={{ alignSelf: 'flex-end', opacity: canContinue ? 1 : 0.3 }}
        >
          <Text style={yuanPresets.ctaText}>{t(locale, 'common.next')}</Text>
        </Pressable>
        <View style={{ height: yuanSpacing.xxl }} />
      </View>
    </SafeAreaView>
  )
}
