/**
 * Onboarding · Pair input — a 3-step, low-friction birth-info flow.
 *
 * Replaces the old dual-tab screen that showed TWO full birth forms at once
 * (a ~10-field wall — "看着就不想填") plus buried escape hatches. The new shape
 * is a linear step machine so the user only ever sees ONE person's form, and
 * the "how do we add TA?" choice comes UP FRONT (before any partner form),
 * with the zero-friction invite as the default:
 *
 *   self   — your own birth info. Progressive: name + date + gender are the
 *            visible core; 时辰 + city collapse behind a "more precise" toggle,
 *            so the screen reads short and fillable.
 *   choose — payoff ("your chart is ready") → three paths for TA:
 *              1. Invite TA to fill it in themselves  (recommended, default)
 *              2. I know TA's birth details           → partner form
 *              3. Skip — see mine first               → solo reading
 *   other  — TA's name + relationship + the same progressive birth form.
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
  BirthDateField,
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  birthInputToSolar,
  CityPicker,
  DEFAULT_TOP_CITIES,
  ShichenPicker,
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
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from 'react-native'
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { PrimaryButton } from '@/components/PrimaryButton'
import { useAuth } from '@/lib/auth'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { type OnboardingDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
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

  // "Filled" = enough for the downstream flow. Self needs date + gender; the
  // partner additionally needs a name + relationship (the reveal create reads
  // targetName + relationshipLabel).
  const relType: RelationshipType | null = (draft.relationshipLabel as RelationshipType) || null
  const selfFilled = selfSolar !== null && draft.selfGender !== null
  const otherFilled =
    otherSolar !== null &&
    draft.otherGender !== null &&
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

/* ── Field scaffold ──────────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: kindredSpacing.sm }}>
      <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>{label}</Text>
      {children}
    </View>
  )
}

function NameInput({
  value,
  placeholder,
  onChange,
}: {
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={kindredDark.textMuted}
      style={{
        fontSize: kindredType.body.fontSize,
        color: kindredDark.text,
        borderBottomWidth: 0.5,
        borderBottomColor: kindredDark.border,
        paddingVertical: kindredSpacing.sm,
      }}
    />
  )
}

/* ── Birth form (progressive: required core + collapsible "more precise") ──── */

interface BirthFormProps {
  locale: Locale
  /** BCP-47 tag (e.g. 'zh-CN') for the native date picker. */
  lang: string
  date: BirthDateFieldValue
  onDate: (next: BirthDateFieldValue) => void
  dateLabels: import('@zhop/core-ui').BirthDateFieldLabels
  timeIndex: number | null
  onTime: (idx: number | null) => void
  gender: '男' | '女' | null
  onGender: (g: '男' | '女') => void
  city: string
  lat: number | null
  lng: number | null
  timezone: string | null
  onCity: (patch: Partial<OnboardingDraft>) => void
  searchCity: (query: string) => Promise<import('@zhop/core-ui').CityRecord[]>
  /** 'self' / 'other' — picks which draft fields the city write targets. */
  fieldPrefix: 'self' | 'other'
  /** Host ScrollView — the city field scrolls itself above the keyboard on focus. */
  scrollRef: RefObject<ScrollView | null>
}

