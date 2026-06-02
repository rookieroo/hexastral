/**
 * Widget bridge — writes the day's 黄历 into the shared App Group that the native
 * WidgetKit / watchOS targets read (`targets/widget/index.swift`).
 *
 * Deliberately has NO import of the native JS wrapper: it talks to the native
 * module directly via `NativeModules.RNSharedGroupPreferences` (registered by
 * `react-native-shared-group-preferences` once it's installed + the iOS target
 * rebuilt). So this file stays tsc-green BEFORE any native setup and simply
 * no-ops until the module is linked. See docs/cycle-widget-build-runbook.md.
 */

import { NativeModules, Platform } from 'react-native'
import { buildDailyCardModel, topVerbs } from '@/components/DailyCard'
import type { AuspiceDay, AuspicePersonalization } from '@/lib/api'
import type { Locale } from '@/lib/i18n'

const APP_GROUP = 'group.com.hexastral.cycle'
const DAYS_KEY = 'almanac_days'

/** Compact day shape — must match `SharedDay` in targets/widget/index.swift. */
export interface WidgetDay {
  date: string
  ganZhi: string
  elementColor: string
  lunar: string
  solarTerm: string
  yi: string
  ji: string
  fit: string | null
  moonPhase: number
}

interface SharedGroupNativeModule {
  setItem(key: string, value: string, appGroup: string): Promise<void>
}
const RNShared = (NativeModules as { RNSharedGroupPreferences?: SharedGroupNativeModule })
  .RNSharedGroupPreferences

/** Write the window into the App Group (no-op off-iOS or before the native link). */
export async function writeWidgetDays(days: WidgetDay[]): Promise<void> {
  if (Platform.OS !== 'ios' || !RNShared) return
  try {
    await RNShared.setItem(DAYS_KEY, JSON.stringify({ days }), APP_GROUP)
  } catch {}
}

/** Build today's WidgetDay from a day payload and sync it. Call after each fetch. */
export async function syncTodayWidget(
  date: string,
  day: AuspiceDay,
  personalization: AuspicePersonalization | null | undefined,
  t: Parameters<typeof buildDailyCardModel>[3],
  locale: Locale
): Promise<void> {
  const m = buildDailyCardModel(date, day, personalization ?? null, t, locale)
  await writeWidgetDays([
    {
      date,
      ganZhi: m.ganZhi,
      elementColor: m.dayElementColor,
      lunar: m.lunarMonthDay,
      solarTerm: m.solarTermName,
      yi: topVerbs(m.goodForRaw, locale, 3),
      ji: topVerbs(m.avoidRaw, locale, 3),
      fit: m.fitLabel,
      moonPhase: m.moonPhase,
    },
  ])
}
