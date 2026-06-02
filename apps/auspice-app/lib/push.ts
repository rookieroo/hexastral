/**
 * Auspice daily push (C.5) — 100% deterministic, NO LLM.
 *
 * Auspice is Tier-3 anonymous, so we use **local scheduled notifications** (no push
 * token, no server cron, no account): the app fetches the server-computed
 * deterministic almanac (`/api/auspice/day`, incl. the 对你而言 overlay when a birth
 * date is set) and schedules a rolling window of 8am local notifications. They are
 * rescheduled on each app open so content stays fresh. (A future REMOTE push via
 * svc-notify + Expo tokens is the scale option — not needed for v1.)
 *
 * expo-notifications API mirrors `apps/hexastral-app/lib/ux/pushNotifications.ts`
 * (version ~0.32.16).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { lunarToSolar } from '@zhop/astro-core'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { fetchAuspiceDay } from './api'
import { upcomingHolidayHeadsUps } from './cn-holidays'
import { getStrings, type Locale } from './i18n'
import type { AuspicePerson, PersonCalendar } from './people'
import { getAuspiceProActive } from './pro'
import { localizeYijiVerb } from './yiji-vocab'

const ENABLED_KEY = 'auspice.push.enabled'
/** One-time purge flag — clears notifications scheduled by older id schemes. */
const PURGE_FLAG = 'auspice.push.purgedV2'
/** Stable per-date identifier prefix — makes scheduling idempotent (no dupes). */
const DAILY_ID_PREFIX = 'cycle-daily-'
const PUSH_HOUR = 8
const WINDOW_DAYS = 5

/** Retro-check copy ({event} = the localized event label). */
const RETRO_TEXT: Record<Locale, string> = {
  'zh-Hans': '上次为「{event}」选的吉日，结果如何？点开记一笔。',
  'zh-Hant': '上次為「{event}」選的吉日，結果如何？點開記一筆。',
  ja: '先日選んだ「{event}」の吉日、いかがでしたか？',
  en: 'How did your {event} go? Tap to log it.',
}

interface PushOpts {
  locale: Locale
  birthDate?: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Local calendar date (device tz) for `d`. */
function localYmd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Local 8am `daysAhead` days from now. */
function eightAm(daysAhead: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  d.setHours(PUSH_HOUR, 0, 0, 0)
  return d
}

// ── permission + enable flag ──────────────────────────────────────────────────

export async function requestPushPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const existing = await Notifications.getPermissionsAsync()
  if (existing.status === 'granted') return true
  const req = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  })
  return req.status === 'granted'
}

export async function isPushEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENABLED_KEY)) === '1'
  } catch {
    return false
  }
}

async function setEnabledFlag(on: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, on ? '1' : '0')
  } catch {}
}

/** Foreground display behavior — call once at root. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

// ── daily 8am rolling window ────────────────────────────────────────────────────

/**
 * Cancel every scheduled cycle-daily notification — found by identifier prefix,
 * NOT a stored ID list (which raced rapid locale switches and left stale /
 * duplicate notifications). Robust to any prior state.
 */
async function cancelDaily(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(DAILY_ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
    )
  } catch {}
}

/**
 * Build the notification body from a day payload (deterministic — no LLM).
 * `isPro` gates the 对你而言 verdict line: free users get the generic 宜忌 /
 * 干支 / 节气 body that's pure math from the day itself, never the
 * birth-info-derived personalization that's part of auspice_pro.
 */
function dailyContent(
  locale: Locale,
  t: ReturnType<typeof getStrings>,
  dateStr: string,
  payload: Awaited<ReturnType<typeof fetchAuspiceDay>>,
  isPro: boolean
): { title: string; body: string } {
  const d = payload.day
  // Localize the 宜忌 verbs (were leaking raw CJK under en/ja) + locale separators.
  const sep = locale === 'en' ? ', ' : '、'
  const colon = locale === 'en' ? ': ' : '：'
  const loc = (v: string) => localizeYijiVerb(v, locale)
  const yi = d.goodFor.slice(0, 2).map(loc).join(sep) || '—'
  const ji = d.avoid.slice(0, 2).map(loc).join(sep) || '—'
  let body = `${t.suitable} ${yi} · ${t.avoid} ${ji}`
  if (isPro && payload.personalization) {
    body += ` · ${t.personal.forYou}${colon}${t.personal.fit[payload.personalization.fit]}`
  }
  // Fold the 节气 into the body when this very day is a 节气 (covers C.5.3 lightly).
  if (d.solarTerm.prev.date === dateStr) body += ` · ${d.solarTerm.prev.name}`
  return { title: `${dateStr} · ${d.ganZhi}日`, body }
}

