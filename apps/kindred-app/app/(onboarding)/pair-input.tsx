/**
 * Onboarding · Pair input — the single dual-tab birth-info screen.
 *
 * Replaces the old multi-screen wizard (self → mode → other-meta → other-birth)
 * with one screen carrying two tabs: "You / 你" on the left and the partner
 * ("TA" / "Them" / "相手") on the right (PairTabBar). Both tabs show the same
 * birth-info form, styled after Auspice's For-you / 亲友 single-page form
 * (apps/auspice-app/app/(tabs)/me.tsx + people.tsx) rather than core-ui's
 * 5-step BirthInfoForm wizard: a calendar toggle (solar / 农历, 农历 converts via
 * astro-core lunarToSolar on commit), an auto-formatted YYYY-MM-DD TextInput,
 * the 12-cell ShichenPicker, a 2-button gender segmented control, and an
 * optional geocode-backed CityPicker.
 *
 * State binds to the shared onboarding draft (lib/onboardingDraft — the self-
 * and other- prefixed fields) so a backgrounded app keeps progress; the draft
 * store is unchanged.
 *
 * The partner tab additionally collects the relationship type and, below the
 * form, surfaces three alternatives for users who can't / won't fill the
 * partner's details:
 *   - "Don't know their birth details" → /(onboarding)/invite
 *   - "Invite them to fill it in"       → /(onboarding)/invite
 *   - "Skip — later"                    → solo-first completion → /(reading)
 *
 * Completion forks:
 *   - You valid + partner valid → set otherMode 'fill' → /(onboarding)/reveal
 *     (the reveal screen runs useSoloBond create → bond detail)
 *   - You valid + skip          → solo-first (ADR-0021): saveSelfBirth +
 *     syncSelfBirthToServer + markOnboardingComplete + suppressNextSplash +
 *     router.replace('/(reading)') — same as the old self.tsx first-run branch.
 *
 * Dark-only (kindredDark); the PairTabBar thread animation is reanimated v4;
 * tab + commit taps use expo-haptics.
 */

import { lunarToSolar } from '@zhop/astro-core'
import { CityPicker, DEFAULT_TOP_CITIES, ShichenPicker } from '@zhop/core-ui'
import { V15Moon } from '@zhop/core-ui/motion'
import {
  kindredDark,
  kindredPresets,
  kindredSpacing,
  kindredType,
} from '@zhop/hexastral-tokens/kindred'
import { type RelationshipType, RelationshipTypeSelector } from '@zhop/scenario-kindred'
import { useRouter } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type PairTab, PairTabBar } from '@/components/PairTabBar'
import { useAuth } from '@/lib/auth'
import { searchCity as searchCityApi } from '@/lib/geocode'
import { type Locale, resolveLocale, t } from '@/lib/i18n'
import { type OnboardingDraft, updateDraft, useDraft } from '@/lib/onboardingDraft'
import { saveSelfBirth, syncSelfBirthToServer } from '@/lib/selfBirth'
import { suppressNextSplash } from '@/lib/splash-control'
import { isOnboardingComplete, markOnboardingComplete } from '../index'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function localeToLang(loc: string): string {
  if (loc === 'en') return 'en-US'
  if (loc === 'ja') return 'ja-JP'
  if (loc === 'zh-Hant') return 'zh-TW'
  return 'zh-CN'
}

/** Auto-insert dashes → YYYY-MM-DD; strips non-digits, caps at 8 digits. */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

/** Convert a typed date (in the chosen calendar) to a canonical solar string,
 *  or null when incomplete / an impossible 农历 date. */
