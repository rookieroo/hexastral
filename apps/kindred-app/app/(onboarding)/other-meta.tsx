/**
 * Add a partner — single-page form (name + relationship + birth + city).
 *
 * Reached from /(onboarding)/mode → "I know their details". Previously this
 * screen only collected name + relationship and then pushed to
 * /(onboarding)/other-birth, which mounted the multi-step `BirthInfoForm`
 * wizard (date → time → gender → place → review). That gave users a
 * "page-by-page" feel that didn't match the single-page form they used for
 * their own birth info in /(onboarding)/pair-input. We mount the same
 * shared `<BirthForm>` here so both flows feel identical.
 *
 * Submit: persist the relationshipLabel + push to /(onboarding)/reveal,
 * which runs the bond create + reveal ceremony.
 */

import {
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
  type CityRecord,
} from '@zhop/core-ui'
import { kindredDark, kindredSpacing, kindredType } from '@zhop/hexastral-tokens/kindred'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BirthForm, Field, NameInput } from '@/components/BirthForm'
import { KindredMoon } from '@/components/KindredMoon'
import { PrimaryButton } from '@/components/PrimaryButton'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { type OnboardingDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'

function localeToLang(loc: Locale): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

function dateValueFromDraft(solar: string): BirthDateFieldValue {
  return {
    input: solar,
    calendar: 'solar',
    isLeap: false,
    solarDate: birthInputToSolar(solar, 'solar'),
  }
}

export default function OtherMetaScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const lang = useMemo(() => localeToLang(locale), [locale])
  const draft = useDraft()
  const scrollRef = useRef<ScrollView>(null)
  const [submitting, setSubmitting] = useState(false)

  const [otherDate, setOtherDate] = useState<BirthDateFieldValue>(() =>
    dateValueFromDraft(draft.otherSolarDate)
  )

  const dateLabels = useMemo(
    () => ({
      ...birthDateFieldLabelsForLocale(lang),
      solar: t(locale, 'pairInput.calendar.solar'),
      lunar: t(locale, 'pairInput.calendar.lunar'),
      lunarHint: t(locale, 'pairInput.calendar.lunarHint'),
    }),
    [lang, locale]
  )

  const commitOtherDate = (next: BirthDateFieldValue) => {
    setOtherDate(next)
    updateDraft({ otherSolarDate: next.solarDate ?? '' })
  }

  const searchCity = (query: string): Promise<CityRecord[]> => searchCityApi(query, lang, 7)

  const relType: RelationshipType | null = (draft.relationshipLabel as RelationshipType) || null
  // Same gate as pair-input.tsx step='other': name + relationship + date +
  // gender + 时辰 (city stays optional, see BirthForm). 时辰 drives the hour
  // pillar — submit blocks until it's picked.
  const canSubmit =
    draft.otherName.trim().length > 0 &&
    relType !== null &&
    otherDate.solarDate !== null &&
    draft.otherGender !== null &&
    typeof draft.otherTimeIndex === 'number'

  const handleSubmit = () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    updateDraft({ otherMode: 'fill' })
    router.push('/(onboarding)/reveal')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.lg,
          paddingBottom: kindredSpacing.xxl,
          gap: kindredSpacing.lg,
        }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole='button'>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            ←  {t(locale, 'pairInput.back')}
          </Text>
        </Pressable>

        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.sm }}>
          <KindredMoon size={56} />
        </View>

        <Text style={[kindredType.title, { color: kindredDark.text }]}>
          {t(locale, 'pair.other.about')}
        </Text>

        <Field label={t(locale, 'pairInput.name.other')}>
          <NameInput
            value={draft.otherName}
            placeholder={t(locale, 'name.placeholder')}
            onChange={(v) => updateDraft({ otherName: v })}
          />
        </Field>

        <Field label={t(locale, 'fill.relationship')}>
          <RelationshipTypeSelector
            value={relType}
            onChange={(rt) => updateDraft({ relationshipLabel: rt })}
          />
        </Field>

        <BirthForm
          locale={locale}
          lang={lang}
          date={otherDate}
          onDate={commitOtherDate}
          dateLabels={dateLabels}
          timeIndex={draft.otherTimeIndex}
          onTime={(idx) => updateDraft({ otherTimeIndex: idx })}
          gender={draft.otherGender}
          onGender={(g) => updateDraft({ otherGender: g })}
          city={draft.otherBirthCity}
          lat={draft.otherBirthLat}
          lng={draft.otherBirthLng}
          timezone={draft.otherBirthTimezone}
          onCity={(patch: Partial<OnboardingDraft>) => updateDraft(patch)}
          searchCity={searchCity}
          fieldPrefix='other'
          scrollRef={scrollRef}
        />

        <View style={{ marginTop: kindredSpacing.sm }}>
          <PrimaryButton
            label={t(locale, 'pair.cta.read')}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={submitting}
            tone='seal'
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