function BirthForm({
  locale,
  lang,
  date,
  onDate,
  dateLabels,
  timeIndex,
  onTime,
  gender,
  onGender,
  city,
  lat,
  lng,
  timezone,
  onCity,
  searchCity,
  fieldPrefix,
  scrollRef,
}: BirthFormProps) {
  // 时辰 + city are the "soft" fields (often unknown). Collapse them behind a
  // toggle so the form reads as 2 required fields, not a wall. Default open if
  // the draft already carries either (returning users keep their data visible).
  const hasRefinement = (typeof timeIndex === 'number' && timeIndex >= 0) || city.length > 0
  const [refineOpen, setRefineOpen] = useState(hasRefinement)

  const shichen =
    typeof timeIndex === 'number' && timeIndex >= 0 && timeIndex <= 11
      ? (timeIndex as import('@zhop/core-ui').ShichenIndex)
      : null

  const cityValue =
    city.length > 0
      ? {
          name: city,
          country: '',
          lat: lat ?? 0,
          lng: lng ?? 0,
          timezone: timezone ?? null,
        }
      : null

  const toggleRefine = () => {
    void Haptics.selectionAsync().catch(() => undefined)
    setRefineOpen((v) => !v)
  }

  return (
    <View style={{ gap: kindredSpacing.lg }}>
      {/* Birth date — the shared HexAstral standard: compact auto-formatted
          input (same habit for solar / 农历) + a wheel affordance that summons
          the system cascading picker (solar) / lunar wheels (农历). */}
      <Field label={t(locale, 'date.title')}>
        <BirthDateField
          value={date}
          onChange={onDate}
          accent={kindredDark.accent}
          labels={dateLabels}
          locale={lang}
        />
      </Field>

      {/* Gender — required for 八字 大运 direction. */}
      <Field label={t(locale, 'fill.gender')}>
        <Segmented
          options={[
            { key: '男', label: t(locale, 'fill.gender.male') },
            { key: '女', label: t(locale, 'fill.gender.female') },
          ]}
          value={gender ?? ''}
          onChange={(k) => onGender(k as '男' | '女')}
        />
      </Field>

      {/* Collapsible refinement — 时辰 + city. Optional; sharpens the chart. */}
      <Pressable
        onPress={toggleRefine}
        accessibilityRole='button'
        accessibilityState={{ expanded: refineOpen }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: kindredSpacing.sm,
        }}
      >
        <View style={{ gap: 2 }}>
          <Text style={[kindredType.body, { color: kindredDark.textSecondary }]}>
            {t(locale, 'pairInput.refine')}
          </Text>
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            {t(locale, 'pairInput.refine.hint')}
          </Text>
        </View>
        <Text style={{ color: kindredDark.textMuted, fontSize: 16 }}>{refineOpen ? '−' : '+'}</Text>
      </Pressable>

      {refineOpen && (
        <Animated.View entering={FadeInDown.duration(220)} style={{ gap: kindredSpacing.lg }}>
          {/* 时辰 — 12-cell grid + "unknown" reset. */}
          <View style={{ gap: kindredSpacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={[kindredType.seal, { color: kindredDark.textSecondary }]}>
                {t(locale, 'time.title')}
              </Text>
              <Pressable
                onPress={() => onTime(null)}
                hitSlop={6}
                accessibilityRole='button'
                accessibilityLabel={t(locale, 'fill.timeUnknown')}
              >
                <Text
                  style={[
                    kindredType.caption,
                    { color: shichen === null ? kindredDark.accent : kindredDark.textMuted },
                  ]}
                >
                  {t(locale, 'fill.timeUnknown')}
                </Text>
              </Pressable>
            </View>
            <ShichenPicker
              value={shichen}
              onChange={(idx) => onTime(idx)}
              accentColor={kindredDark.accent}
            />
          </View>

          {/* City — optional; geocode-backed (coords + IANA tz for 真太阳时).
              `scrollRef` lets the picker pin itself above the keyboard on focus. */}
          <Field label={t(locale, 'place.title')}>
            <CityPicker
              value={cityValue}
              onSelect={(c) =>
                onCity(
                  fieldPrefix === 'self'
                    ? {
                        selfBirthCity: c.name,
                        selfBirthLat: c.lat,
                        selfBirthLng: c.lng,
                        selfBirthTimezone: c.timezone ?? null,
                      }
                    : {
                        otherBirthCity: c.name,
                        otherBirthLat: c.lat,
                        otherBirthLng: c.lng,
                        otherBirthTimezone: c.timezone ?? null,
                      }
                )
              }
              search={searchCity}
              topCities={DEFAULT_TOP_CITIES}
              placeholder={t(locale, 'pairInput.cityPlaceholder')}
              scrollRef={scrollRef}
            />
          </Field>
        </Animated.View>
      )}
    </View>
  )
}

/** Inline segmented control — equal-width pills, single select (kindred tokens). */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: kindredSpacing.sm }}>
      {options.map((o) => {
        const selected = value === o.key
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole='button'
            accessibilityState={{ selected }}
            style={{
              flex: 1,
              paddingVertical: kindredSpacing.sm,
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: selected ? kindredDark.accent : kindredDark.border,
              backgroundColor: selected ? `${kindredDark.accent}1F` : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={[
                kindredType.body,
                {
                  color: selected ? kindredDark.accent : kindredDark.text,
                  fontWeight: selected ? '600' : '400',
                },
              ]}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
