/**
 * Onboarding · Pair input — a 3-step, low-friction birth-info flow.
 *
 * Replaces the old dual-tab screen that showed TWO full birth forms at once
 * (a ~10-field wall — "看着就不想填") plus buried escape hatches. The new shape
 * is a linear step machine so the user only ever sees ONE person's form, and
 * the "how do we add TA?" choice comes UP FRONT (before any partner form),
 * with the zero-friction invite as the default:
 *
 *   self   — your own birth info. Name + date + gender + 时辰 + city on a
 *            single page; 时辰 is required (drives the hour pillar), city
 *            stays optional with an inline "Skip" / "Clear" affordance.
 *   choose — payoff ("your chart is ready") → three paths for TA:
 *              1. Invite TA to fill it in themselves  (recommended, default)
 *              2. I know TA's birth details           → partner form
 *              3. Skip — see mine first               → solo reading
 *   other  — TA's name + relationship + the same single-page birth form.
 *
 * `<BirthForm>` + `<Field>` + `<NameInput>` live in components/BirthForm.tsx
 * so the post-onboarding "add a partner" flow (other-meta.tsx, reached from
 * the home "+") can mount the same single-page UI instead of a wizard.
 *
 * Completion forks (unchanged from before):
 *   - You valid + partner valid → otherMode 'fill' → /(onboarding)/reveal
 *   - You valid + invite        → otherMode 'invite' → /(onboarding)/invite
 *   - You valid + skip          → solo-first (ADR-0021) → /(reading)
 *
 * Self birth is persisted once, when advancing self → choose (persistSelf), so
 * every downstream terminal action can assume it is saved + syncing.
 *
 * State binds to the shared onboarding draft (lib/onboardingDraft). Dark-only
 * (kindredDark). Tab/commit taps use expo-haptics; CTAs are the tactile
 * PrimaryButton (usePressScale + haptics).
 */

import {
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
} from '@zhop/core-ui'
import { MoonPhaseLoader, SKIN_CINNABAR_INK, usePressScale } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredRadius,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-kindred'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BirthForm, Field, NameInput } from '@/components/BirthForm'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useAuth } from '@/lib/auth'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { updateDraft, useDraft } from '@/lib/onboardingDraft'
import { saveSelfBirth, syncSelfBirthToServer } from '@/lib/selfBirth'
import { suppressNextSplash } from '@/lib/splash-control'
import { isOnboardingComplete, markOnboardingComplete } from '../index'

type Step = 'self' | 'choose' | 'other'

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

/** Seed a BirthDateFieldValue from a draft's (solar) date string. */
function dateValueFromDraft(solar: string): BirthDateFieldValue {
  return {
    input: solar,
    calendar: 'solar',
    isLeap: false,
    solarDate: birthInputToSolar(solar, 'solar'),
  }
}

