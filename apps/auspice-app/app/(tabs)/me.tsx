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

import { lunarToSolar } from '@zhop/astro-core'
import {
  CityPicker,
  DEFAULT_TOP_CITIES,
  type ShichenIndex,
  ShichenPicker,
  useTheme,
} from '@zhop/core-ui'
import { ChevronDownIcon, ChevronRightIcon } from '@zhop/hexastral-icons/action'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { type Href, useRouter } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AccentPicker } from '@/components/AccentPicker'
import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { FlagshipUpsellInsert } from '@/components/FlagshipUpsellInsert'
import {
  type AuspiceBirthInfo,
  getAuspiceBirthInfo,
  isValidBirthDate,
  setAuspiceBirthInfo,
} from '@/lib/birth'
import { openCalendarSubscribe, openPersonalCalendarSubscribe } from '@/lib/calendar-feed'
import { PRIVACY_URL, TERMS_URL } from '@/lib/config'
import { searchCity } from '@/lib/geocode'
import type { Locale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import {
  disableDailyPush,
  disableHolidayHeadsUp,
  enableDailyPush,
  enableHolidayHeadsUp,
  isHolidayHeadsUpEnabled,
  isPushEnabled,
} from '@/lib/push'

const LOCALES: { key: Locale; label: string }[] = [
  { key: 'zh-Hans', label: '简体中文' },
  { key: 'zh-Hant', label: '繁體中文' },
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
]

/** 0-11 → 地支, for the collapsed birth summary (e.g. index 6 → 午时). */
const SHICHEN_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme()
  return (
    <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>
      {children}
    </Text>
  )
}

/**
 * Format a raw input string as YYYY-MM-DD by auto-inserting dashes. Strips
 * everything that isn't a digit and caps at 8 digits — predictable behavior
 * regardless of which keyboard the user is on (numeric, alphanumeric, IME).
 */
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 4) return digits
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
}