/** (Re)schedule the rolling daily window with fresh deterministic content. */
export async function scheduleDailyAlmanac(opts: PushOpts): Promise<void> {
  await cancelDaily()
  const t = getStrings(opts.locale)
  const now = Date.now()
  // Read entitlement once per reschedule pass. SDK-unconfigured paths (Expo
  // Go, missing key) safely return false → free-tier body.
  const isPro = await getAuspiceProActive()

  for (let i = 0; i < WINDOW_DAYS; i++) {
    const when = eightAm(i)
    if (when.getTime() <= now) continue // skip past 8am (e.g. today, opened after 8)
    const dateStr = localYmd(when)

    let content: { title: string; body: string } = { title: t.appName, body: t.today }
    try {
      content = dailyContent(
        opts.locale,
        t,
        dateStr,
        await fetchAuspiceDay(dateStr, opts.birthDate),
        isPro
      )
    } catch {
      // keep the generic fallback — a push that opens the app is still useful
    }

    try {
      // Stable per-date identifier → idempotent: rescheduling (e.g. on a locale
      // switch) REPLACES the day's notification instead of stacking a duplicate.
      await Notifications.scheduleNotificationAsync({
        identifier: `${DAILY_ID_PREFIX}${dateStr}`,
        content: { ...content, data: { day: dateStr } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
      })
    } catch {}
  }
}

export async function enableDailyPush(opts: PushOpts): Promise<boolean> {
  if (!(await requestPushPermission())) return false
  await setEnabledFlag(true)
  await scheduleDailyAlmanac(opts)
  return true
}

export async function disableDailyPush(): Promise<void> {
  await setEnabledFlag(false)
  await cancelDaily()
}

/** Re-sync the rolling window on app open (no-op unless enabled). */
export async function refreshDailyPush(opts: PushOpts): Promise<void> {
  if (await isPushEnabled()) await scheduleDailyAlmanac(opts)
}

/**
 * One-time cleanup — call ONCE at app open, before any (re)scheduling. Older
 * builds scheduled the daily window under different identifier schemes that the
 * prefix-based `cancelDaily` can't match, so they piled up and fired as duplicate
 * / mixed-locale notifications (2026-06 report). This clears the entire local
 * queue (pending + already-delivered) once; the stable-id scheduling that runs
 * right after keeps things idempotent from here on.
 */
export async function purgeStaleNotificationsOnce(): Promise<void> {
  try {
    if ((await AsyncStorage.getItem(PURGE_FLAG)) === '1') return
    await Notifications.cancelAllScheduledNotificationsAsync()
    await Notifications.dismissAllNotificationsAsync().catch(() => {})
    await AsyncStorage.setItem(PURGE_FLAG, '1')
  } catch {}
}

/**
 * Subscribe to notification taps. The handler receives the notification's `day`
 * (YYYY-MM-DD) so the caller can deep-link Today to that date. Returns an
 * unsubscribe fn; also fires for the launch notification (cold start).
 */
export function addAuspiceNotificationTapListener(
  onOpen: (day: string | null) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const day = response.notification.request.content.data?.day
    onOpen(typeof day === 'string' ? day : null)
  })
  return () => sub.remove()
}

// ── retro-check (C.5.2) ─────────────────────────────────────────────────────────