export default function PairInputScreen() {
  const router = useRouter()
  const { height } = useWindowDimensions()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const { userId } = useAuth()
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])

  const [step, setStep] = useState<Step>('self')
  // Brand moon — a controlled MoonPhaseLoader that morphs to the OPPOSITE phase
  // once you finish your own side (step leaves 'self') and back again on return.
  // phase 0.25 = right-lit; 0.75 = its mirror (left-lit). It shares look + size
  // with the intro's outro moon (pair-input route = fade) for a magic-move feel.
  const moonPhase = useSharedValue(0.25)
  // Magic-move entrance: the moon arrives BIG + low (matching the intro's swollen
  // focal moon) and shrinks + rises into its resting spot — "从大到小并且有位移",
  // not a fade. Tune the START values on device to seat against the intro hand-off.
  const moonScale = useSharedValue(2.6)
  // Start ~0.32h below the resting spot so it sits roughly where the intro's
  // focal moon ended (~0.45h), then rises into place — that's the displacement.
  const moonTy = useSharedValue(height * 0.32)
  useEffect(() => {
    moonPhase.value = withTiming(step === 'self' ? 0.25 : 0.75, { duration: 720 })
  }, [step, moonPhase])
  useEffect(() => {
    moonScale.value = withTiming(1, { duration: 820, easing: Easing.out(Easing.cubic) })
    moonTy.value = withTiming(0, { duration: 820, easing: Easing.out(Easing.cubic) })
  }, [moonScale, moonTy])
  const moonStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: moonTy.value }, { scale: moonScale.value }],
  }))

  // The date fields hold what the user is typing/picking (which may be a 农历
  // date); the shared BirthDateField derives the canonical solar form on every
  // change and we commit that to the draft.
  const [selfDate, setSelfDate] = useState<BirthDateFieldValue>(() =>
    dateValueFromDraft(draft.selfSolarDate)
  )
  const [otherDate, setOtherDate] = useState<BirthDateFieldValue>(() =>
    dateValueFromDraft(draft.otherSolarDate)
  )
  const [submitting, setSubmitting] = useState(false)

  // Shared field labels — core-ui defaults, with the app's own calendar copy.
  const dateLabels = useMemo(
    () => ({
      ...birthDateFieldLabelsForLocale(lang),
      solar: t(locale, 'pairInput.calendar.solar'),
      lunar: t(locale, 'pairInput.calendar.lunar'),
      lunarHint: t(locale, 'pairInput.calendar.lunarHint'),
    }),
    [lang, locale]
  )

  const selfSolar = selfDate.solarDate
  const otherSolar = otherDate.solarDate

  // ScrollView ref — the city picker scrolls itself above the keyboard on focus.
  const scrollRef = useRef<ScrollView>(null)

  // "Filled" = enough for the downstream flow. Self / partner each need date
  // + gender + 时辰 (the hour pillar — without it the chart engine has to
  // guess); the partner additionally needs a name + relationship type (the
  // reveal create reads targetName + relationshipLabel). City stays optional.
  const relType: RelationshipType | null = (draft.relationshipLabel as RelationshipType) || null
  const selfFilled =
    selfSolar !== null && draft.selfGender !== null && typeof draft.selfTimeIndex === 'number'
  const otherFilled =
    otherSolar !== null &&
    draft.otherGender !== null &&
    typeof draft.otherTimeIndex === 'number' &&
    draft.otherName.trim().length > 0 &&
    relType !== null

  const searchCity = (query: string) => searchCityApi(query, lang, 7)

  // Commit the resolved solar date for a side into the draft (keeps the draft
  // canonical even when the user typed/picked a 农历 date).
  const commitSelfDate = (next: BirthDateFieldValue) => {
    setSelfDate(next)
    updateDraft({ selfSolarDate: next.solarDate ?? '' })
  }
  const commitOtherDate = (next: BirthDateFieldValue) => {
    setOtherDate(next)
    updateDraft({ otherSolarDate: next.solarDate ?? '' })
  }

  // ── Persist + step transitions ────────────────────────────────────────────

  /** Persist self birth (solo reading seed) + sync to server. Runs once on
   *  self → choose, so terminal actions can assume self is saved. */
  const persistSelf = async () => {
    if (!selfSolar || draft.selfGender === null) return
    const birth = {
      solarDate: selfSolar,
      timeIndex: draft.selfTimeIndex,
      gender: draft.selfGender,
      city: draft.selfBirthCity || undefined,
      lat: draft.selfBirthLat ?? undefined,
      lng: draft.selfBirthLng ?? undefined,
      timezone: draft.selfBirthTimezone ?? undefined,
    }
    await saveSelfBirth(birth)
    if (userId) void syncSelfBirthToServer(userId, birth)
  }

  /** self → choose. Persists self up-front, then surfaces the TA paths. */
  const goChoose = async () => {
    if (!selfFilled || submitting) return
    await persistSelf()
    setStep('choose')
  }

  // ── Terminal forks (self already persisted in goChoose) ─────────────────────

  /** "I know their details" → partner form. */
  const goFillOther = () => setStep('other')

  /** "Invite them to fill it in" → invite flow (channel-agnostic share). */
  const goInvite = () => {
    updateDraft({ otherMode: 'invite' })
    router.push('/(onboarding)/invite')
  }

  /** "Skip — see mine first" → solo-first completion (ADR-0021). */
  const goSkip = async () => {
    if (submitting) return
    setSubmitting(true)
    if (!(await isOnboardingComplete())) {
      await markOnboardingComplete()
    }
    suppressNextSplash()
    router.replace('/(reading)')
  }

  /** Both sides ready → reveal flow (solo bond create lives in reveal.tsx). */
  const handlePairUp = async () => {
    if (!otherFilled || submitting) return
    setSubmitting(true)
    updateDraft({ otherMode: 'fill' })
    router.push('/(onboarding)/reveal')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }} edges={['top']}>
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
        {/* Brand moon — shared with the intro outro (route = fade) for continuity;
            morphs to the opposite phase once your own side is done. */}
        <Animated.View
          style={[{ alignItems: 'center', marginBottom: kindredSpacing.sm }, moonStyle]}
        >
          <MoonPhaseLoader size={64} phase={moonPhase} skin={SKIN_CINNABAR_INK} />
        </Animated.View>

        {step === 'self' && (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: kindredSpacing.lg }}>
            <Field label={t(locale, 'pairInput.name.self')}>
              <NameInput
                value={draft.selfName}
                placeholder={t(locale, 'name.placeholder')}
                onChange={(v) => updateDraft({ selfName: v })}
              />
            </Field>
            <BirthForm
              locale={locale}
              lang={lang}
              date={selfDate}
              onDate={commitSelfDate}
              dateLabels={dateLabels}
              timeIndex={draft.selfTimeIndex}
              onTime={(idx) => updateDraft({ selfTimeIndex: idx })}
              gender={draft.selfGender}
              onGender={(g) => updateDraft({ selfGender: g })}
              city={draft.selfBirthCity}
              lat={draft.selfBirthLat}
              lng={draft.selfBirthLng}
              timezone={draft.selfBirthTimezone}
              onCity={(patch) => updateDraft(patch)}
              searchCity={searchCity}
              fieldPrefix='self'
              scrollRef={scrollRef}
            />
            <View style={{ marginTop: kindredSpacing.sm }}>
              <PrimaryButton
                label={t(locale, 'common.next')}
                onPress={() => void goChoose()}
                disabled={!selfFilled}
              />
            </View>
          </Animated.View>
        )}

        {step === 'choose' && (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: kindredSpacing.lg }}>
            <BackLink label={t(locale, 'pairInput.back')} onPress={() => setStep('self')} />
            {/* Payoff — the user has invested in their own chart; reward it
                before asking for the harder thing (TA's details). */}
            <View style={{ alignItems: 'center', gap: kindredSpacing.xs }}>
              <Text style={[kindredType.seal, { color: kindredDark.accent }]}>
                {`${t(locale, 'pairInput.selfReady')}  ✓`}
              </Text>
              <Text style={[kindredType.title, { color: kindredDark.text }]}>
                {t(locale, 'mode.title')}
              </Text>
              <Text
                style={[
                  kindredType.body,
                  { color: kindredDark.textSecondary, textAlign: 'center' },
                ]}
              >
                {t(locale, 'mode.subtitle')}
              </Text>
            </View>

            <View style={{ gap: kindredSpacing.md }}>
              {/* Default happy path — TA fills their own on their own device, so
                  the user never has to know TA's birth time. Zero friction. */}
              <ChoiceCard
                title={t(locale, 'pair.other.intent.invite')}
                hint={t(locale, 'mode.invite.hint')}
                badge={t(locale, 'pairInput.recommended')}
                onPress={goInvite}
              />
              <ChoiceCard
                title={t(locale, 'pair.other.intent.know')}
                hint={t(locale, 'mode.know.hint')}
                onPress={goFillOther}
              />
              <SkipRow
                label={t(locale, 'pair.other.intent.skip')}
                hint={t(locale, 'mode.skip.hint')}
                disabled={submitting}
                onPress={() => void goSkip()}
              />
            </View>
          </Animated.View>
        )}

        {step === 'other' && (
          <Animated.View entering={FadeInDown.duration(260)} style={{ gap: kindredSpacing.lg }}>
            <BackLink label={t(locale, 'pairInput.back')} onPress={() => setStep('choose')} />
            <Text style={[kindredType.heading, { color: kindredDark.text }]}>
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
              onCity={(patch) => updateDraft(patch)}
              searchCity={searchCity}
              fieldPrefix='other'
              scrollRef={scrollRef}
            />
            <View style={{ marginTop: kindredSpacing.sm }}>
              <PrimaryButton
                label={t(locale, 'pair.cta.read')}
                onPress={() => void handlePairUp()}
                disabled={!otherFilled}
                loading={submitting}
                tone='seal'
              />
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

/* ── Choose-step pieces ──────────────────────────────────────────────────── */

/** A tappable path card (invite / know). Tactile via usePressScale + haptics. */
function ChoiceCard({
  title,
  hint,
  badge,
  onPress,
}: {
  title: string
  hint: string
  badge?: string
  onPress: () => void
}) {
  const { animatedStyle, onPressIn, onPressOut } = usePressScale()
  const handle = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    onPress()
  }
  // The recommended card carries the gold accent border; others read calmer.
  const accented = badge != null
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handle}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole='button'
        accessibilityLabel={title}
        style={{
          borderWidth: accented ? 1 : 0.5,
          borderColor: accented ? kindredDark.accent : kindredDark.border,
          backgroundColor: accented ? `${kindredDark.accent}12` : 'transparent',
          borderRadius: kindredRadius.md,
          paddingVertical: kindredSpacing.md,
          paddingHorizontal: kindredSpacing.md,
          gap: kindredSpacing.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: kindredSpacing.sm }}>
          <Text style={[kindredType.body, { color: kindredDark.text, fontWeight: '600', flex: 1 }]}>
            {title}
          </Text>
          {badge != null && (
            <Text
              style={[
                kindredType.seal,
                {
                  color: kindredDark.bg,
                  backgroundColor: kindredDark.accent,
                  paddingHorizontal: kindredSpacing.sm,
                  paddingVertical: 2,
                  borderRadius: kindredRadius.sm,
                  overflow: 'hidden',
                },
              ]}
            >
              {badge}
            </Text>
          )}
          <Text style={{ color: kindredDark.textMuted, fontSize: 18 }}>→</Text>
        </View>
        <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>{hint}</Text>
      </Pressable>
    </Animated.View>
  )
}

/** The de-emphasised "skip / see mine first" path. */
function SkipRow({
  label,
  hint,
  disabled,
  onPress,
}: {
  label: string
  hint: string
  disabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole='button'
      style={{
        opacity: disabled ? 0.4 : 1,
        paddingVertical: kindredSpacing.sm,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Text
        style={[
          kindredType.body,
          { color: kindredDark.textSecondary, textDecorationLine: 'underline' },
        ]}
      >
        {label}
      </Text>
      <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>{hint}</Text>
    </Pressable>
  )
}

function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole='button'>
      <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>{`←  ${label}`}</Text>
    </Pressable>
  )
}

/* ── BirthForm + Field + NameInput moved to components/BirthForm.tsx so
     other-meta.tsx can mount the same single-page form for the post-onboarding
     "I know their details" flow (was a multi-step BirthInfoForm wizard). ── */

