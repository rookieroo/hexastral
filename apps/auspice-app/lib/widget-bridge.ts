/**
 * Widget bridge — builds a 7-day 黄历 window and writes it via
 * `@zhop/widget-kit-ios` into App Group `group.com.hexastral.yuun`.
 *
 * No-ops until `react-native-shared-group-preferences` is linked (prebuild).
 * See docs/apps/yuun/widget-build-runbook.md.
 */

import {
  writeWidgetPayload,
  YUUN_MOON_PHASE_ORDER,
  type YuunWidgetChrome,
  type YuunWidgetData,
  type YuunWidgetDay,
} from '@zhop/widget-kit-ios'
import {
  buildDailyCardModel,
  compactChrome,
  compactVerbs,
  verbBudget,
} from '@/components/DailyCard'
import { type AuspiceDay, type AuspicePersonalization, fetchAuspiceDay } from '@/lib/api'
import { getAuspiceBirthDate } from '@/lib/birth'
import { getStrings, type Locale } from '@/lib/i18n'

const APP_GROUP = 'group.com.hexastral.yuun'
const WINDOW_DAYS = 7

/**
 * Face chrome for the native widget, sourced from the app's i18n tables so
 * WidgetKit never has to own copy. en paints no 日签 label (body only).
 */
function toWidgetChrome(locale: Locale): YuunWidgetChrome {
  const t = getStrings(locale)
  const c = t.widgetChrome
  return {
    good: c.good,
    avoid: c.avoid,
    forYou: c.forYou,
    tip: locale === 'en' ? '' : c.tip,
    lunarFallback: c.lunarFallback,
    emptyHint: c.emptyHint,
    moonPhaseNames: YUUN_MOON_PHASE_ORDER.map((phase) => t.moonPhaseNames[phase]),
  }
}

/** @deprecated Prefer YuunWidgetDay from @zhop/widget-kit-ios */
export type WidgetDay = YuunWidgetDay

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function addDaysIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  dt.setDate(dt.getDate() + delta)
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function localeToWidget(locale: Locale): 'en' | 'zh-Hans' | 'zh-Hant' | 'ja' {
  return locale
}

function toWidgetDay(
  date: string,
  day: AuspiceDay,
  personalization: AuspicePersonalization | null | undefined,
  t: Parameters<typeof buildDailyCardModel>[3],
  locale: Locale,
  includeFit: boolean
): YuunWidgetDay {
  const m = buildDailyCardModel(date, day, includeFit ? (personalization ?? null) : null, t, locale)
  const en = locale === 'en'
  const chrome = compactChrome(locale)
  // en compact: keep 干支 + 宜/忌 glyphs + localized verbs; drop dense almanac extras.
  // Three verb budgets per surface: short = small (1 line), plain = medium
  // (2 lines in a narrow column), long = large (2 lines full width).
  return {
    date,
    ganZhi: m.ganZhi,
    ganZhiPinyin: m.ganZhiPinyin,
    elementColor: m.dayElementColor,
    lunar: m.lunarMonthDay,
    solarTerm: m.solarTermName,
    // Follow app locale — en gets localized verbs (Wedding·…), not forced CJK.
    yi: compactVerbs(m.goodForRaw, en ? 4 : 5, locale),
    ji: compactVerbs(m.avoidRaw, en ? 4 : 5, locale),
    // Small widget + lock rectangular: 2 verbs in every locale.
    yiShort: compactVerbs(m.goodForRaw, 2, locale),
    jiShort: compactVerbs(m.avoidRaw, 2, locale),
    yiLong: compactVerbs(m.goodForRaw, verbBudget(locale, 'large'), locale),
    jiLong: compactVerbs(m.avoidRaw, verbBudget(locale, 'large'), locale),
    fit: includeFit ? m.fitLabel : null,
    fitSummary: includeFit ? m.fitSummary : null,
    dayTip: m.dayTip,
    tipLabel: en ? null : chrome.tip,
    moonPhase: m.moonPhase,
    officer: en ? undefined : m.officer,
    mansion: en ? undefined : m.mansion,
    clashShengxiao: en ? undefined : m.clashShengxiao,
    // Year pillar stays on zh/ja; en medium already tight — omit 丙午年.
    ganzhiYear: en ? null : m.ganzhiYear,
  }
}

/** Write the window into the App Group (envelope + legacy mirror). */
export async function writeWidgetDays(
  days: YuunWidgetDay[],
  locale: Locale = 'zh-Hans'
): Promise<void> {
  const data: YuunWidgetData = { days, chrome: toWidgetChrome(locale) }
  const fresh = new Date()
  fresh.setDate(fresh.getDate() + WINDOW_DAYS)
  await writeWidgetPayload('yuun', localeToWidget(locale), data, fresh.toISOString(), {
    appGroupId: APP_GROUP,
    mirrorLegacyYuunDays: true,
  })
}

/**
 * Sync a 7-day window starting at `anchorDate` (usually today).
 * `includeFit` should be true when birth personalization is available
 * (free 「对你而言」 summary). Per-reason deep unlock stays Pro in-app.
 */
export async function syncWidgetWindow(
  anchorDate: string,
  t: Parameters<typeof buildDailyCardModel>[3],
  locale: Locale,
  includeFit: boolean
): Promise<void> {
  const birthDate = includeFit ? await getAuspiceBirthDate() : undefined
  const days: YuunWidgetDay[] = []

  for (let i = 0; i < WINDOW_DAYS; i++) {
    const date = addDaysIso(anchorDate, i)
    try {
      const payload = await fetchAuspiceDay(date, birthDate)
      days.push(toWidgetDay(date, payload.day, payload.personalization, t, locale, includeFit))
    } catch {
      // Skip failed days; partial window is better than empty.
    }
  }

  if (days.length === 0) return

  const data: YuunWidgetData = { days, chrome: toWidgetChrome(locale) }
  const fresh = new Date()
  fresh.setDate(fresh.getDate() + WINDOW_DAYS)
  await writeWidgetPayload('yuun', localeToWidget(locale), data, fresh.toISOString(), {
    appGroupId: APP_GROUP,
    mirrorLegacyYuunDays: true,
  })
}

/**
 * Build today's WidgetDay and sync a full window.
 * Kept for call-site compatibility; prefer syncWidgetWindow.
 */
export async function syncTodayWidget(
  date: string,
  day: AuspiceDay,
  personalization: AuspicePersonalization | null | undefined,
  t: Parameters<typeof buildDailyCardModel>[3],
  locale: Locale,
  includeFit = false
): Promise<void> {
  // Seed today immediately so the widget updates before the rest of the window.
  const today = toWidgetDay(date, day, personalization, t, locale, includeFit)
  await writeWidgetDays([today], locale)
  void syncWidgetWindow(date, t, locale, includeFit)
}