/** Schedule a single nudge 7 days after a picked 择日 date. */
export async function scheduleRetroCheck(opts: {
  date: string
  eventLabel: string
  locale: Locale
}): Promise<void> {
  if (!(await requestPushPermission())) return
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(opts.date)
  if (!m) return
  const when = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), PUSH_HOUR, 0, 0, 0)
  when.setDate(when.getDate() + 7)
  if (when.getTime() <= Date.now()) return

  const body = RETRO_TEXT[opts.locale].replace('{event}', opts.eventLabel)
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: getStrings(opts.locale).appName, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    })
  } catch {}
}

// ── 亲友 birthday reminders ──────────────────────────────────────────────────

const BDAY_ID_PREFIX = 'cycle-bday-'

const BDAY_TEXT: Record<Locale, { soon: string; tomorrow: string; day: string }> = {
  'zh-Hans': {
    soon: '还有 {n} 天是「{name}」的生日',
    tomorrow: '明天是「{name}」的生日',
    day: '今天是「{name}」的生日，记得送上祝福',
  },
  'zh-Hant': {
    soon: '還有 {n} 天是「{name}」的生日',
    tomorrow: '明天是「{name}」的生日',
    day: '今天是「{name}」的生日，記得送上祝福',
  },
  ja: {
    soon: '「{name}」さんの誕生日まであと {n} 日',
    tomorrow: '明日は「{name}」さんの誕生日',
    day: '今日は「{name}」さんの誕生日です',
  },
  en: {
    soon: "{name}'s birthday is in {n} days",
    tomorrow: "Tomorrow is {name}'s birthday",
    day: "Today is {name}'s birthday",
  },
}

/**
 * Next 8am occurrence of a birthday. Solar → recurs on the same Gregorian MM-DD.
 * 农历 → convert this/next 农历 year's (month, day) to Gregorian via astro-core
 * and pick the first future one (leap-month birthdays fall back to the regular
 * month; astro-core's range is 1900-2100).
 */
function nextBirthdayFor(p: { solarDate: string; calendar?: PersonCalendar }): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.solarDate)
  if (!m) return null
  const now = new Date()
  const mo = Number(m[2])
  const dd = Number(m[3])

  if (p.calendar === 'lunar') {
    for (const y of [now.getFullYear(), now.getFullYear() + 1]) {
      try {
        const s = lunarToSolar(y, mo, dd, false)
        const d = new Date(s.getFullYear(), s.getMonth(), s.getDate(), PUSH_HOUR, 0, 0, 0)
        if (d.getTime() > now.getTime()) return d
      } catch {}
    }
    return null
  }

  let d = new Date(now.getFullYear(), mo - 1, dd, PUSH_HOUR, 0, 0, 0)
  if (d.getTime() <= now.getTime())
    d = new Date(now.getFullYear() + 1, mo - 1, dd, PUSH_HOUR, 0, 0, 0)
  return d
}

async function cancelBirthdays(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(BDAY_ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
    )
  } catch {}
}

/**
 * (Re)schedule each 亲友 birthday's reminders. Per person: an advance reminder
 * `advanceDays` before (default 1 → "tomorrow"; >1 → "in N days"; 0 → none) plus
 * a day-of reminder (unless `remindOnDay === false`). 农历 birthdays convert via
 * astro-core. Stable per-person ids → idempotent. Only schedules when permission
 * is already granted (call on app open freely; the 亲友 screen prompts on add).
 */
