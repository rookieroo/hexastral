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
  /** Pro 「对你而言」; null for Free. */
  fit: string | null
  moonPhase: number
  /** Large / lock extras — optional for small/medium. */
  officer?: string
  mansion?: string
  clashShengxiao?: string
  ganzhiYear?: string | null
  yiShort?: string
  jiShort?: string
}

/** Yuun widget payload — N-day window written by the RN app. */
export interface YuunWidgetData {
  days: YuunWidgetDay[]
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
