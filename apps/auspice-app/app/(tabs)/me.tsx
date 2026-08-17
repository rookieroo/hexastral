/**
 * Me — Settings / profile. Free 黄历 is anonymous-first; birth can be saved
 * locally without sign-in. Sign-in unlocks account sync + personalized push;
 * Pro unlocks deep reasons (paywall elsewhere).
 */

import { resolveBirthHour, solarToLunar } from '@zhop/astro-core'
import {
  BirthClockField,
  BirthDateField,
  type BirthDateFieldValue,
  type BirthTimeMode,
  BirthTimeModeToggle,
  birthDateFieldLabelsForLocale,
  birthTimeModeFromClock,
  CityPicker,
  type CityRecord,
  clearedPreciseBirthFields,
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
  type BirthSyncPreferences,
  type DevEntitlementOverride,
  getDevEntitlementOverride,
  hasEntitlement,
  setDevEntitlementOverride,
  useEntitlements,
} from '@zhop/satellite-runtime'
import { type Href, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuspicePaywallSheet } from '@/components/AuspicePaywallSheet'
import { AuspiceSignInSheet } from '@/components/AuspiceSignInSheet'
import { FlagshipUpsellInsert } from '@/components/FlagshipUpsellInsert'
import { LegalSection } from '@/components/settings/LegalSection'
import { LibrarySection } from '@/components/settings/LibrarySection'
import {
  NotificationsSection,
  type NotificationToggleItem,
} from '@/components/settings/NotificationsSection'
import { SettingsCard, SettingsRow, SettingsSection } from '@/components/settings/SettingsSection'
import { requestYuunWidgetSync } from '@/hooks/useYuunWidgetSync'
import { fetchAccountProfile, isSignedIn, signOut, type YuunAccountProfile } from '@/lib/account'
import { deleteYuunAccount } from '@/lib/account-delete'
import { clearAuspiceGetCache } from '@/lib/api'
import { type AuspiceBirthInfo, getAuspiceBirthInfo, setAuspiceBirthInfo } from '@/lib/birth'
import {
  birthConflictPromptKey,
  pushLocalBirthToAccount,
  reconcileYuunBirthWithAccount,
  resolveBirthConflict,
  setYuunMultiDeviceSync,
} from '@/lib/birth-account-sync'
import { auspiceBirthCopy } from '@/lib/birthInfoCopy'
import { openCalendarSubscribe, openPersonalCalendarSubscribe } from '@/lib/calendar-feed'
import { searchCity } from '@/lib/geocode'
import { type Locale, resolveLocale } from '@/lib/i18n'
import { useStrings } from '@/lib/i18n-context'
import { isIapEnabled } from '@/lib/iap-enabled'
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
  refreshDailyPush,
  setEveningPushEnabled,
  syncServerPush,
} from '@/lib/push'
import { pushTypeById } from '@/lib/pushRegistry'
import { devFireDailyPush } from '@/lib/serverPush'
import { isServerPushActive } from '@/lib/serverPushFlag'
import { TWELVE_SHICHEN } from '@/lib/shichen-content'
import { useAlmanacTheme } from '@/lib/almanac-theme-context'
import { useVoiceMode } from '@/lib/voice-mode-context'

