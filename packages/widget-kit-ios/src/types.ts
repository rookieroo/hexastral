/**
 * Widget-kit shared types. Used by both RN side (useWidgetSync) and Swift
 * side (TimelineProvider reads JSON from App Group UserDefaults).
 *
 * JSON contract — keep stable. Swift parses by key; renames break widgets.
 */

/**
 * The complete payload an app writes to its widget shared App Group.
 * Each app defines its own `data` shape; the envelope is uniform.
 */
export interface WidgetSyncPayload<TData = Record<string, unknown>> {
  /** ISO timestamp when this payload was written (RN side). */
  updatedAt: string
  /** App slug — identifies which widget reads this. */
  appSlug: AppSlug
  /** Locale of the strings inside `data` (4 supported). */
  locale: WidgetLocale
  /** App-specific payload. */
  data: TData
  /** Optional ISO timestamp until which this payload is considered fresh. */
  freshUntil?: string
}

/** Satellite apps that ship home-screen widgets. `yuun` replaces obsolete `cycle`. */
export type AppSlug = 'yuun' | 'feng' | 'kindred' | 'yuan' | 'mingpan'

export type WidgetLocale = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja'

/**
 * Default App Group identifier convention.
 * Yuun overrides via plugin `appGroupId` → `group.com.hexastral.yuun`.
 */
export function appGroupForSlug(slug: AppSlug): string {
  if (slug === 'yuun') return 'group.com.hexastral.yuun'
  return `group.com.hexastral.shared.${slug}`
}

/**
 * UserDefaults key inside the App Group where the envelope payload is stored.
 * Legacy Yuun key `almanac_days` is still readable by Swift during migration.
 */
export const WIDGET_PAYLOAD_KEY = 'hexastral_widget_payload_v1'

/** Legacy Yuun key (pre-envelope). Prefer WIDGET_PAYLOAD_KEY going forward. */
export const YUUN_LEGACY_DAYS_KEY = 'almanac_days'

/** Plain-string chrome keys — readable even when envelope JSON decode drifts. */
export const YUUN_WIDGET_LOCALE_KEY = 'yuun_widget_locale'
export const YUUN_WIDGET_TIP_LABEL_KEY = 'yuun_widget_tip_label'

/** Watch companion prefs mirrored via WatchConnectivity (locale + optional birth). */
export const YUUN_WATCH_PREFS_KEY = 'yuun_watch_preferences_v1'

/** Watch bootstrap Bearer token (`w1.<id>.<secret>`); empty string = tombstone delete. */
export const YUUN_WATCH_CREDENTIAL_KEY = 'yuun_watch_credential'

export interface YuunWatchPreferences {
  locale: WidgetLocale
  birthDate?: string | null
  /** Optional 宜忌 display mode; omit → Watch/server use traditional for old clients. */
  yijiMode?: 'modern' | 'traditional' | null
}

// ── Per-app data shapes ───────────────────────────────────────────────────

/** One day in the Yuun widget cache window (matches SharedDay in Swift). */
export interface YuunWidgetDay {
  date: string
  ganZhi: string
  elementColor: string
  lunar: string
  solarTerm: string
  yi: string
  ji: string
  /** Localized 「对你而言」 verdict label; null without birth personalization. */
  fit: string | null
  /** Localized one-line For-you summary (personal.summary[fit]). */
  fitSummary?: string | null
  /**
   * Free large-widget day tip (preset lexicon). Always filled so Free large
   * widgets are not hollow when `fit` is null.
   */
  dayTip?: string | null
  /** Localized tip chrome (“Tip” / “日签”) from the App i18n payload. */
  tipLabel?: string | null
  moonPhase: number
  /** Large / lock extras — optional for small/medium. */
  officer?: string
  mansion?: string
  clashShengxiao?: string
  ganzhiYear?: string | null
  /** ≤2 verbs — small widget + lock rectangular (one line). */
  yiShort?: string
  jiShort?: string
  /** ≤6 verbs — large widget only (wraps to two lines). */
  yiLong?: string | null
  jiLong?: string | null
  /** Toned Mandarin 副标 for the 干支 day; en only, null elsewhere. */
  ganZhiPinyin?: string | null
}

/**
 * Order of `YuunWidgetChrome.moonPhaseNames`. Matches `getLunarPhaseName`
 * buckets in `@zhop/hexastral-tokens/lunar` and the Swift index in the widget.
 */
export const YUUN_MOON_PHASE_ORDER = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
] as const

/**
 * Locale chrome the native faces paint. The RN app owns all copy (i18n tables);
 * Swift constants exist only for the first render before any window is written.
 */
export interface YuunWidgetChrome {
  /** 宜 column label. */
  good: string
  /** 忌 column label. */
  avoid: string
  /** 对你而言 label (short form). */
  forYou: string
  /** 日签 label; empty string means "paint no label" (en). */
  tip: string
  /** Substitute for a missing 农历月日. */
  lunarFallback: string
  /** Body shown when the widget has no cached window. */
  emptyHint: string
  /** 8 月相 names in `YUUN_MOON_PHASE_ORDER`. */
  moonPhaseNames: string[]
}

/** Yuun widget payload — N-day window written by the RN app. */
export interface YuunWidgetData {
  days: YuunWidgetDay[]
  /** Absent on payloads written by older app builds. */
  chrome?: YuunWidgetChrome
}

/** @deprecated Use YuunWidgetData. Kept as alias for older imports. */
export type AuspiceWidgetData = YuunWidgetData

/** Feng widget data. */
export interface FengWidgetData {
  monthlyCenter: number
  keyAvoidRoom: string
  nineGridSummary: number[]
  topRoomFitLabels: string[]
  nextJieqiCheck: string
  nextJieqiDays: number
}

/** Kindred widget data. */
export interface KindredWidgetData {
  todayPairFitStars: number
  dailyInsightOneLine: string
  nextAnniversaryDays?: number
  nextAnniversaryLabel?: string
  trendArrow?: 'up' | 'flat' | 'down'
}