function toSolar(dateInput: string, calendar: 'solar' | 'lunar'): string | null {
  if (!DATE_RE.test(dateInput)) return null
  if (calendar === 'solar') return dateInput
  const [y, m, d] = dateInput.split('-').map(Number)
  if (!y || !m || !d || y < 1900 || y > 2100) return null
  if (m < 1 || m > 12 || d < 1 || d > 30) return null
  try {
    const sd = lunarToSolar(y, m, d, false)
    const yy = sd.getFullYear()
    const mm = String(sd.getMonth() + 1).padStart(2, '0')
    const dd = String(sd.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  } catch {
    return null
  }
}

export default function PairInputScreen() {
  const router = useRouter()
  const locale = useMemo<Locale>(() => resolveLocale(), [])
  const { userId } = useAuth()
  const draft = useDraft()
  const lang = useMemo(() => localeToLang(locale), [locale])

  const [tab, setTab] = useState<PairTab>('self')
  // The date inputs hold what the user is typing (which may be a 农历 string);
  // the canonical solar form is computed on the fly + committed to the draft.
  const [selfDateInput, setSelfDateInput] = useState(draft.selfSolarDate)
  const [selfCalendar, setSelfCalendar] = useState<'solar' | 'lunar'>('solar')
  const [otherDateInput, setOtherDateInput] = useState(draft.otherSolarDate)
  const [otherCalendar, setOtherCalendar] = useState<'solar' | 'lunar'>('solar')
  const [submitting, setSubmitting] = useState(false)

  const selfSolar = useMemo(
    () => toSolar(selfDateInput, selfCalendar),
    [selfDateInput, selfCalendar]
  )
  const otherSolar = useMemo(
    () => toSolar(otherDateInput, otherCalendar),
    [otherDateInput, otherCalendar]
  )

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
  // canonical even when the user typed a 农历 date).
  const commitSelfDate = (raw: string) => {
    const next = formatDateInput(raw)
    setSelfDateInput(next)
    const solar = toSolar(next, selfCalendar)
    updateDraft({ selfSolarDate: solar ?? '' })
  }
  const commitSelfCalendar = (cal: 'solar' | 'lunar') => {
    setSelfCalendar(cal)
    updateDraft({ selfSolarDate: toSolar(selfDateInput, cal) ?? '' })
  }
  const commitOtherDate = (raw: string) => {
    const next = formatDateInput(raw)
    setOtherDateInput(next)
    updateDraft({ otherSolarDate: toSolar(next, otherCalendar) ?? '' })
  }
  const commitOtherCalendar = (cal: 'solar' | 'lunar') => {
    setOtherCalendar(cal)
    updateDraft({ otherSolarDate: toSolar(otherDateInput, cal) ?? '' })
  }

  // ── Completion paths ──────────────────────────────────────────────────────

  /** Persist self birth (solo reading seed) + sync to server. Shared by both
   *  the pair path and the skip path. */
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

  /** Both sides ready → reveal flow (solo bond create lives in reveal.tsx). */
  const handlePairUp = async () => {
    if (!selfFilled || !otherFilled || submitting) return
    setSubmitting(true)
    await persistSelf()
    updateDraft({ otherMode: 'fill' })
    router.push('/(onboarding)/reveal')
  }

  /** Skip the partner → solo-first completion (mirrors old self.tsx first run). */
  const handleSkip = async () => {
    if (!selfFilled || submitting) return
    setSubmitting(true)
    await persistSelf()
    if (!(await isOnboardingComplete())) {
      await markOnboardingComplete()
      suppressNextSplash()
      router.replace('/(reading)')
      return
    }
    // Re-entered later with onboarding already done → just land home.
    suppressNextSplash()
    router.replace('/(reading)')
  }

  /** Either invite alternative → persist self first, then the invite flow. */
  const handleInvite = async () => {
    if (!selfFilled || submitting) return
    setSubmitting(true)
    await persistSelf()
    updateDraft({ otherMode: 'invite' })
    router.push('/(onboarding)/invite')
    setSubmitting(false)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: kindredDark.bg }} edges={['top']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: kindredSpacing.screenH,
          paddingTop: kindredSpacing.lg,
          paddingBottom: kindredSpacing.xxl,
          gap: kindredSpacing.lg,
        }}
        keyboardShouldPersistTaps='handled'
      >
        <View style={{ alignItems: 'center', marginBottom: kindredSpacing.xs }}>
          <V15Moon size={56} />
        </View>

        <PairTabBar
          active={tab}
          onChange={setTab}
          selfLabel={t(locale, 'pair.tab.self')}
          otherLabel={t(locale, 'pair.tab.other')}
          selfFilled={selfFilled}
          otherFilled={otherFilled}
        />

        {tab === 'self' ? (
          <View style={{ gap: kindredSpacing.lg }}>
            <Text style={[kindredType.heading, { color: kindredDark.text }]}>
              {t(locale, 'pair.self.title')}
            </Text>
            <Field label={t(locale, 'pairInput.name.self')}>
              <NameInput
                value={draft.selfName}
                placeholder={t(locale, 'name.placeholder')}
                onChange={(v) => updateDraft({ selfName: v })}
              />
            </Field>
            <BirthForm
              locale={locale}
              calendar={selfCalendar}
              onCalendar={commitSelfCalendar}
              dateInput={selfDateInput}
              onDate={commitSelfDate}
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
            />
          </View>
        ) : (
          <View style={{ gap: kindredSpacing.lg }}>
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
              calendar={otherCalendar}
              onCalendar={commitOtherCalendar}
              dateInput={otherDateInput}
              onDate={commitOtherDate}
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
            />

            {/* Alternatives for when the partner's birth can't be filled now.
                All three require the user's own info first (selfFilled). */}
            <View
              style={{
                marginTop: kindredSpacing.sm,
                paddingTop: kindredSpacing.lg,
                borderTopWidth: 0.5,
                borderTopColor: kindredDark.separator,
                gap: kindredSpacing.md,
              }}
            >
              <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
                {t(locale, 'pairInput.alt.heading')}
              </Text>
              <AltLink
                label={t(locale, 'pairInput.alt.unknown')}
                enabled={selfFilled && !submitting}
                onPress={handleInvite}
              />
              <AltLink
                label={t(locale, 'pairInput.alt.invite')}
                enabled={selfFilled && !submitting}
                onPress={handleInvite}
              />
              <AltLink
                label={t(locale, 'pairInput.alt.skip')}
                enabled={selfFilled && !submitting}
                onPress={handleSkip}
              />
            </View>
          </View>
        )}

        {/* Primary CTA — context-sensitive. On the You tab it advances to the
            partner tab once self is filled; on the partner tab it pairs up. */}
        <View style={{ marginTop: kindredSpacing.md, alignItems: 'flex-end' }}>
          {tab === 'self' ? (
            <Pressable
              onPress={() => setTab('other')}
              disabled={!selfFilled}
              hitSlop={12}
              accessibilityRole='button'
              style={{ opacity: selfFilled ? 1 : 0.3 }}
            >
              <Text style={kindredPresets.ctaText}>{t(locale, 'pairInput.cta.next')}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handlePairUp}
              disabled={!otherFilled || submitting}
              hitSlop={12}
              accessibilityRole='button'
              style={{ opacity: otherFilled && !submitting ? 1 : 0.3 }}
            >
              <Text style={kindredPresets.ctaText}>{t(locale, 'pair.cta.read')}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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

function AltLink({
  label,
  enabled,
  onPress,
}: {
  label: string
  enabled: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      hitSlop={8}
      accessibilityRole='button'
      style={{ opacity: enabled ? 1 : 0.35 }}
    >
      <Text
        style={[
          kindredType.body,
          { color: kindredDark.textSecondary, textDecorationLine: 'underline' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/* ── Birth form (Auspice For-you layout, kindred tokens) ─────────────────── */

interface BirthFormProps {
  locale: Locale
  calendar: 'solar' | 'lunar'
  onCalendar: (cal: 'solar' | 'lunar') => void
  dateInput: string
  onDate: (raw: string) => void
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
}

function BirthForm({
  locale,
  calendar,
  onCalendar,
  dateInput,
  onDate,
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
}: BirthFormProps) {
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

  return (
    <View style={{ gap: kindredSpacing.lg }}>
      {/* Birth date — calendar toggle (solar / 农历) + auto-formatted input. */}
      <Field label={t(locale, 'date.title')}>
        <Segmented
          options={[
            { key: 'solar', label: t(locale, 'pairInput.calendar.solar') },
            { key: 'lunar', label: t(locale, 'pairInput.calendar.lunar') },
          ]}
          value={calendar}
          onChange={(k) => onCalendar(k as 'solar' | 'lunar')}
        />
        <TextInput
          value={dateInput}
          onChangeText={onDate}
          placeholder='1995-08-12'
          placeholderTextColor={kindredDark.textMuted}
          keyboardType='numeric'
          maxLength={10}
          style={{
            fontSize: kindredType.body.fontSize,
            color: kindredDark.text,
            borderBottomWidth: 0.5,
            borderBottomColor: kindredDark.border,
            paddingVertical: kindredSpacing.sm,
          }}
        />
        {calendar === 'lunar' ? (
          <Text style={[kindredType.caption, { color: kindredDark.textMuted }]}>
            {t(locale, 'pairInput.calendar.lunarHint')}
          </Text>
        ) : null}
      </Field>

      {/* 时辰 — 12-cell grid + "unknown" reset. */}
      <View style={{ gap: kindredSpacing.sm }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
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

      {/* City — optional; geocode-backed (coords + IANA tz for 真太阳时). */}
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
        />
      </Field>
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