export default function MeScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale, setLocale } = useStrings()
  const router = useRouter()
  // Discover (flagship funnel) is collapsed by default so Me stays quiet —
  // matches the ming-pan 生态 pattern (ADR-0018: no ad slots on funnel surfaces).
  const [ecoOpen, setEcoOpen] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [calPaywallOpen, setCalPaywallOpen] = useState(false)
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

  // ── Birth info form state ───────────────────────────────────────────────
  // `birth` is the canonical saved object (solarDate is always the gregorian
  // form, even when the user originally entered 农历). `dateInput` + `calendar`
  // are the editor-mode state: what the user is typing right now and which
  // calendar they're typing it in. On save we run `lunarToSolar` and persist
  // both the canonical solarDate and the original lunarInput so re-editing
  // shows the user's original 农历 entry instead of a possibly-leap-month-
  // ambiguous reverse conversion.
  const [birth, setBirth] = useState<AuspiceBirthInfo>({ solarDate: '', timeIndex: null })
  const [dateInput, setDateInput] = useState('')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [birthSaved, setBirthSaved] = useState(false)
  // Once a birth is on record, the form collapses to a one-line summary; tapping
  // it re-expands for edits. First-time users (no record yet) see the full form.
  const [hasSavedBirth, setHasSavedBirth] = useState(false)
  const [editingBirth, setEditingBirth] = useState(false)

  /** The canonical solar YYYY-MM-DD derived from `dateInput` + `calendar`.
   *  Null when the input is incomplete or an invalid lunar date (e.g. 农历
   *  2月30 in a 短月 year). Drives the Save button's enabled state. */
  const computedSolarDate = useMemo<string | null>(() => {
    if (!isValidBirthDate(dateInput)) return null
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
  }, [dateInput, calendar])
  const birthValid = computedSolarDate !== null

  const birthSummary = useMemo(() => {
    // When the user entered their birthday as 农历, show that form in the
    // summary so what they see matches what they typed — the solar conversion
    // is an internal detail. The 时辰 / gender / city pieces are unchanged.
    const dateLabel =
      birth.calendar === 'lunar' && birth.lunarInput
        ? `${birth.lunarInput} (${t.birthCalendarLunar})`
        : birth.solarDate
    const parts: string[] = [dateLabel]
    parts.push(
      birth.timeIndex === null ? t.birthShichenUnknown : `${SHICHEN_BRANCHES[birth.timeIndex]}时`
    )
    if (birth.gender === '男') parts.push(t.birthGenderMale)
    else if (birth.gender === '女') parts.push(t.birthGenderFemale)
    const city = birth.city?.trim()
    if (city) parts.push(city)
    return parts.join(' · ')
  }, [birth, t])

  useEffect(() => {
    getAuspiceBirthInfo()
      .then((info) => {
        if (info) {
          setBirth(info)
          setHasSavedBirth(true)
          const isLunar = info.calendar === 'lunar' && !!info.lunarInput
          setCalendar(isLunar ? 'lunar' : 'solar')
          setDateInput(isLunar ? (info.lunarInput ?? '') : info.solarDate)
        }
      })
      .catch(() => {})
  }, [])

  const saveBirth = () => {
    if (!birthValid || !computedSolarDate) return
    const updated: AuspiceBirthInfo = {
      ...birth,
      solarDate: computedSolarDate,
      calendar,
      lunarInput: calendar === 'lunar' ? dateInput : undefined,
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
      await disableDailyPush()
      setPushOn(false)
    }
  }
  useEffect(() => {
    isPushEnabled()
      .then(setPushOn)
      .catch(() => {})
  }, [])

  // 节假日 / 调休 heads-up toggle (opt-in; same enable/disable shape as daily push).
  const [holidayOn, setHolidayOn] = useState(false)
  const toggleHoliday = async (next: boolean) => {
    if (next) {
      setHolidayOn(await enableHolidayHeadsUp(locale))
    } else {
      await disableHolidayHeadsUp()
      setHolidayOn(false)
    }
  }
  useEffect(() => {
    isHolidayHeadsUpEnabled()
      .then(setHolidayOn)
      .catch(() => {})
  }, [])

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}>
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
              {/* Calendar toggle — Solar / Lunar (农历). Storage stays solar;
                  农历 inputs convert via @zhop/astro-core `lunarToSolar` on
                  save. Many Chinese users (esp. older generations + diaspora)
                  know their birthday only as a 农历 date — making them
                  pre-convert is friction. Years 1900-2100 supported. */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                  {t.birthDateLabel}
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(
                    [
                      ['solar', t.birthCalendarSolar],
                      ['lunar', t.birthCalendarLunar],
                    ] as const
                  ).map(([key, label]) => {
                    const selected = calendar === key
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setCalendar(key)}
                        accessibilityRole='button'
                        accessibilityState={{ selected }}
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
                            fontSize: 14,
                            fontWeight: selected ? '600' : '400',
                          }}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>
                <TextInput
                  value={dateInput}
                  onChangeText={(raw) => setDateInput(formatDateInput(raw))}
                  placeholder={t.personal.birthDatePlaceholder}
                  placeholderTextColor={colors.dim}
                  autoCapitalize='none'
                  keyboardType='numeric'
                  maxLength={10}
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    borderBottomWidth: 0.5,
                    borderBottomColor: colors.separator,
                    paddingVertical: spacing.sm,
                  }}
                />
                {calendar === 'lunar' ? (
                  <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
                    {t.birthCalendarLunarHint}
                  </Text>
                ) : null}
              </View>

              {/* Shichen — 12-cell grid + "unknown" Pressable. */}
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
                <ShichenPicker
                  value={birth.timeIndex}
                  onChange={(idx: ShichenIndex) =>
                    setBirth((prev) => ({ ...prev, timeIndex: idx }))
                  }
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

              {/* City — geocode-backed picker (resolves coords + IANA timezone).
                  Kept OPTIONAL deliberately: forcing a city would block users
                  who don't know their birth city (adopted, refugee, casual).
                  But the why-it-matters hint underneath surfaces the accuracy
                  cost so users can make an informed choice — 真太阳时 (TST)
                  correction is where city earns its keep, and that mostly
                  matters for 时柱 / 日柱-near-23:00 cases far from the standard
                  meridian. (2026-06 follow-up after For-you accuracy audit.) */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                  {t.birthCityLabel}
                </Text>
                <CityPicker
                  value={
                    birth.city
                      ? {
                          name: birth.city,
                          country: '',
                          lat: birth.lat ?? 0,
                          lng: birth.lng ?? 0,
                          timezone: birth.timezone ?? null,
                        }
                      : null
                  }
                  onSelect={(city) =>
                    setBirth((prev) => ({
                      ...prev,
                      city: city.name,
                      lat: city.lat,
                      lng: city.lng,
                      timezone: city.timezone ?? null,
                    }))
                  }
                  search={searchCity}
                  topCities={DEFAULT_TOP_CITIES}
                  placeholder={t.birthCityPlaceholder}
                />
                <Text
                  style={{
                    color: colors.dim,
                    fontSize: 12,
                    lineHeight: 18,
                    marginTop: 2,
                  }}
                >
                  {t.birthCityHint}
                </Text>
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

        {/* ── Language (DEV-only) ── */}
        {__DEV__ ? (
          <View>
            <SectionLabel>{`${t.language} · DEV`}</SectionLabel>
            <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
              {LOCALES.map((l, i) => (
                <Pressable
                  key={l.key}
                  onPress={() => setLocale(l.key)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.md,
                    paddingHorizontal: spacing.lg,
                    borderTopWidth: i === 0 ? 0 : 0.5,
                    borderTopColor: colors.separator,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 16 }}>{l.label}</Text>
                  {locale === l.key ? (
                    <Text style={{ color: colors.accent, fontSize: 16 }}>✓</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── 主题色 — global accent variant (朱泥 default + 3 alts). Lives here
            because watch face + widget have their own brand-anchored palettes
            and don't honor the app accent — the picker would be misleading on
            the /display screen. ── */}
        <View>
          <SectionLabel>{t.themeAccent}</SectionLabel>
          <AccentPicker />
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

        {/* ── Daily push ── */}
        <View>
          <SectionLabel>{t.dailyPush}</SectionLabel>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: colors.card,
              borderRadius: 14,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.lg,
            }}
          >
            <Text style={{ color: colors.text, fontSize: 16 }}>{t.dailyPush}</Text>
            <Switch
              value={pushOn}
              onValueChange={togglePush}
              trackColor={{ true: colors.accent }}
            />
          </View>
        </View>

        {/* ── 节假日 / 调休 heads-up (CN) ── */}
        <View>
          <SectionLabel>{t.holidayHeadsUp}</SectionLabel>
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
              <Text style={{ color: colors.text, fontSize: 16 }}>{t.holidayHeadsUp}</Text>
              <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                {t.holidayHeadsUpHint}
              </Text>
            </View>
            <Switch
              value={holidayOn}
              onValueChange={toggleHoliday}
              trackColor={{ true: colors.accent }}
            />
          </View>
        </View>

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
          {/* Pro 对你而言 calendar — per-day verdict synced to the system Calendar. */}
          <Pressable
            onPress={() => {
              if (!isPro) {
                setCalPaywallOpen(true)
                return
              }
              if (!birthValid) {
                setEditingBirth(true)
                return
              }
              void openPersonalCalendarSubscribe(birth.solarDate)
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
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
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
            onPress={() => Linking.openURL(TERMS_URL).catch(() => {})}
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
      </ScrollView>
    </SafeAreaView>
  )
}
