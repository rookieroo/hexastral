/**
 * /people — 亲友生日. Capture name + birthday (solar OR 农历) + 时辰 + gender +
 * birthplace so the reminders fire correctly AND the Pro 合盘 (八字 / 紫微) reading
 * has what it needs later. Reminders: advance (default 1 day, configurable) +
 * day-of (toggle). Tap 关系 for the 生肖 bond — Pro (free users hit the paywall).
 * The user's OWN birth lives in Settings (lib/birth.ts).
 */

import {
  CityPicker,
  type CityRecord,
  DEFAULT_TOP_CITIES,
  isCjkScript,
  ShichenField,
  type ShichenIndex,
  shichenFieldLabelsForLocale,
  shichenInlineLabel,
  shichenRange,
  Toggle,
  useTheme,
} from '@zhop/core-ui'
import { hasEntitlement, useEntitlements } from '@zhop/satellite-runtime'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { RelationshipSheet } from '@/components/RelationshipSheet'
import { deleteBirthdayReminder, saveBirthdayReminder } from '@/lib/api'
import { getAuspiceBirthInfo } from '@/lib/birth'
import { getAuspiceDeviceId } from '@/lib/device'
import { searchCity } from '@/lib/geocode'
import { useStrings } from '@/lib/i18n-context'
import {
  type AuspicePerson,
  addPerson,
  getPeople,
  type PersonCalendar,
  type PersonGender,
  removePerson,
} from '@/lib/people'
import { FREE_BIRTHDAY_LIMIT, requestPushPermission, scheduleBirthdayReminders } from '@/lib/push'
import { animalOf } from '@/lib/relationship'
import { TWELVE_SHICHEN } from '@/lib/shichen-content'

/** 时辰 label for a 亲友 summary. CJK shows 「未时」; Latin scripts show the AM/PM
 *  clock range (am/pm for North America — same shichen-i18n source as the field). */
function shichenSummaryLabel(index: number, locale: string): string {
  const sc = TWELVE_SHICHEN[index]
  if (!sc) return ''
  return isCjkScript(locale)
    ? shichenInlineLabel(index, sc.branch, locale)
    : shichenRange(sc.range, locale)
}
const ADVANCE_OPTIONS = [0, 1, 3, 7] as const
const MD_RE = /^\d{2}-\d{2}$/

