/**
 * In-app birth info — the single-page HexAstral standard form (the same shape
 * Yuun/Yuel use), NOT the old multi-step `BirthInfoForm` wizard. Composed from
 * the core-ui atomic fields (BirthDateField + ShichenField + a gender segmented
 * control + an opt-in 真太阳时 precise-time disclosure), themed with Fēng's zinc
 * accent from `useTheme()`. Wired to Fēng's HMAC save/geocode; persists the
 * fuller shape (precise clock + calibration + 农历 round-trip).
 *
 * Feng only needs year + gender for 命卦, but collecting the full 八字 set keeps
 * parity with the suite and powers the personal 八字 / 命卦 report chapter. Once a
 * birth is on record the form collapses to a one-line summary; tapping it (or
 * "Edit") re-expands for changes.
 */

import { resolveBirthHour } from '@zhop/astro-core'
import {
  BirthClockField,
  BirthDateField,
  type BirthDateFieldValue,
  birthDateFieldLabelsForLocale,
  CityPicker,
  type CityRecord,
  DEFAULT_TOP_CITIES,
  formatHourMinute,
  isCjkScript,
  ShichenField,
  type ShichenIndex,
  shichenFieldLabelsForLocale,
  shichenInlineLabel,
  shichenRange,
  Toggle,
  useTheme,
} from '@zhop/core-ui'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ChevronRight } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { FengMark } from '@/components/FengMark'
import { type FengBirthInfo, fetchBirthInfo, saveBirthInfo } from '@/lib/birth-info'
import { fengBirthCopy } from '@/lib/birthInfoCopy'
import { searchCity } from '@/lib/geocode'
import { resolveLocale, useStrings } from '@/lib/i18n'
import { spacing } from '@/lib/theme'

