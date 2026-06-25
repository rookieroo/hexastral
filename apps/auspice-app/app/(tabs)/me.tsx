/**
 * Me — Tier-3 surface (no IAP, no required sign-in).
 *
 * Sections:
 *   - Birth info (single-page quick form — date / 时辰 / gender / city)
 *   - Language switcher (DEV-only — production users get device locale)
 *   - 外地时区 (preset city picker + free-text fallback)
 *   - Daily push toggle
 *   - Discover (collapsed flagship funnel)
 *   - Privacy / Terms (row-style)
 *
 * Birth form replaces the prior bare TextInput per user feedback 2026-06.
 * Single-page (no wizard) so power users can tweak everything at once;
 * onboarding-style multi-step is preserved as `BirthInfoForm` in
 * `@zhop/core-ui` for apps that need the deeper flow.
 */

import { resolveBirthHour, solarToLunar } from '@zhop/astro-core'
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
import { ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import {
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  hasEntitlement,
  setDevEntitlementOverride,
  useEntitlements,
} from '@zhop/satellite-runtime'
import { type Href, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { FlagshipUpsellInsert } from '@/components/FlagshipUpsellInsert'
import { type AuspiceBirthInfo, getAuspiceBirthInfo, setAuspiceBirthInfo } from '@/lib/birth'
import { auspiceBirthCopy } from '@/lib/birthInfoCopy'
import { openCalendarSubscribe, openPersonalCalendarSubscribe } from '@/lib/calendar-feed'
import { privacyUrl, termsUrl } from '@/lib/config'
import { searchCity } from '@/lib/geocode'
import { type Locale, resolveLocale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { resetOnboarding } from '@/lib/onboarding-seen'
import {
  disableDailyPush,
  disableTimelineReminders,
  enableDailyPush,
  enableTimelineReminders,
  fireTestDailyPush,
  isEveningPushEnabled,
  isPushEnabled,
  isTimelineRemindersEnabled,
  setEveningPushEnabled,
} from '@/lib/push'
import { type PushTypeMeta, pushTypeById } from '@/lib/pushRegistry'
import { TWELVE_SHICHEN } from '@/lib/shichen-content'

const LOCALES: { key: Locale; label: string }[] = [
  { key: 'zh-Hans', label: '简体中文' },
  { key: 'zh-Hant', label: '繁體中文' },
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
]

/**
 * 时辰 label for the collapsed birth summary. CJK shows 「未时」; Latin scripts
 * (North America) show the AM/PM clock range (e.g. "1 PM – 3 PM") — the branch
 * glyph is opaque to a Latin reader, and the brief is am/pm for NA (synced from
 * kindred 2026-06; same shichen-i18n source the ShichenField uses).
 */
function shichenSummaryLabel(index: number, locale: string): string {
  const sc = TWELVE_SHICHEN[index]
  if (!sc) return ''
  return isCjkScript(locale)
    ? shichenInlineLabel(index, sc.branch, locale)
    : shichenRange(sc.range, locale)
}

/**
 * 农历生日的展示串 — for the collapsed birth summary when the user entered their
 * birthday as 农历. CJK shows the full 干支年 + 农历月日 (e.g. 「壬申年 正月初六」);
 * en falls back to a numeric "Lunar M/D" since the 农历 month/day glyphs are
 * opaque to a non-CJK reader. Derived from the canonical solar date — the
 * conversion round-trips correctly, so 闰月 birthdays render with the 闰 prefix.
 */
function lunarBirthLabel(solarDate: string, locale: string): string | null {
  const [y, mo, d] = solarDate.split('-').map(Number)
  if (!y || !mo || !d) return null
  try {
    const l = solarToLunar(y, mo, d)
    if (locale === 'en') return `Lunar ${l.month}/${l.day}`
    return `${l.yearGanZhi}年 ${l.monthName}${l.dayName}`
  } catch {
    return null
  }
}

/* ── precise-time helpers (真太阳时 disclosure, synced from kindred) ─────────── */
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
/** 排盘小时 → collapsed 时辰 label, for the 真太阳时 before→after preview line. */
function shichenLabelForHour(hour: number, locale: string): string {
  const idx = hour === 23 ? 0 : Math.floor((hour + 1) / 2) % 12
  return shichenSummaryLabel(idx, locale)
}

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

/** One push-notification toggle row — label (+ optional PRO badge / hint) + Switch.
 *  Replaces three near-identical Switch blocks; driven by the `pushToggles` config
 *  which takes its order + PRO flag from lib/pushRegistry (single source of truth). */
function PushToggleRow({
  label,
  hint,
  value,
  onToggle,
  showPro,
}: {
  label: string
  hint?: string
  value: boolean
  onToggle: (next: boolean) => void | Promise<void>
  /** Show the PRO badge — this push type is a Pro perk the user hasn't unlocked. */
  showPro: boolean
}) {
  const { colors, spacing } = useTheme()
  return (
    <View>
      <SectionLabel>{label}</SectionLabel>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: colors.card,
          borderRadius: 14,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
            {showPro ? (
              <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>PRO</Text>
            ) : null}
          </View>
          {hint ? (
            <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>{hint}</Text>
          ) : null}
        </View>
        <Toggle value={value} onValueChange={onToggle} accent={colors.accent} />
      </View>
    </View>
  )
}

export default function MeScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale, setLocale, followSystem, isOverridden } = useStrings()
  const router = useRouter()
  // Discover (flagship funnel) is collapsed by default so Me stays quiet —
  // matches the ming-pan 生态 pattern (ADR-0018: no ad slots on funnel surfaces).
  const [ecoOpen, setEcoOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [calPaywallOpen, setCalPaywallOpen] = useState(false)
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')
  // DEV-only Pro override — cycled from the debug block at the bottom. Re-renders
  // this screen so all `hasEntitlement`-gated UI flips live.
  const [devPro, setDevPro] = useState<DevEntitlementOverride>(getDevEntitlementOverride())
  const cycleDevPro = () => {
    const next: DevEntitlementOverride = devPro === null ? 'pro' : devPro === 'pro' ? 'free' : null
    setDevEntitlementOverride(next)
    setDevPro(next)
  }
  // DEV-only: clear the first-launch flag and jump straight to the welcome so it
  // can be re-previewed without reinstalling. Entering it re-marks seen.
  const resetWelcome = () => {
    void resetOnboarding().then(() => router.replace('/welcome'))
  }

  // ── Birth info form state ───────────────────────────────────────────────
  // `birth` is the canonical saved object (solarDate is always the gregorian
  // form, even when the user originally entered 农历). `dateField` is the
  // editor-mode state: the shared BirthDateField value (compact input +
  // summonable picker — the same standard as kindred's pair-input form). On
  // save we persist both the canonical solarDate and the original lunar input
  // (lunarInput + lunarIsLeap) so re-editing restores the user's 农历 choice
  // exactly instead of a possibly-leap-month-ambiguous reverse conversion.
  const [birth, setBirth] = useState<AuspiceBirthInfo>({ solarDate: '', timeIndex: null })
  const [dateField, setDateField] = useState<BirthDateFieldValue>({
    input: '',
    calendar: 'solar',
    isLeap: false,
    solarDate: null,
  })
  const [birthSaved, setBirthSaved] = useState(false)
  // Once a birth is on record, the form collapses to a one-line summary; tapping
  // it re-expands for edits. First-time users (no record yet) see the full form.
  const [hasSavedBirth, setHasSavedBirth] = useState(false)
  const [editingBirth, setEditingBirth] = useState(false)
  // Precise time + birthplace are an opt-in disclosure, collapsed by default so
  // the everyday 时辰 path stays short (synced from kindred 2026-06: the exact
  // clock is folded away, and the birth city appears dynamically inside it once a
  // precise time is set). Auto-expanded when a precise clock or city is on record.
  const [showPrecise, setShowPrecise] = useState(false)

  // Shared field labels — core-ui defaults, with the app's own calendar copy.
  const dateLabels = useMemo(
    () => ({
      ...birthDateFieldLabelsForLocale(locale),
      solar: t.birthCalendarSolar,
      lunar: t.birthCalendarLunar,
      lunarHint: t.birthCalendarLunarHint,
    }),
    [locale, t]
  )

  /** The canonical solar YYYY-MM-DD derived from the date field. Null while
   *  incomplete / invalid. Drives the Save button's enabled state. */
  const computedSolarDate = dateField.solarDate
  const birthValid = computedSolarDate !== null

  // City keyboard positioning — the CityPicker pins itself above the keyboard
  // on focus when given the host ScrollView ref.
  const scrollRef = useRef<ScrollView>(null)

  const birthSummary = useMemo(() => {
    // When the user entered their birthday as 农历, show it AS 农历 (壬申年 正月初六)
    // — what they see matches what they entered, and the solar date is an internal
    // detail for 排盘 only. Derived from the canonical solarDate via solarToLunar
    // (which now round-trips correctly), so leap months format with the 闰 prefix.
    // en falls back to a numeric "Lunar M/D" (农历 names are opaque to non-CJK
    // readers). The 时辰 / gender / city pieces are unchanged.
    const dateLabel =
      birth.calendar === 'lunar'
        ? (lunarBirthLabel(birth.solarDate, locale) ?? birth.solarDate)
        : birth.solarDate
    const parts: string[] = [dateLabel]
    parts.push(
      birth.timeIndex === null
        ? t.birthShichenUnknown
        : shichenSummaryLabel(birth.timeIndex, locale)
    )
    if (birth.gender === '男') parts.push(t.birthGenderMale)
    else if (birth.gender === '女') parts.push(t.birthGenderFemale)
    const city = birth.city?.trim()
    if (city) parts.push(city)
    return parts.join(' · ')
  }, [birth, t, locale])

  // ── precise-time disclosure (真太阳时) ──────────────────────────────────────
  const preciseCopy = auspiceBirthCopy(locale)
  const cityValue: CityRecord | null = birth.city
    ? {
        name: birth.city,
        country: '',
        lat: birth.lat ?? 0,
        lng: birth.lng ?? 0,
        timezone: birth.timezone ?? null,
      }
    : null
  // A precise clock also snaps the 时辰 wheel to that clock's 时辰 (the 八字
  // calibrates the clock on top — they can differ for a birth near a boundary).
  const handleClock = (min: number) => {
    setBirth((prev) => ({ ...prev, clockMinutes: min, timeIndex: clockToShichenIndex(min) }))
  }
  const handlePreciseCity = (city: CityRecord) =>
    setBirth((prev) => ({
      ...prev,
      city: city.name,
      lat: city.lat,
      lng: city.lng,
      timezone: city.timezone ?? null,
    }))
  // Live 真太阳时 before→after preview — only when a clock + city are present and
  // calibration is on. Computed through the SAME resolver the chart uses.
  let calibrationPreview: string | null = null
  if (birth.clockMinutes != null && birth.lng != null && computedSolarDate) {
    const [yStr, mStr, dStr] = computedSolarDate.split('-')
    const y = Number.parseInt(yStr ?? '', 10)
    const mo = Number.parseInt(mStr ?? '', 10)
    const d = Number.parseInt(dStr ?? '', 10)
    if (y && mo && d) {
      const resolved = resolveBirthHour({
        year: y,
        month: mo,
        day: d,
        clockMinutes: birth.clockMinutes,
        calibrate: birth.calibrate ?? undefined,
        longitude: birth.lng,
        timezoneId: birth.timezone ?? undefined,
        city: birth.city || undefined,
      })
      if (resolved.calibrated) {
        calibrationPreview = `${formatHourMinute(formatMinutes(birth.clockMinutes), locale)} → ${preciseCopy.trueSolarLabel} ${formatHourMinute(`${pad2(resolved.hour)}:${pad2(resolved.minute)}`, locale)} · ${shichenLabelForHour(resolved.hour, locale)}`
      }
    }
  }

  useEffect(() => {
    getAuspiceBirthInfo()
      .then((info) => {
        if (!info) return
        setBirth(info)
        setHasSavedBirth(true)
        if (info.clockMinutes != null || info.city?.trim()) setShowPrecise(true)
        // Seed the editor with what the user originally entered (农历 stays 农历).
        const isLunar = info.calendar === 'lunar' && !!info.lunarInput
        setDateField({
          input: isLunar && info.lunarInput ? info.lunarInput : info.solarDate,
          calendar: isLunar ? 'lunar' : 'solar',
          isLeap: isLunar && info.lunarIsLeap === true,
          solarDate: info.solarDate || null,
        })
      })
      .catch(() => {})
  }, [])

  const saveBirth = () => {
    if (!birthValid || !computedSolarDate) return
    const isLunar = dateField.calendar === 'lunar'
    const updated: AuspiceBirthInfo = {
      ...birth,
      solarDate: computedSolarDate,
      calendar: dateField.calendar,
      lunarInput: isLunar ? dateField.input : undefined,
      lunarIsLeap: isLunar ? dateField.isLeap : undefined,
    }
    void setAuspiceBirthInfo(updated).then(() => {
      setBirth(updated)
      setBirthSaved(true)
      setHasSavedBirth(true)
      // Collapse back to the summary row once saved; tap it to edit again.
      setEditingBirth(false)
      // Briefly show "Saved" feedback — clear after 2s so the button reads "Save" again.
      setTimeout(() => setBirthSaved(false), 2000)
    })
  }

  // Push toggle — onChange requests permission + schedules the deterministic
  // daily window; revert the toggle if permission denied.
  const togglePush = async (next: boolean) => {
    if (next) {
      const ok = await enableDailyPush({
        locale,
        birthDate: birthValid ? birth.solarDate : undefined,
      })
      setPushOn(ok)
    } else {
      await disableDailyPush(locale)
      setPushOn(false)
    }
  }
  useEffect(() => {
    isPushEnabled()
      .then(setPushOn)
      .catch(() => {})
  }, [])

  // Evening (8pm "tomorrow heads-up") sub-toggle — independent of the 8am reading, so
  // the user can keep mornings but silence the evening. Only shown (in pushToggles)
  // when the master daily push is on.
  const [eveningOn, setEveningOn] = useState(true)
  const toggleEvening = async (next: boolean) => {
    await setEveningPushEnabled(next, {
      locale,
      birthDate: birthValid ? birth.solarDate : undefined,
    })
    setEveningOn(next)
  }
  useEffect(() => {
    isEveningPushEnabled()
      .then(setEveningOn)
      .catch(() => {})
  }, [])

  // 节假日 / 调休 heads-up (CN-resident-specific: 调休 makeup-workday alarms) is
  // removed 2026-06 — not on the mainland-CN store, and IP-gating it to mainland
  // China would be a hidden-feature violation (App Store 2.3.1). The lib/push.ts
  // holiday fns + cn-holidays data stay dormant for an easy restore if a mainland
  // listing ever ships.

  // 人生节点提醒 (Pro) — month-start / 大运 transition nudges to /timeline. Needs a
  // saved birth (gender + date) to compute the timeline; gates on Pro first.
  const [timelineRemindOn, setTimelineRemindOn] = useState(false)
  const toggleTimelineRemind = async (next: boolean) => {
    if (!next) {
      await disableTimelineReminders()
      setTimelineRemindOn(false)
      return
    }
    if (!isPro) {
      setCalPaywallOpen(true)
      return
    }
    if (!birth.gender || !birth.solarDate) {
      setEditingBirth(true)
      return
    }
    const ok = await enableTimelineReminders({
      locale,
      birthDate: birth.solarDate,
      birthHour: birth.timeIndex === null ? -1 : birth.timeIndex * 2,
      gender: birth.gender === '男' ? 'M' : 'F',
    })
    setTimelineRemindOn(ok)
  }
  useEffect(() => {
    isTimelineRemindersEnabled()
      .then(setTimelineRemindOn)
      .catch(() => {})
  }, [])

  // Registry-driven push toggles — order + PRO flag from lib/pushRegistry (single
  // source of truth), so the three rows render from one config + PushToggleRow
  // instead of three near-identical Switch blocks (the settings tree had grown
  // 层级很深). 生日提醒 isn't here — it's managed per-亲友 on /people.
  const pushToggles: Array<{
    id: Extract<PushTypeMeta['id'], 'daily' | 'evening' | 'timeline'>
    label: string
    hint?: string
    value: boolean
    onToggle: (next: boolean) => void | Promise<void>
  }> = [
    { id: 'daily', label: t.dailyPush, value: pushOn, onToggle: togglePush },
    // 8pm "tomorrow heads-up" — a sub-row of the daily push, so only when it's on.
    ...(pushOn
      ? [
          {
            id: 'evening' as const,
            label: t.eveningPush,
            hint: t.eveningPushHint,
            value: eveningOn,
            onToggle: toggleEvening,
          },
        ]
      : []),
    {
      id: 'timeline',
      label: t.timelineRemindToggle,
      hint: t.timelineRemindHint,
      value: timelineRemindOn,
      onToggle: toggleTimelineRemind,
    },
  ]

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        {/* No back button + no h1 title — minimalist drill-in. iOS edge-swipe-
            back + Android system-back handle nav. */}

        {/* ── Birth info (single-page form) ── */}
        <View>
          <SectionLabel>{t.personal.forYou}</SectionLabel>
          {hasSavedBirth && !editingBirth ? (
            <Pressable
              onPress={() => setEditingBirth(true)}
              accessibilityRole='button'
              accessibilityLabel={t.personal.forYou}
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
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
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
                  compact auto-formatted input that works identically for 公历
                  and 农历, plus a wheel affordance that summons the system
                  cascading picker (solar) / lunar wheels (农历). Storage stays
                  solar; 农历 inputs convert on the fly. Many Chinese users
                  (esp. older generations + diaspora) know their birthday only
                  as a 农历 date — making them pre-convert is friction. */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                  {t.birthDateLabel}
                </Text>
                <BirthDateField
                  value={dateField}
                  onChange={setDateField}
                  accent={colors.accent}
                  labels={dateLabels}
                  locale={locale}
                />
              </View>

              {/* Shichen — one-line wheel field (matches kindred + the date field
                  above; collapses the old 12-cell grid) + "unknown" Pressable. */}
              <View style={{ gap: spacing.sm }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                    {t.birthShichenLabel}
                  </Text>
                  <Pressable
                    onPress={() => setBirth((prev) => ({ ...prev, timeIndex: null }))}
                    hitSlop={6}
                    accessibilityRole='button'
                    accessibilityLabel={t.birthShichenUnknown}
                  >
                    <Text
                      style={{
                        color: birth.timeIndex === null ? colors.accent : colors.dim,
                        fontSize: 12,
                        fontWeight: birth.timeIndex === null ? '600' : '400',
                      }}
                    >
                      {t.birthShichenUnknown}
                    </Text>
                  </Pressable>
                </View>
                <ShichenField
                  value={birth.timeIndex}
                  onChange={(idx: ShichenIndex) =>
                    setBirth((prev) => ({ ...prev, timeIndex: idx }))
                  }
                  accent={colors.accent}
                  labels={shichenFieldLabelsForLocale(locale)}
                  locale={locale}
                />
              </View>

              {/* Gender — 2-button segmented. */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                  {t.birthGenderLabel}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(
                    [
                      ['男', t.birthGenderMale],
                      ['女', t.birthGenderFemale],
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
                            color: selected ? '#fff' : colors.text,
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

              {/* Precise time + birthplace — opt-in disclosure (synced from kindred
                  2026-06: "折叠起来的准确时间" + "动态出现的出生地"). 真太阳时
                  correction only earns its keep at minute precision, so the exact
                  clock is folded away here, and the birth city appears DYNAMICALLY
                  once a precise time is entered — picking it is what enables 真太阳时
                  calibration of the 时柱. 时辰-only entry collects no birthplace. */}
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
                      value={birth.clockMinutes ?? null}
                      onChange={handleClock}
                      accent={colors.accent}
                      locale={locale}
                      labels={{
                        placeholder: preciseCopy.preciseTimeLabel,
                        done: preciseCopy.done,
                      }}
                    />

                    {/* Birthplace appears only once a precise clock is set. */}
                    {birth.clockMinutes != null ? (
                      <View style={{ gap: spacing.md }}>
                        <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
                          {preciseCopy.preciseCityLabel}
                        </Text>
                        <CityPicker
                          value={cityValue}
                          onSelect={handlePreciseCity}
                          search={searchCity}
                          topCities={DEFAULT_TOP_CITIES}
                          placeholder={preciseCopy.preciseCityPlaceholder}
                          scrollRef={scrollRef}
                        />

                        {birth.lng != null ? (
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
                                value={birth.calibrate !== false}
                                onValueChange={(on) =>
                                  setBirth((prev) => ({ ...prev, calibrate: on }))
                                }
                                accent={colors.accent}
                              />
                            </View>
                            {calibrationPreview ? (
                              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
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
                disabled={!birthValid}
                accessibilityRole='button'
                accessibilityLabel={t.birthSave}
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
                    color: birthValid ? '#fff' : colors.dim,
                    fontSize: 15,
                    fontWeight: '600',
                    letterSpacing: 1,
                  }}
                >
                  {birthSaved ? t.birthSaved : t.birthSave}
                </Text>
              </Pressable>
              <Text style={{ color: colors.dim, fontSize: 12 }}>{t.personal.birthHint}</Text>
            </View>
          )}
        </View>

        {/* ── 你的命书 — the full personal 合参 deep read (八字 + 紫微). Sits right
            under the birth form since it's powered by exactly that data; routes to
            the shared scenario-yuan report engine (the Yuun side of the Yuel/Yuun
            split). ── */}
        <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
          <Pressable
            onPress={() => router.push('/reading' as Href)}
            accessibilityRole='button'
            accessibilityLabel={t.personal.readingTitle}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              gap: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>{t.personal.readingTitle}</Text>
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                {t.personal.readingHint}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
        </View>

        {/* ── 亲友生日 + 表盘与桌面组件 drill-ins ── */}
        <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
          <Pressable
            onPress={() => router.push('/people' as Href)}
            accessibilityRole='button'
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.separator,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{t.people.title}</Text>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
          {/* Watch & Widgets entry — hidden until production quality is assured:
              the native widget still renders the chosen 月相 as a flat circle
              (Skia can't run in WidgetKit; needs pre-rendered skin×phase PNGs,
              track B / ADR-0023) and no watchOS target ships yet. The /display
              screen + WatchSettings are kept; restore this row when track B lands.
          <Pressable
            onPress={() => router.push('/display' as Href)}
            accessibilityRole='button'
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{t.watchWidgets}</Text>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
          */}
        </View>

        {/* ── 外地时区 (drill-in → /remote-tz) ── */}
        <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
          <Pressable
            onPress={() => router.push('/remote-tz' as Href)}
            accessibilityRole='button'
            accessibilityLabel={t.remoteTzSection}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{t.remoteTzSection}</Text>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
        </View>

        {/* ── 推送提醒 — registry-driven (daily · 人生节点 Pro · 节假日) ── */}
        {pushToggles.map((row) => (
          <PushToggleRow
            key={row.id}
            label={row.label}
            hint={row.hint}
            value={row.value}
            onToggle={row.onToggle}
            showPro={pushTypeById(row.id)?.tier === 'pro' && !isPro}
          />
        ))}

        {/* ── Apple Calendar subscribe — opens webcal:// in system Calendar ── */}
        <View>
          <SectionLabel>{t.appleCalendarSection}</SectionLabel>
          <Pressable
            onPress={() => {
              void openCalendarSubscribe()
            }}
            accessibilityRole='button'
            accessibilityLabel={t.appleCalendarSubscribeRow}
            style={({ pressed }) => ({
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>
                {t.appleCalendarSubscribeRow}
              </Text>
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                {t.appleCalendarSubscribeHint}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
          {/* Pro 对你而言 calendar — a GENUINELY personal feed: the day overlaid
              with YOUR 用神/忌神/六冲, leading with where it DIVERGES from the
              universal 黄历 (that divergence is the 专属 value). */}
          <Pressable
            onPress={() => {
              if (!isPro) {
                setCalPaywallOpen(true)
                return
              }
              if (!computedSolarDate) {
                setEditingBirth(true)
                return
              }
              // Await the result so a failed sign/open isn't silent ("点击没反应").
              // Pass the VALIDATED computedSolarDate (birthValid guards it). In DEV
              // the alert appends the failure tag (rc / sign:NNN / fetch / open) so
              // the exact client-side cause is visible without digging Metro logs.
              void (async () => {
                const r = await openPersonalCalendarSubscribe(computedSolarDate)
                if (!r.ok) {
                  Alert.alert(
                    t.personalCalendarRow,
                    __DEV__ && r.detail
                      ? `${t.personalCalendarFailed}\n\n[${r.detail}]`
                      : t.personalCalendarFailed
                  )
                }
              })()
            }}
            accessibilityRole='button'
            accessibilityLabel={t.personalCalendarRow}
            style={({ pressed }) => ({
              marginTop: spacing.md,
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: colors.text, fontSize: 15 }}>{t.personalCalendarRow}</Text>
                {!isPro ? (
                  <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>PRO</Text>
                ) : null}
              </View>
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                {t.personalCalendarHint}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
        </View>

        <AuspicePaywallSheet visible={calPaywallOpen} onClose={() => setCalPaywallOpen(false)} />

        {/* ── Discover (collapsed) ── */}
        <View>
          <Pressable
            onPress={() => setEcoOpen((v) => !v)}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel={t.discover}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
              {t.discover}
            </Text>
            {ecoOpen ? (
              <ChevronDownIcon size={18} color={colors.secondary} />
            ) : (
              <ChevronRightIcon size={18} color={colors.secondary} />
            )}
          </Pressable>
          {ecoOpen ? (
            <View style={{ gap: spacing.md, marginTop: spacing.md }}>
              <FlagshipUpsellInsert flagship='feng' />
              <FlagshipUpsellInsert flagship='yuan' />
            </View>
          ) : null}
        </View>

        {/* ── Privacy / Terms (row-style) ── */}
        <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
          <Pressable
            onPress={() => Linking.openURL(privacyUrl(locale)).catch(() => {})}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.separator,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{t.privacy}</Text>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL(termsUrl(locale)).catch(() => {})}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.text, fontSize: 15 }}>{t.terms}</Text>
            <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
          </Pressable>
        </View>

        {/* ── Language (DEV-only) — kept at the very bottom so it never crowds
            the real settings above it. ── */}
        {__DEV__ ? (
          <View>
            {/* Force Pro/Free locally — cycles Off (real RC) → PRO → FREE. */}
            <SectionLabel>PRO · DEV</SectionLabel>
            <View
              style={{
                borderRadius: 14,
                backgroundColor: colors.card,
                overflow: 'hidden',
                marginBottom: spacing.lg,
              }}
            >
              <Pressable
                onPress={cycleDevPro}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>Force entitlement</Text>
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
                  {devPro === null ? 'Off · real' : devPro === 'pro' ? 'PRO' : 'FREE'}
                </Text>
              </Pressable>
            </View>
            {/* Fire today's daily push now (~2s) to eyeball the real rendered content —
                the en 语料钩子 when birth info is set + the /day API serves `dailyHook`. */}
            <SectionLabel>PUSH · DEV</SectionLabel>
            <View
              style={{
                borderRadius: 14,
                backgroundColor: colors.card,
                overflow: 'hidden',
                marginBottom: spacing.lg,
              }}
            >
              <Pressable
                onPress={async () => {
                  try {
                    const fired = await fireTestDailyPush({
                      locale,
                      birthDate: birthValid ? birth.solarDate : undefined,
                    })
                    Alert.alert('Fired in ~2s', `${fired.title}\n\n${fired.body}`)
                  } catch (e) {
                    Alert.alert('Push failed', String(e))
                  }
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>Fire daily push now</Text>
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
                  Send →
                </Text>
              </Pressable>
            </View>
            <SectionLabel>ONBOARDING · DEV</SectionLabel>
            <View
              style={{
                borderRadius: 14,
                backgroundColor: colors.card,
                overflow: 'hidden',
                marginBottom: spacing.lg,
              }}
            >
              <Pressable
                onPress={resetWelcome}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>Reset welcome</Text>
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
                  Show →
                </Text>
              </Pressable>
            </View>
            <SectionLabel>{`${t.language} · DEV`}</SectionLabel>
            <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
              {/* Follow system — clears the AsyncStorage override so locale (and the
                  server push registration) tracks the device again. Without this the
                  DEV override sticks forever and masks the device-locale path. */}
              <Pressable
                onPress={followSystem}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>Follow system</Text>
                  <Text style={{ color: colors.dim, fontSize: 12 }}>{resolveLocale()}</Text>
                </View>
                {!isOverridden ? (
                  <Text style={{ color: colors.accent, fontSize: 16 }}>✓</Text>
                ) : null}
              </Pressable>
              {LOCALES.map((l) => (
                <Pressable
                  key={l.key}
                  onPress={() => setLocale(l.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: 0.5,
                    borderTopColor: colors.separator,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{l.label}</Text>
                  {isOverridden && locale === l.key ? (
                    <Text style={{ color: colors.accent, fontSize: 16 }}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}