/** Auto-format up to 4 digits → MM-DD. */
function formatMonthDay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}-${digits.slice(2)}`
}

export default function PeopleScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale } = useStrings()
  const params = useLocalSearchParams<{ md?: string }>()
  const entitlements = useEntitlements()
  const isPro = hasEntitlement(entitlements, 'auspice_pro')

  const [people, setPeople] = useState<AuspicePerson[]>([])
  const [selfDate, setSelfDate] = useState<string | null>(null)

  // ── add form ──
  const [name, setName] = useState('')
  // Birthday = month-day (drives reminders). Year is optional — only 生肖 / 合盘 need it.
  const initialMd = typeof params.md === 'string' && MD_RE.test(params.md) ? params.md : ''
  const [monthDay, setMonthDay] = useState(initialMd)
  const [birthYear, setBirthYear] = useState('')
  const [calendar, setCalendar] = useState<PersonCalendar>('solar')
  const [timeIndex, setTimeIndex] = useState<ShichenIndex | null>(null)
  const [gender, setGender] = useState<PersonGender | undefined>(undefined)
  const [birthCity, setBirthCity] = useState<CityRecord | null>(null)
  const [advanceDays, setAdvanceDays] = useState(1)
  const [remindOnDay, setRemindOnDay] = useState(true)
  // 时辰 + gender + birthplace are 八字-合盘-only — collapsed by default so the
  // everyday "remind me about Mom's birthday" path stays a 3-field flow.
  const [compatExpanded, setCompatExpanded] = useState(false)

  // City keyboard positioning — the CityPicker pins itself above the keyboard
  // on focus when given the host ScrollView ref.
  const scrollRef = useRef<ScrollView>(null)

  const [paywallOpen, setPaywallOpen] = useState(false)
  const [relPerson, setRelPerson] = useState<AuspicePerson | null>(null)

  useEffect(() => {
    getPeople()
      .then(setPeople)
      .catch(() => {})
    getAuspiceBirthInfo()
      .then((info) => setSelfDate(info?.solarDate ?? null))
      .catch(() => {})
  }, [])

  const canAdd = MD_RE.test(monthDay) && name.trim().length > 0

  const add = async () => {
    if (!canAdd) return
    await requestPushPermission()
    // Sentinel year 0000 when unknown — reminders use month-day; 生肖 stays blank.
    const solarDate = `${/^\d{4}$/.test(birthYear) ? birthYear : '0000'}-${monthDay}`
    const next = await addPerson({
      name,
      solarDate,
      calendar,
      timeIndex,
      gender,
      city: birthCity?.name,
      lat: birthCity?.lat,
      lng: birthCity?.lng,
      timezone: birthCity?.timezone ?? null,
      advanceDays,
      remindOnDay,
    })
    setPeople(next)
    setName('')
    setMonthDay('')
    setBirthYear('')
    setCalendar('solar')
    setTimeIndex(null)
    setGender(undefined)
    setBirthCity(null)
    setAdvanceDays(1)
    setRemindOnDay(true)
    setCompatExpanded(false)
    void scheduleBirthdayReminders(next, locale)
    // The 4th+ birthday REMINDER is a Pro perk — local scheduling already caps to
    // FREE_BIRTHDAY_LIMIT, so nudge the paywall when a free user crosses it (the
    // extra 亲友 is still saved for 合盘 etc., it just won't fire reminders).
    if (!isPro && next.length > FREE_BIRTHDAY_LIMIT) setPaywallOpen(true)
    // Persist the birthday server-side (authoritative cap + a future remote
    // birthday push); best-effort, non-blocking.
    const added = next[next.length - 1]
    if (added) {
      void getAuspiceDeviceId()
        .then((deviceId) =>
          saveBirthdayReminder({
            deviceId,
            id: added.id,
            name: added.name,
            solarDate: added.solarDate,
            calendar: added.calendar ?? 'solar',
            relation: added.relation,
            advanceDays: added.advanceDays,
            remindOnDay: added.remindOnDay,
            isPro,
          })
        )
        .catch(() => {})
    }
  }

  const remove = async (id: string) => {
    const next = await removePerson(id)
    setPeople(next)
    void scheduleBirthdayReminders(next, locale)
    void getAuspiceDeviceId()
      .then((deviceId) => deleteBirthdayReminder(id, deviceId))
      .catch(() => {})
  }

  const openRelation = (p: AuspicePerson) => {
    if (!selfDate) {
      Alert.alert(t.people.needBirth, t.people.needBirthBody)
      return
    }
    if (!isPro) {
      setRelPerson(p)
      setPaywallOpen(true)
      return
    }
    setRelPerson(p)
  }

  const fieldStyle = {
    color: colors.text,
    fontSize: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator,
    paddingVertical: spacing.sm,
  } as const
  const microLabel = { color: colors.dim, fontSize: 11, letterSpacing: 2 } as const

  function personLine(p: AuspicePerson): string {
    const shown = p.solarDate.startsWith('0000-') ? p.solarDate.slice(5) : p.solarDate
    const parts = [`${p.calendar === 'lunar' ? `${t.people.lunar} ` : ''}${shown}`]
    const animal = animalOf(p.solarDate)
    if (animal) parts.push(`属${animal}`)
    if (p.timeIndex != null) parts.push(shichenSummaryLabel(p.timeIndex, locale))
    if (p.city) parts.push(p.city)
    return parts.join(' · ')
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Headerless drill-in (ADR-0018) — iOS edge-swipe-back handles nav. */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        {/* Add form */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: spacing.lg,
            gap: spacing.lg,
          }}
        >
          <Text style={{ color: colors.secondary, fontSize: 11, letterSpacing: 3 }}>
            {t.people.add}
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t.people.namePlaceholder}
            placeholderTextColor={colors.dim}
            style={fieldStyle}
          />

          {/* Calendar toggle — uses the unified birthCalendar* strings (shared
              with the /me birth-info form) so EN reads "Chinese (lunar)"
              consistently, not the ambiguous bare "Lunar". */}
          <Segmented
            options={[
              { key: 'solar', label: t.birthCalendarSolar },
              { key: 'lunar', label: t.birthCalendarLunar },
            ]}
            value={calendar}
            onChange={(k) => setCalendar(k as PersonCalendar)}
            colors={colors}
            spacing={spacing}
          />

          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Text style={microLabel}>{t.people.date}</Text>
              <TextInput
                value={monthDay}
                onChangeText={(r) => setMonthDay(formatMonthDay(r))}
                placeholder='08-12'
                placeholderTextColor={colors.dim}
                keyboardType='numeric'
                maxLength={5}
                style={fieldStyle}
              />
            </View>
            <View style={{ flex: 1, gap: spacing.sm }}>
              {/* 八字-合盘 needs a full solar year, so the field flips to required
                  (accent label + accent underline) whenever the toggle below is
                  ON — replaces the old separate nag paragraph. */}
              <Text style={[microLabel, compatExpanded ? { color: colors.accent } : null]}>
                {compatExpanded ? t.people.yearRequired : t.people.yearOptional}
              </Text>
              <TextInput
                value={birthYear}
                onChangeText={(r) => setBirthYear(r.replace(/\D/g, '').slice(0, 4))}
                placeholder='1995'
                placeholderTextColor={colors.dim}
                keyboardType='numeric'
                maxLength={4}
                style={[
                  fieldStyle,
                  compatExpanded && !/^\d{4}$/.test(birthYear)
                    ? { borderBottomColor: colors.accent }
                    : null,
                ]}
              />
            </View>
          </View>

          {/* Lunar-mode hint — only rendered when the user picked 农历, so the
              date input visibly signals which calendar it's interpreting
              (the MM-DD format doesn't change between solar / lunar, so
              without this the toggle reads as a no-op). */}
          {calendar === 'lunar' ? (
            <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18, marginTop: -4 }}>
              {t.birthCalendarLunarHint}
            </Text>
          ) : null}

          {/* Compatibility (合盘) — a PROMINENT toggle card (was a buried chevron
              disclosure; users couldn't find the unlock). When flipped on:
                · the row tints with the accent + reveals the extra fields below,
                · the year field above flips to REQUIRED (accent label + accent
                  underline) until a 4-digit solar year is filled, and
                · 时辰 / gender / birthplace appear inline (not in a disclosure).
              Off → plain birthday reminder, no 八字 demanded. */}
          <Pressable
            onPress={() => setCompatExpanded((v) => !v)}
            accessibilityRole='switch'
            accessibilityState={{ checked: compatExpanded }}
            accessibilityLabel={t.people.compatibilityToggle}
            style={{
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: compatExpanded ? colors.accent : colors.separator,
              backgroundColor: compatExpanded ? colors.accentGhost : 'transparent',
              padding: spacing.md,
              gap: spacing.sm,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
                  {t.people.compatibilityToggle}
                </Text>
                <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                  {t.people.compatibilityHook}
                </Text>
              </View>
              <Toggle
                value={compatExpanded}
                onValueChange={setCompatExpanded}
                accent={colors.accent}
              />
            </View>

            {compatExpanded ? (
              <View
                style={{
                  gap: spacing.lg,
                  marginTop: spacing.sm,
                  paddingTop: spacing.sm,
                  borderTopWidth: 0.5,
                  borderTopColor: colors.separator,
                }}
              >
                <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 18 }}>
                  {t.people.compatibilityHint}
                </Text>

                {/* 时辰 (for 八字 / 合盘) */}
                <View style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={microLabel}>{t.birthShichenLabel}</Text>
                    <Pressable
                      onPress={() => setTimeIndex(null)}
                      hitSlop={6}
                      accessibilityRole='button'
                      accessibilityLabel={t.birthShichenUnknown}
                    >
                      <Text
                        style={{
                          color: timeIndex === null ? colors.accent : colors.dim,
                          fontSize: 12,
                          fontWeight: timeIndex === null ? '600' : '400',
                        }}
                      >
                        {t.birthShichenUnknown}
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

                {/* Gender */}
                <View style={{ gap: spacing.sm }}>
                  <Text style={microLabel}>{t.birthGenderLabel}</Text>
                  <Segmented
                    options={[
                      { key: '男', label: t.birthGenderMale },
                      { key: '女', label: t.birthGenderFemale },
                    ]}
                    value={gender ?? ''}
                    onChange={(k) => setGender(k as PersonGender)}
                    colors={colors}
                    spacing={spacing}
                  />
                </View>

                {/* Birthplace — optional; geocode-backed (coords + IANA tz for
                    真太阳时 correction in the Kindred 合盘). `scrollRef` lets
                    the picker pin itself above the keyboard on focus. */}
                <View style={{ gap: spacing.sm }}>
                  <Text style={microLabel}>{t.birthCityLabel}</Text>
                  <CityPicker
                    value={birthCity}
                    onSelect={setBirthCity}
                    search={searchCity}
                    topCities={DEFAULT_TOP_CITIES}
                    placeholder={t.birthCityPlaceholder}
                    scrollRef={scrollRef}
                  />
                </View>
              </View>
            ) : null}
          </Pressable>

          {/* Advance reminder + day-of */}
          <View style={{ gap: spacing.sm }}>
            <Text style={microLabel}>{t.people.advance}</Text>
            <Segmented
              options={ADVANCE_OPTIONS.map((n) => ({
                key: String(n),
                label: n === 0 ? t.people.noAdvance : `${n}${t.people.dayUnit}`,
              }))}
              value={String(advanceDays)}
              onChange={(k) => setAdvanceDays(Number(k))}
              colors={colors}
              spacing={spacing}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: spacing.xs,
              }}
            >
              <Text style={{ color: colors.text, fontSize: 14 }}>{t.people.remindOnDay}</Text>
              <Toggle value={remindOnDay} onValueChange={setRemindOnDay} accent={colors.accent} />
            </View>
          </View>

          <Pressable
            onPress={add}
            disabled={!canAdd}
            accessibilityRole='button'
            style={{
              marginTop: spacing.xs,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: canAdd ? colors.accent : colors.accentGhost,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: canAdd ? '#fff' : colors.dim,
                fontSize: 15,
                fontWeight: '600',
                letterSpacing: 1,
              }}
            >
              {t.people.submit}
            </Text>
          </Pressable>
          <Text style={{ color: colors.dim, fontSize: 12 }}>{t.people.reminderHint}</Text>
        </View>

        {/* List */}
        {people.length > 0 ? (
          <View style={{ backgroundColor: colors.card, borderRadius: 14, overflow: 'hidden' }}>
            {people.map((p, i) => (
              <View
                key={p.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  gap: spacing.md,
                  borderTopWidth: i === 0 ? 0 : 0.5,
                  borderTopColor: colors.separator,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>{p.name}</Text>
                  <Text style={{ color: colors.dim, fontSize: 12 }}>{personLine(p)}</Text>
                </View>
                <Pressable
                  onPress={() => openRelation(p)}
                  accessibilityRole='button'
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 3,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                    borderRadius: 14,
                    borderWidth: 0.5,
                    borderColor: colors.accent,
                    backgroundColor: colors.accentGhost,
                  }}
                >
                  <Text style={{ color: colors.accent, fontSize: 12, fontWeight: '600' }}>
                    {t.people.relation}
                  </Text>
                  {!isPro ? (
                    <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>
                      PRO
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable onPress={() => remove(p.id)} hitSlop={8} accessibilityRole='button'>
                  <Text style={{ color: colors.dim, fontSize: 13 }}>{t.people.delete}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <Text style={{ color: colors.dim, fontSize: 13, textAlign: 'center' }}>
            {t.people.empty}
          </Text>
        )}
      </ScrollView>

      <AuspicePaywallSheet visible={paywallOpen} onClose={() => setPaywallOpen(false)} />
      <RelationshipSheet
        visible={!!relPerson && !paywallOpen && isPro}
        onClose={() => setRelPerson(null)}
        selfDate={selfDate}
        person={relPerson}
      />
    </SafeAreaView>
  )
}

/** Inline segmented control — equal-width pills, single select. */
function Segmented({
  options,
  value,
  onChange,
  colors,
  spacing,
}: {
  options: ReadonlyArray<{ key: string; label: string }>
  value: string
  onChange: (key: string) => void
  colors: ReturnType<typeof useTheme>['colors']
  spacing: ReturnType<typeof useTheme>['spacing']
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {options.map((o) => {
        const selected = value === o.key
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
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
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