export async function scheduleBirthdayReminders(
  people: ReadonlyArray<AuspicePerson>,
  locale: Locale
): Promise<void> {
  await cancelBirthdays()
  const perm = await Notifications.getPermissionsAsync().catch(() => null)
  if (!perm || perm.status !== 'granted') return

  const t = BDAY_TEXT[locale]
  const title = getStrings(locale).appName
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  for (const p of people) {
    const dayOf = nextBirthdayFor(p)
    if (!dayOf) continue
    const advanceDays = p.advanceDays ?? 1

    if (advanceDays > 0) {
      const advance = new Date(dayOf.getTime() - advanceDays * DAY_MS)
      if (advance.getTime() > now) {
        const body =
          advanceDays === 1
            ? t.tomorrow.replace('{name}', p.name)
            : t.soon.replace('{n}', String(advanceDays)).replace('{name}', p.name)
        await Notifications.scheduleNotificationAsync({
          identifier: `${BDAY_ID_PREFIX}${p.id}-prev`,
          content: { title, body },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: advance },
        }).catch(() => {})
      }
    }

    if (p.remindOnDay !== false && dayOf.getTime() > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${BDAY_ID_PREFIX}${p.id}-day`,
        content: { title, body: t.day.replace('{name}', p.name) },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dayOf },
      }).catch(() => {})
    }
  }
}

// ── 节假日 / 调休 heads-up (CN) ──────────────────────────────────────────────────

const HOLIDAY_ID_PREFIX = 'cycle-holiday-'
const HOLIDAY_ENABLED_KEY = 'auspice.holiday.enabled'
/** Heads-up fires at 20:00 the evening BEFORE the holiday start / 调休 workday. */
const HOLIDAY_EVE_HOUR = 20
const HOLIDAY_WINDOW_DAYS = 100

const HOLIDAY_TEXT: Record<Locale, { holiday: string; workday: string }> = {
  'zh-Hans': {
    holiday: '明天起{name}放假（至 {end}），记得关掉工作日闹钟。',
    workday: '明天调休上班，别忘了设好闹钟。',
  },
  'zh-Hant': {
    holiday: '明天起{name}放假（至 {end}），記得關掉工作日鬧鐘。',
    workday: '明天調休上班，別忘了設好鬧鐘。',
  },
  ja: {
    holiday: '明日から{name}が休み（{end}まで）。平日のアラームを忘れずにオフに。',
    workday: '明日は振替出勤日。アラームの設定をお忘れなく。',
  },
  en: {
    holiday: '{name} holiday starts tomorrow (through {end}) — turn off your weekday alarm.',
    workday: 'Tomorrow is a makeup workday — remember to set your alarm.',
  },
}

function holidayEndLabel(iso: string, locale: Locale): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const mo = Number(m[1])
  const dd = Number(m[2])
  return locale === 'en' ? `${mo}/${dd}` : `${mo}月${dd}日`
}

async function cancelHoliday(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(HOLIDAY_ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {}))
    )
  } catch {}
}

export async function isHolidayHeadsUpEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(HOLIDAY_ENABLED_KEY)) === '1'
  } catch {
    return false
  }
}

/**
 * (Re)schedule the rolling window of 节假日/调休 heads-ups — evening-before, stable
 * per-date ids (idempotent). No-op unless the user enabled it AND permission is
 * granted, so it's safe to call on every app open.
 */
export async function scheduleHolidayHeadsUp(locale: Locale): Promise<void> {
  await cancelHoliday()
  if (!(await isHolidayHeadsUpEnabled())) return
  const perm = await Notifications.getPermissionsAsync().catch(() => null)
  if (!perm || perm.status !== 'granted') return

  const t = HOLIDAY_TEXT[locale]
  const title = getStrings(locale).appName
  const now = Date.now()

  for (const ev of upcomingHolidayHeadsUps(localYmd(new Date()), HOLIDAY_WINDOW_DAYS)) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ev.date)
    if (!m) continue
    const eve = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), HOLIDAY_EVE_HOUR, 0, 0, 0)
    eve.setDate(eve.getDate() - 1) // the evening BEFORE
    if (eve.getTime() <= now) continue

    const body =
      ev.kind === 'holiday'
        ? t.holiday
            .replace('{name}', ev.name)
            .replace('{end}', holidayEndLabel(ev.endDate ?? ev.date, locale))
        : t.workday
    await Notifications.scheduleNotificationAsync({
      identifier: `${HOLIDAY_ID_PREFIX}${ev.date}`,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eve },
    }).catch(() => {})
  }
}

export async function enableHolidayHeadsUp(locale: Locale): Promise<boolean> {
  if (!(await requestPushPermission())) return false
  try {
    await AsyncStorage.setItem(HOLIDAY_ENABLED_KEY, '1')
  } catch {}
  await scheduleHolidayHeadsUp(locale)
  return true
}

export async function disableHolidayHeadsUp(): Promise<void> {
  try {
    await AsyncStorage.setItem(HOLIDAY_ENABLED_KEY, '0')
  } catch {}
  await cancelHoliday()
}