/** 时辰 branches — the ShichenField's own glyph order (子 = index 0). */
const SHICHEN_BRANCHES = '子丑寅卯辰巳午未申酉戌亥'
/** 时辰 clock windows (24h), 子 = 0 covering 23:00–01:00. For the Latin summary. */
const SHICHEN_RANGES = [
  '23:00 – 01:00',
  '01:00 – 03:00',
  '03:00 – 05:00',
  '05:00 – 07:00',
  '07:00 – 09:00',
  '09:00 – 11:00',
  '11:00 – 13:00',
  '13:00 – 15:00',
  '15:00 – 17:00',
  '17:00 – 19:00',
  '19:00 – 21:00',
  '21:00 – 23:00',
] as const

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function formatMinutes(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`
}
/** Clock minutes → 时辰 index 0..11 (子时 = 0, covers 23:00–01:00). A precise
 *  clock snaps the 时辰 wheel to its window. */
function clockToShichenIndex(min: number): ShichenIndex {
  const h = Math.floor(min / 60)
  return (Math.floor((h + 1) / 2) % 12) as ShichenIndex
}
/** 时辰 label for the collapsed summary — CJK shows 「未时」, Latin the clock range. */
function shichenSummaryLabel(index: number, locale: string): string {
  if (isCjkScript(locale)) {
    return shichenInlineLabel(index, SHICHEN_BRANCHES[index] ?? '', locale)
  }
  return shichenRange(SHICHEN_RANGES[index] ?? '', locale)
}
/** 排盘小时 → collapsed 时辰 label, for the 真太阳时 before→after preview line. */
function shichenLabelForHour(hour: number, locale: string): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  return shichenSummaryLabel(idx, locale)
}

export default function BirthInfoScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const locale = resolveLocale()
  const t = useStrings(locale)
  const preciseCopy = fengBirthCopy(locale)

  // `birth` is the canonical saved object (birthSolarDate is always gregorian,
  // even when the user entered 农历). `dateField` is the editor-mode state — the
  // shared BirthDateField value (compact input + summonable picker). On save we
  // persist both the canonical solar date and the original 农历 input so
  // re-editing restores the user's calendar choice exactly.
  const [birth, setBirth] = useState<FengBirthInfo>({
    birthSolarDate: '',
    birthTimeIndex: 0,
    gender: '男',
  })
  const [dateField, setDateField] = useState<BirthDateFieldValue>({
    input: '',
    calendar: 'solar',
    isLeap: false,
    solarDate: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [birthSaved, setBirthSaved] = useState(false)
  // Once a birth is on record the form collapses to a one-line summary; tapping
  // it (or Edit) re-expands. First-time users (no record) see the full form.
  const [hasSavedBirth, setHasSavedBirth] = useState(false)
  const [editingBirth, setEditingBirth] = useState(false)
  // Precise time + birthplace are an opt-in disclosure, collapsed by default so
  // the everyday 时辰 path stays short. Auto-expanded when a precise clock is on
  // record.
  const [showPrecise, setShowPrecise] = useState(false)

  // 时辰-only vs a picked shichen — `null` means the user chose "unknown".
  const [timeIndex, setTimeIndex] = useState<ShichenIndex | null>(0)

  const scrollRef = useRef<ScrollView>(null)

  // Shared field labels — core-ui defaults, with Fēng's own calendar copy.
  const dateLabels = useMemo(
    () => ({
      ...birthDateFieldLabelsForLocale(locale),
      solar: t.birth_calendar_solar,
      lunar: t.birth_calendar_lunar,
      lunarHint: t.birth_calendar_lunar_hint,
    }),
    [locale, t]
  )

  const computedSolarDate = dateField.solarDate
  const birthValid = computedSolarDate !== null

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const existing = await fetchBirthInfo()
        if (existing && !cancelled) {
          setBirth(existing)
          setHasSavedBirth(true)
          setTimeIndex(
            typeof existing.birthTimeIndex === 'number' &&
              existing.birthTimeIndex >= 0 &&
              existing.birthTimeIndex <= 11
              ? (existing.birthTimeIndex as ShichenIndex)
              : null
          )
          if (existing.birthClockMinutes != null || existing.birthCity?.trim()) {
            setShowPrecise(true)
          }
          // Seed the editor with what the user originally entered (农历 stays 农历).
          const isLunar = existing.birthCalendarType === 'lunar' && !!existing.birthLunarInput
          setDateField({
            input:
              isLunar && existing.birthLunarInput
                ? existing.birthLunarInput
                : existing.birthSolarDate,
            calendar: isLunar ? 'lunar' : 'solar',
            isLeap: isLunar && existing.birthLunarIsLeap === true,
            solarDate: existing.birthSolarDate || null,
          })
        }
      } catch {
        // fresh entry — leave the form empty
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const birthSummary = useMemo(() => {
    const parts: string[] = [birth.birthSolarDate]
    parts.push(timeIndex === null ? t.birth_time_unknown : shichenSummaryLabel(timeIndex, locale))
    if (birth.gender === '男') parts.push(t.birth_gender_male)
    else if (birth.gender === '女') parts.push(t.birth_gender_female)
    const city = birth.birthCity?.trim()
    if (city) parts.push(city)
    return parts.join(' · ')
  }, [birth, timeIndex, t, locale])

  // ── precise-time disclosure (真太阳时) ──────────────────────────────────────
  const cityValue: CityRecord | null = birth.birthCity
    ? {
        name: birth.birthCity,
        country: '',
        lat: birth.birthLatitude ? Number(birth.birthLatitude) : 0,
        lng: birth.birthLongitude ? Number(birth.birthLongitude) : 0,
        timezone: birth.birthTimezoneId ?? null,
      }
    : null

  const lng = birth.birthLongitude ? Number(birth.birthLongitude) : null

  // A precise clock also snaps the 时辰 wheel to that clock's 时辰 (the 八字
  // calibrates the clock on top — they can differ for a birth near a boundary).
  const handleClock = (min: number) => {
    const snapped = clockToShichenIndex(min)
    setBirth((prev) => ({ ...prev, birthClockMinutes: min, birthTimeIndex: snapped }))
    setTimeIndex(snapped)
  }
  const handlePreciseCity = (city: CityRecord) =>
    setBirth((prev) => ({
      ...prev,
      birthCity: city.name,
      birthLatitude: String(city.lat),
      birthLongitude: String(city.lng),
      birthTimezoneId: city.timezone ?? undefined,
    }))

  // Live 真太阳时 before→after preview — only when a clock + city are present and
  // calibration is on. Computed through the SAME resolver the chart uses.
  let calibrationPreview: string | null = null
  if (birth.birthClockMinutes != null && lng != null && computedSolarDate) {
    const [yStr, mStr, dStr] = computedSolarDate.split('-')
    const y = Number.parseInt(yStr ?? '', 10)
    const mo = Number.parseInt(mStr ?? '', 10)
    const d = Number.parseInt(dStr ?? '', 10)
    if (y && mo && d) {
      const resolved = resolveBirthHour({
        year: y,
        month: mo,
        day: d,
        clockMinutes: birth.birthClockMinutes,
        calibrate: birth.birthSolarCalibrate ?? undefined,
        longitude: lng,
        timezoneId: birth.birthTimezoneId ?? undefined,
        city: birth.birthCity || undefined,
      })
      if (resolved.calibrated) {
        calibrationPreview = `${formatHourMinute(formatMinutes(birth.birthClockMinutes), locale)} → ${preciseCopy.trueSolarLabel} ${formatHourMinute(`${pad2(resolved.hour)}:${pad2(resolved.minute)}`, locale)} · ${shichenLabelForHour(resolved.hour, locale)}`
      }
    }
  }

  const saveBirth = async () => {
    if (!birthValid || !computedSolarDate) return
    const isLunar = dateField.calendar === 'lunar'
    const updated: FengBirthInfo = {
      ...birth,
      birthSolarDate: computedSolarDate,
      birthTimeIndex: timeIndex ?? 0,
      birthCalendarType: dateField.calendar,
      birthLunarInput: isLunar ? dateField.input : undefined,
      birthLunarIsLeap: isLunar ? dateField.isLeap : undefined,
    }
    setSaving(true)
    try {
      await saveBirthInfo(updated)
      setBirth(updated)
      setBirthSaved(true)
      setHasSavedBirth(true)
      // Collapse back to the summary once saved; tap it to edit again.
      setEditingBirth(false)
      setTimeout(() => setBirthSaved(false), 2000)
    } catch {
      // Surface via the button state staying enabled; a retry re-attempts.
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <StatusBar style='light' />
        <ActivityIndicator color={colors.accent} />
      </View>
    )
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style='light' />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        {/* Crown + title — the (birth-info) stack has no header, so the mark +
            title carry the screen identity. */}
        <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing.sm }}>
          <FengMark size={40} color={colors.accent} />
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>
            {t.birth_info_title}
          </Text>
          <Text
            style={{
              color: colors.secondary,
              fontSize: 13,
              lineHeight: 19,
              textAlign: 'center',
            }}
          >
            {t.birth_info_subtitle}
          </Text>
        </View>

        {hasSavedBirth && !editingBirth ? (
          <Pressable
            onPress={() => setEditingBirth(true)}
            accessibilityRole='button'
            accessibilityLabel={t.profile_birth_edit_cta}
            style={({ pressed }) => ({
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15 }} numberOfLines={1}>
              {birthSummary}
            </Text>
            <ChevronRight size={16} color={colors.secondary} strokeWidth={1.4} />
          </Pressable>
        ) : (
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 14,
              padding: spacing.lg,
              gap: spacing.lg,
            }}
          >
            {/* Birth date — the shared HexAstral standard (BirthDateField):
                compact auto-formatted input that works identically for 公历 and
                农历, plus a wheel affordance that summons the system cascading
                picker (solar) / lunar wheels (农历). Storage stays solar; 农历
                inputs convert on the fly. */}
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>
                {t.birth_date_label}
              </Text>
              <BirthDateField
                value={dateField}
                onChange={setDateField}
                accent={colors.accent}
                labels={dateLabels}
                locale={locale}
              />
            </View>

            {/* Shichen — one-line wheel field + "unknown" Pressable. */}
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>
                  {t.birth_time_label}
                </Text>
                <Pressable
                  onPress={() => setTimeIndex(null)}
                  hitSlop={6}
                  accessibilityRole='button'
                  accessibilityLabel={t.birth_time_unknown}
                >
                  <Text
                    style={{
                      color: timeIndex === null ? colors.accent : colors.secondary,
                      fontSize: 12,
                      fontWeight: timeIndex === null ? '600' : '400',
                    }}
                  >
                    {t.birth_time_unknown}
                  </Text>
                </Pressable>
              </View>
              <ShichenField
                value={timeIndex}
                onChange={(idx: ShichenIndex) => setTimeIndex(idx)}
                accent={colors.accent}
                labels={shichenFieldLabelsForLocale(locale)}
                locale={locale}
              />
            </View>

            {/* Gender — 2-button segmented. */}
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 2 }}>
                {t.birth_gender_label}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                {(
                  [
                    ['男', t.birth_gender_male],
                    ['女', t.birth_gender_female],
                  ] as const
                ).map(([key, label]) => {
                  const selected = birth.gender === key
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setBirth((prev) => ({ ...prev, gender: key }))}
                      style={{
                        flex: 1,
                        paddingVertical: spacing.sm,
                        borderRadius: 10,
                        borderWidth: 0.5,
                        borderColor: selected ? colors.accent : colors.separator,
                        backgroundColor: selected ? colors.accent : 'transparent',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          color: selected ? colors.bg : colors.text,
                          fontSize: 15,
                          fontWeight: selected ? '600' : '400',
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            {/* Precise time + birthplace — opt-in disclosure. 真太阳时 correction
                only earns its keep at minute precision, so the exact clock is
                folded away, and the birth city appears DYNAMICALLY once a precise
                time is entered — picking it is what enables 真太阳时 calibration of
                the 时柱. 时辰-only entry collects no birthplace. */}
            <View style={{ gap: spacing.sm }}>
              <Pressable
                onPress={() => setShowPrecise((s) => !s)}
                hitSlop={8}
                accessibilityRole='button'
                accessibilityLabel={preciseCopy.precisePrompt}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={{ color: colors.accent, fontSize: 13 }}>
                  {`${showPrecise ? '▾  ' : '▸  '}${preciseCopy.precisePrompt}`}
                </Text>
              </Pressable>

              {showPrecise ? (
                <View style={{ gap: spacing.md }}>
                  <BirthClockField
                    value={birth.birthClockMinutes ?? null}
                    onChange={handleClock}
                    accent={colors.accent}
                    locale={locale}
                    labels={{
                      placeholder: preciseCopy.preciseTimeLabel,
                      done: preciseCopy.done,
                    }}
                  />

                  {/* Birthplace appears only once a precise clock is set. */}
                  {birth.birthClockMinutes != null ? (
                    <View style={{ gap: spacing.md }}>
                      <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
                        {preciseCopy.preciseCityLabel}
                      </Text>
                      <CityPicker
                        value={cityValue}
                        onSelect={handlePreciseCity}
                        search={searchCityRecords}
                        topCities={DEFAULT_TOP_CITIES}
                        placeholder={preciseCopy.preciseCityPlaceholder}
                        scrollRef={scrollRef}
                      />

                      {lng != null ? (
                        <View style={{ gap: spacing.sm }}>
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Text style={{ color: colors.text, fontSize: 15 }}>
                              {preciseCopy.calibrateLabel}
                            </Text>
                            <Toggle
                              value={birth.birthSolarCalibrate !== false}
                              onValueChange={(on) =>
                                setBirth((prev) => ({ ...prev, birthSolarCalibrate: on }))
                              }
                              accent={colors.accent}
                            />
                          </View>
                          {calibrationPreview ? (
                            <Text style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
                              {calibrationPreview}
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Save — disabled until date is valid. "Saved" feedback briefly. */}
            <Pressable
              onPress={saveBirth}
              disabled={!birthValid || saving}
              accessibilityRole='button'
              accessibilityLabel={t.birth_save}
              style={{
                marginTop: spacing.sm,
                alignSelf: 'stretch',
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: birthValid ? colors.accent : colors.accentGhost,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: birthValid ? colors.bg : colors.secondary,
                  fontSize: 15,
                  fontWeight: '600',
                  letterSpacing: 1,
                }}
              >
                {saving ? t.birth_saving : birthSaved ? t.birth_saved : t.birth_save}
              </Text>
            </Pressable>
            <Text style={{ color: colors.secondary, fontSize: 12 }}>{t.birth_hint}</Text>
          </View>
        )}

        {/* Done — leaves the screen; the profile row reflects the saved summary. */}
        <Pressable
          onPress={() => router.back()}
          accessibilityRole='button'
          accessibilityLabel={preciseCopy.done}
          style={({ pressed }) => ({
            alignSelf: 'center',
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.xl,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: colors.secondary, fontSize: 14 }}>{preciseCopy.done}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

async function searchCityRecords(query: string): Promise<CityRecord[]> {
  const results = await searchCity(query)
  return results.map((c) => ({
    name: c.name,
    country: c.countryCode,
    lat: c.lat,
    lng: c.lon,
    timezone: c.timezone,
    displayName: c.displayName,
  }))
}