const LOCALES: { key: Locale; label: string }[] = [
  { key: 'zh-Hans', label: '简体中文' },
  { key: 'zh-Hant', label: '繁體中文' },
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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
 * en falls back to a numeric Chinese-calendar M/D since the 农历 month/day glyphs are
 * opaque to a non-CJK reader. Derived from the canonical solar date — the
 * conversion round-trips correctly, so 闰月 birthdays render with the 闰 prefix.
 */
function lunarBirthLabel(solarDate: string, locale: string): string | null {
  const [y, mo, d] = solarDate.split('-').map(Number)
  if (!y || !mo || !d) return null
  try {
    const l = solarToLunar(y, mo, d)
    if (locale === 'en') {
      return l.isLeap
        ? `Chinese calendar (leap) ${l.month}/${l.day}`
        : `Chinese calendar ${l.month}/${l.day}`
    }
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

export default function MeScreen() {
  const { colors, spacing } = useTheme()
  const { t, locale, setLocale, followSystem, isOverridden } = useStrings()
  const { classical, setMode: setVoiceMode } = useVoiceMode()
  const { theme: almanacTheme, setTheme: setAlmanacTheme } = useAlmanacTheme()
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
  const [pushDevStatus, setPushDevStatus] = useState('…')
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
  // 时辰 vs exact clock+city — mutually exclusive. Precise fields are cleared
  // when switching back to shichen so the engine cannot keep a stale clock.
  const [timeMode, setTimeMode] = useState<BirthTimeMode>('shichen')
  const [signedIn, setSignedIn] = useState(false)
  const [accountInfo, setAccountInfo] = useState<YuunAccountProfile | null>(null)
  const [signInForBirthOpen, setSignInForBirthOpen] = useState(false)
  const [birthSaving, setBirthSaving] = useState(false)
  const [multiDeviceOn, setMultiDeviceOn] = useState(true)
  const [syncGated, setSyncGated] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [, setSyncMeta] = useState<BirthSyncPreferences | null>(null)

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
  const switchTimeMode = (next: BirthTimeMode) => {
    setTimeMode(next)
    if (next === 'shichen') {
      setBirth((prev) => ({ ...prev, ...clearedPreciseBirthFields() }))
    }
  }
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
    void isSignedIn()
      .then(setSignedIn)
      .catch(() => setSignedIn(false))
  }, [])

  // Account section: email / linked provider + sign-out (local only).
  useEffect(() => {
    if (!signedIn) return
    void fetchAccountProfile()
      .then(setAccountInfo)
      .catch(() => setAccountInfo(null))
  }, [signedIn])

  const runSignOut = () => {
    // Best-effort local invalidation; birth + 亲友 stay on-device.
    void signOut()
      .catch((err) => console.warn('[yuun.me] sign-out failed', err))
      .finally(() => {
        setSignedIn(false)
        setAccountInfo(null)
      })
  }

  const confirmSignOut = () => {
    Alert.alert(t.signOutConsent.title, t.signOutConsent.body, [
      { text: t.signOutConsent.cancel, style: 'cancel' },
      { text: t.signOutConsent.confirm, style: 'destructive', onPress: runSignOut },
    ])
  }

  const applyBirthToForm = (info: AuspiceBirthInfo) => {
    setBirth(info)
    setHasSavedBirth(true)
    setTimeMode(birthTimeModeFromClock(info.clockMinutes))
    const isLunar = info.calendar === 'lunar' && !!info.lunarInput
    setDateField({
      input: isLunar && info.lunarInput ? info.lunarInput : info.solarDate,
      calendar: isLunar ? 'lunar' : 'solar',
      isLeap: isLunar && info.lunarIsLeap === true,
      solarDate: info.solarDate || null,
    })
  }

  const conflictPromptedKeyRef = useRef<string | null>(null)

  const finishConflictChoice = async (
    choice: 'use_account' | 'use_local',
    conflict: Parameters<typeof resolveBirthConflict>[1]
  ) => {
    try {
      const info = await resolveBirthConflict(choice, conflict)
      applyBirthToForm(info)
      clearAuspiceGetCache()
      requestYuunWidgetSync(locale, true)
      if (choice === 'use_local') {
        void isPushEnabled().then((on) => {
          if (on) void syncServerPush(locale).catch(() => {})
        })
      }
      const again = await reconcileYuunBirthWithAccount()
      if (again.kind === 'applied') {
        applyBirthToForm(again.info)
        setSyncMeta(again.sync)
        setMultiDeviceOn(again.sync.multiDeviceSyncEnabled)
        setSyncGated(false)
        conflictPromptedKeyRef.current = null
        return
      }
      if (again.kind === 'conflict') {
        Alert.alert(t.birthSaveFailed)
        return
      }
      conflictPromptedKeyRef.current = null
    } catch {
      Alert.alert(t.birthSaveFailed)
    }
  }

  const runBirthReconcile = async () => {
    const result = await reconcileYuunBirthWithAccount()
    if (result.kind === 'applied') {
      applyBirthToForm(result.info)
      setSyncMeta(result.sync)
      setMultiDeviceOn(result.sync.multiDeviceSyncEnabled)
      setSyncGated(false)
      clearAuspiceGetCache()
      requestYuunWidgetSync(locale, true)
      conflictPromptedKeyRef.current = null
    } else if (result.kind === 'conflict') {
      setSyncMeta(result.sync)
      setMultiDeviceOn(result.sync.multiDeviceSyncEnabled)
      const key = birthConflictPromptKey(result.conflict)
      if (conflictPromptedKeyRef.current === key) return
      conflictPromptedKeyRef.current = key
      Alert.alert(t.birthConflictTitle, t.birthConflictBody, [
        {
          text: t.birthConflictUseAccount,
          onPress: () => {
            void finishConflictChoice('use_account', result.conflict)
          },
        },
        {
          text: t.birthConflictUseLocal,
          style: 'destructive',
          onPress: () => {
            void finishConflictChoice('use_local', result.conflict)
          },
        },
        { text: t.birthConflictLater, style: 'cancel' },
      ])
    } else if (result.kind === 'gated') {
      setSyncGated(true)
      setSyncMeta(result.sync)
      setMultiDeviceOn(false)
    } else if (result.kind === 'empty' || result.kind === 'guest') {
      setSyncGated(false)
    }
  }

  useEffect(() => {
    getAuspiceBirthInfo()
      .then((info) => {
        if (!info) return
        applyBirthToForm(info)
      })
      .catch(() => {})
    void isSignedIn().then((ok) => {
      setSignedIn(ok)
      if (ok) void runBirthReconcile()
    })
    if (__DEV__) {
      void Promise.all([isPushEnabled(), isServerPushActive()]).then(([enabled, server]) => {
        setPushDevStatus(
          `daily=${enabled ? 'on' : 'off'} · server=${server ? 'active' : 'inactive'} · tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}`
        )
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only reconcile
  }, [])

  const persistBirthLocal = async (updated: AuspiceBirthInfo) => {
    setBirthSaving(true)
    try {
      await setAuspiceBirthInfo(updated)
      setBirth(updated)
      setBirthSaved(true)
      setHasSavedBirth(true)
      setEditingBirth(false)
      setTimeout(() => setBirthSaved(false), 2000)
      clearAuspiceGetCache()
      requestYuunWidgetSync(locale, true)
      void isPushEnabled().then((on) => {
        if (on) void syncServerPush(locale).catch(() => {})
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (__DEV__) console.warn('[yuun] local birth save failed', msg)
      Alert.alert(t.birthSaveFailed, __DEV__ ? msg : undefined)
    } finally {
      setBirthSaving(false)
    }
  }

  const persistBirthAfterAuth = async (updated: AuspiceBirthInfo) => {
    setBirthSaving(true)
    try {
      await pushLocalBirthToAccount(updated)
      setBirth(updated)
      setBirthSaved(true)
      setHasSavedBirth(true)
      setEditingBirth(false)
      setTimeout(() => setBirthSaved(false), 2000)
      clearAuspiceGetCache()
      requestYuunWidgetSync(locale, true)
      void isPushEnabled().then((on) => {
        if (on) void syncServerPush(locale).catch(() => {})
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (__DEV__) console.warn('[yuun] birth save failed', msg)
      if (msg.includes('BIRTH_EDIT_QUOTA_EXHAUSTED')) {
        Alert.alert(t.birthSaveQuotaExhausted)
      } else if (msg.includes('deviceSecret') || msg.includes('requires authenticated user')) {
        Alert.alert(t.birthSaveSessionExpired)
        setSignInForBirthOpen(true)
      } else {
        Alert.alert(t.birthSaveFailed, __DEV__ ? msg : undefined)
      }
    } finally {
      setBirthSaving(false)
    }
  }

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
    void (async () => {
      const ok = await isSignedIn()
      if (!ok) {
        // Tier 1: local preview without account. Offer sync after save.
        await persistBirthLocal(updated)
        Alert.alert(t.birthLocalSavedTitle, t.birthLocalSavedBody, [
          { text: t.birthLocalSavedLater, style: 'cancel' },
          {
            text: t.signInForBirthTitle,
            onPress: () => setSignInForBirthOpen(true),
          },
        ])
        return
      }
      await persistBirthAfterAuth(updated)
    })()
  }

  const beginEditBirth = () => {
    setEditingBirth(true)
  }

  const toggleMultiDevice = (next: boolean) => {
    setMultiDeviceOn(next)
    void (async () => {
      try {
        const sync = await setYuunMultiDeviceSync(next)
        setSyncMeta(sync)
        setSyncGated(false)
        if (next) void runBirthReconcile()
      } catch {
        setMultiDeviceOn(!next)
        Alert.alert(t.birthSaveFailed)
      }
    })()
  }

  const confirmDeleteAccount = () => {
    Alert.alert(t.deleteAccountConfirmTitle, t.deleteAccountConfirmBody, [
      { text: t.deleteAccountCancel, style: 'cancel' },
      {
        text: t.deleteAccountConfirmCta,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setDeletingAccount(true)
            try {
              const ok = await deleteYuunAccount(locale)
              if (!ok) {
                Alert.alert(t.deleteAccountFailed)
                return
              }
              setSignedIn(false)
              setHasSavedBirth(false)
              setBirth({ solarDate: '', timeIndex: null })
              setEditingBirth(false)
              setSyncMeta(null)
              setSyncGated(false)
            } catch {
              Alert.alert(t.deleteAccountFailed)
            } finally {
              setDeletingAccount(false)
            }
          })()
        },
      },
    ])
  }

  // Push toggles — flip UI immediately; persist/schedule in the background and
  // revert only on failure. Pro gates open the paywall sync (no await first).
  const togglePush = (next: boolean) => {
    setPushOn(next)
    void (async () => {
      if (next) {
        const ok = await enableDailyPush({
          locale,
          birthDate: birthValid ? birth.solarDate : undefined,
        })
        if (!ok) setPushOn(false)
      } else {
        try {
          await disableDailyPush(locale)
        } catch {
          setPushOn(true)
        }
      }
    })()
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
  const toggleEvening = (next: boolean) => {
    setEveningOn(next)
    void setEveningPushEnabled(next, {
      locale,
      birthDate: birthValid ? birth.solarDate : undefined,
    }).catch(() => setEveningOn(!next))
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
  // Reads birth from storage (not the form draft) so a DEV Pro flip + toggle works
  // even when the Me form hasn't been re-saved this session.
  const [timelineRemindOn, setTimelineRemindOn] = useState(false)
  const toggleTimelineRemind = (next: boolean) => {
    if (!next) {
      setTimelineRemindOn(false)
      void disableTimelineReminders(locale).catch(() => setTimelineRemindOn(true))
      return
    }
    if (!isPro) {
      setCalPaywallOpen(true)
      return
    }
    void (async () => {
      const info = (await getAuspiceBirthInfo().catch(() => null)) ?? birth
      if (!info.solarDate || !DATE_RE.test(info.solarDate) || !info.gender) {
        setEditingBirth(true)
        Alert.alert(t.timelineRemindToggle, t.timelineRemindNeedBirth)
        return
      }
      setTimelineRemindOn(true)
      try {
        const ok = await enableTimelineReminders({
          locale,
          birthDate: info.solarDate,
          birthHour:
            info.timeIndex === null || info.timeIndex === undefined ? -1 : info.timeIndex * 2,
          gender: info.gender === '男' ? 'M' : 'F',
        })
        if (!ok) {
          setTimelineRemindOn(false)
          Alert.alert(t.timelineRemindToggle, t.timelineRemindNeedPush)
        }
      } catch {
        setTimelineRemindOn(false)
      }
    })()
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
  const pushToggles: NotificationToggleItem[] = [
    { id: 'daily', label: t.dailyPush, value: pushOn, onToggle: togglePush, showPro: false },
    ...(pushOn
      ? [
          {
            id: 'evening' as const,
            label: t.eveningPush,
            hint: t.eveningPushHint,
            value: eveningOn,
            onToggle: toggleEvening,
            showPro: false,
          },
        ]
      : []),
    ...(isIapEnabled()
      ? [
          {
            id: 'timeline' as const,
            label: t.timelineRemindToggle,
            hint: t.timelineRemindHint,
            value: timelineRemindOn,
            onToggle: toggleTimelineRemind,
            showPro: pushTypeById('timeline')?.tier === 'pro' && !isPro,
          },
        ]
      : []),
  ]

  /** 「黄历模式」 — 四语：zh 切原文语体（宜忌/判词/择日/推送全部文言）；
   *  en/ja 切白话黄历布局（首页/大组件变黄历，文言仍 zh-only）。
   *   原文注册表；同时刷新 widget 与服务器推送注册（推送按订阅者语体渲染）。 */
  const toggleVoiceMode = (on: boolean) => {
    void setVoiceMode(on ? 'classical' : 'contemporary').then(() => {
      requestYuunWidgetSync(locale, true)
      void syncServerPush(locale).catch(() => {})
    })
  }

  // Android ships home widgets only — relabel the widget surface entry accordingly.
  const widgetsTitle = Platform.OS === 'android' ? t.widgetsAndroidTitle : t.watchWidgets

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: spacing.xl, gap: spacing.xl }}
        keyboardShouldPersistTaps='handled'
        automaticallyAdjustKeyboardInsets
      >
        {/* Screen title */}
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '600' }}>{t.settings}</Text>

        {/* ── Birth info (single-page form) ── */}
        <View>
          <SectionLabel>{t.personal.forYou}</SectionLabel>
          {hasSavedBirth && !editingBirth ? (
            <Pressable
              onPress={beginEditBirth}
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

              {/* Time mode: 时辰 XOR exact clock + city. */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                  {t.birthShichenLabel}
                </Text>
                <BirthTimeModeToggle
                  value={timeMode}
                  onChange={switchTimeMode}
                  accent={colors.accent}
                  labels={{
                    shichen: preciseCopy.modeShichen,
                    precise: preciseCopy.modePrecise,
                  }}
                />
              </View>

              {timeMode === 'shichen' ? (
                <View style={{ gap: spacing.sm }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: colors.dim, fontSize: 11, letterSpacing: 2 }}>
                      {preciseCopy.modeShichen}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setBirth((prev) => ({
                          ...prev,
                          ...clearedPreciseBirthFields(),
                          timeIndex: null,
                        }))
                      }
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
                      setBirth((prev) => ({
                        ...prev,
                        ...clearedPreciseBirthFields(),
                        timeIndex: idx,
                      }))
                    }
                    accent={colors.accent}
                    labels={shichenFieldLabelsForLocale(locale)}
                    locale={locale}
                  />
                </View>
              ) : (
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
              )}

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

              {/* Save — disabled until date is valid. "Saved" feedback briefly. */}
              <Pressable
                onPress={saveBirth}
                disabled={!birthValid || birthSaving}
                accessibilityRole='button'
                accessibilityLabel={t.birthSave}
                style={{
                  marginTop: spacing.sm,
                  alignSelf: 'stretch',
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: birthValid ? colors.accent : colors.accentGhost,
                  alignItems: 'center',
                  opacity: birthSaving ? 0.7 : 1,
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
                  {birthSaving ? t.birthSaving : birthSaved ? t.birthSaved : t.birthSave}
                </Text>
              </Pressable>
              <Text style={{ color: colors.dim, fontSize: 12 }}>{t.personal.birthHint}</Text>
            </View>
          )}
          {signedIn ? (
            <View
              style={{
                marginTop: spacing.md,
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                gap: spacing.sm,
              }}
            >
              {syncGated ? (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
                    {t.birthSyncGatedMultiDevice}
                  </Text>
                  <Pressable
                    onPress={() => toggleMultiDevice(true)}
                    accessibilityRole='button'
                    accessibilityLabel={t.birthSyncEnableMultiDevice}
                  >
                    <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
                      {t.birthSyncEnableMultiDevice}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: colors.text, fontSize: 15 }}>
                      {t.birthMultiDeviceSync}
                    </Text>
                    <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                      {t.birthMultiDeviceSyncHint}
                    </Text>
                  </View>
                  <Toggle
                    value={multiDeviceOn}
                    onValueChange={toggleMultiDevice}
                    accent={colors.accent}
                  />
                </View>
              )}
            </View>
          ) : hasSavedBirth ? (
            <View
              style={{
                marginTop: spacing.md,
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                gap: spacing.sm,
              }}
            >
              <Text style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
                {t.signInForBirthBenefit}
              </Text>
              <Pressable
                onPress={() => setSignInForBirthOpen(true)}
                accessibilityRole='button'
                accessibilityLabel={t.signInForBirthTitle}
              >
                <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
                  {t.signInForBirthTitle}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <LibrarySection />

        <View>
          <SectionLabel>{widgetsTitle}</SectionLabel>
          <View style={{ borderRadius: 14, backgroundColor: colors.card, overflow: 'hidden' }}>
            <Pressable
              onPress={() => router.push('/display' as Href)}
              accessibilityRole='button'
              accessibilityLabel={widgetsTitle}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.text, fontSize: 15 }}>{widgetsTitle}</Text>
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </Pressable>
          </View>
        </View>

        <NotificationsSection rows={pushToggles} />

        {/* 黄历模式 — 四语开关（zh 原文 / ja·en 白话黄历布局，文言仍 zh-only）。 */}
        {
          <View>
            <SectionLabel>{t.voiceModeTitle}</SectionLabel>
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 14,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>{t.voiceModeName}</Text>
                  <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                    {t.voiceModeHint}
                  </Text>
                </View>
                <Toggle value={classical} onValueChange={toggleVoiceMode} accent={colors.accent} />
              </View>
              {classical ? (
                <View
                  style={{
                    marginTop: spacing.sm,
                    paddingTop: spacing.sm,
                    borderTopWidth: 0.5,
                    borderTopColor: colors.separator,
                    gap: spacing.sm,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 15 }}>{t.almanacThemeTitle}</Text>
                  <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                    {(
                      [
                        { id: 'classic' as const, label: t.almanacThemeClassic },
                        { id: 'contrast' as const, label: t.almanacThemeContrast },
                      ] as const
                    ).map((opt) => {
                      const selected = almanacTheme === opt.id
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => {
                            void setAlmanacTheme(opt.id)
                          }}
                          accessibilityRole='button'
                          accessibilityState={{ selected }}
                          accessibilityLabel={opt.label}
                          style={({ pressed }) => ({
                            flex: 1,
                            paddingVertical: 10,
                            alignItems: 'center',
                            borderWidth: 0.5,
                            borderRadius: 0,
                            borderColor: selected ? colors.accent : colors.separator,
                            backgroundColor: selected ? colors.accentGhost : 'transparent',
                            opacity: pressed ? 0.7 : 1,
                          })}
                        >
                          <Text
                            style={{
                              color: selected ? colors.accent : colors.text,
                              fontSize: 14,
                              fontWeight: selected ? '600' : '400',
                            }}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        }

        {/* ── Calendars & sync ── */}
        <View>
          <SectionLabel>{t.settingsCalendars}</SectionLabel>
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
                borderBottomWidth: 0.5,
                borderBottomColor: colors.separator,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ color: colors.text, fontSize: 15 }}>{t.remoteTzSection}</Text>
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </Pressable>
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
          {/* Pro 对你而言 calendar — a GENUINELY personal feed: the day overlaid
              with YOUR 用神/忌神/六冲, leading with where it DIVERGES from the
              universal 黄历 (that divergence is the 专属 value).
              Hidden while IAP is off — a Pro-only row must not end in a dead wall. */}
          {isIapEnabled() ? (
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
                    <Text style={{ color: colors.accent, fontSize: 9, fontWeight: '700' }}>
                      PRO
                    </Text>
                  ) : null}
                </View>
                <Text style={{ color: colors.dim, fontSize: 12, lineHeight: 17 }}>
                  {t.personalCalendarHint}
                </Text>
              </View>
              <ChevronRightIcon size={16} color={colors.dim} strokeWidth={1.4} />
            </Pressable>
          ) : null}
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

        {signedIn ? (
          <SettingsSection title={t.accountSection}>
            <SettingsCard>
              <SettingsRow
                label={t.signedInAs}
                hint={
                  accountInfo?.email ??
                  accountInfo?.name ??
                  (accountInfo?.apple ? 'Apple' : accountInfo?.google ? 'Google' : null) ??
                  undefined
                }
                onPress={() => {}}
                divider
                disabled
              />
              <SettingsRow label={t.signOut} onPress={confirmSignOut} divider />
              {isIapEnabled() ? (
                <SettingsRow
                  label={t.manageSubscription}
                  onPress={() => {
                    void Linking.openURL(
                      Platform.OS === 'android'
                        ? 'https://play.google.com/store/account/subscriptions'
                        : 'https://apps.apple.com/account/subscriptions'
                    )
                  }}
                  divider
                />
              ) : null}
              <SettingsRow
                label={deletingAccount ? t.deleteAccountWorking : t.deleteAccount}
                danger
                disabled={deletingAccount}
                onPress={confirmDeleteAccount}
              />
            </SettingsCard>
          </SettingsSection>
        ) : null}

        <LegalSection />

        <AuspiceSignInSheet
          visible={signInForBirthOpen}
          onClose={() => setSignInForBirthOpen(false)}
          onSignedIn={() => {
            setSignInForBirthOpen(false)
            setSignedIn(true)
            void (async () => {
              await runBirthReconcile()
              // If the user was mid-save, persist the draft now that auth exists.
              if (birthValid && computedSolarDate && (editingBirth || !hasSavedBirth)) {
                const isLunar = dateField.calendar === 'lunar'
                const updated: AuspiceBirthInfo = {
                  ...birth,
                  solarDate: computedSolarDate,
                  calendar: dateField.calendar,
                  lunarInput: isLunar ? dateField.input : undefined,
                  lunarIsLeap: isLunar ? dateField.isLeap : undefined,
                }
                await persistBirthAfterAuth(updated)
              } else {
                setEditingBirth(true)
              }
            })()
          }}
        />

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
                the en 语料钩子 when birth info is set + the /day API serves `dailyHook`.
                Also re-register server push and dump local/server delivery flags. */}
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
                    const fired = await devFireDailyPush()
                    if (!fired.sent) {
                      Alert.alert(
                        '真实推送未发出',
                        `原因：${fired.reason ?? 'unknown'}\n\n（设备需已注册服务器推送；若为模拟器/未授权，走本地兜底。）`
                      )
                      return
                    }
                    Alert.alert(
                      '真实每日推送已发送',
                      `${fired.title ?? ''}\n\n${fired.body ?? ''}\n\n这是服务器 renderAuspicePush 的真实文案（与明早 8 点定时推送同一链路），通知应已到达。`
                    )
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
              <View style={{ height: 0.5, backgroundColor: colors.separator }} />
              <Pressable
                onPress={async () => {
                  try {
                    await syncServerPush(locale)
                    const [enabled, server] = await Promise.all([
                      isPushEnabled(),
                      isServerPushActive(),
                    ])
                    const line = `daily=${enabled ? 'on' : 'off'} · server=${server ? 'active' : 'inactive'} · tz=${Intl.DateTimeFormat().resolvedOptions().timeZone}`
                    setPushDevStatus(line)
                    Alert.alert('Server push re-synced', line)
                  } catch (e) {
                    Alert.alert('Server sync failed', String(e))
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
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: colors.text, fontSize: 16 }}>Re-sync server push</Text>
                  <Text
                    style={{ color: colors.secondary, fontSize: 12, marginTop: 2 }}
                    numberOfLines={2}
                  >
                    {pushDevStatus}
                  </Text>
                </View>
                <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
                  Sync →
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
