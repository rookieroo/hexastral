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
  /** App slug (e.g. 'cycle', 'feng', 'kindred', 'mingpan'). Identifies which widget reads this. */
  appSlug: AppSlug
  /** Locale of the strings inside `data` (4 supported). */
  locale: WidgetLocale
  /** App-specific payload. See per-app type docs in /docs/widget-data-contracts.md (TBD). */
  data: TData
  /** Optional ISO timestamp until which this payload is considered fresh.
   *  Swift TimelineProvider uses this to schedule next refresh. */
  freshUntil?: string
}

export type AppSlug = 'cycle' | 'feng' | 'yuan' | 'mingpan'

export type WidgetLocale = 'en' | 'zh-Hans' | 'zh-Hant' | 'ja'

/**
 * App Group identifier convention.
 * Format: `group.com.hexastral.shared.{appSlug}`
 * Each app's WidgetExtension target reads from this group.
 */
export function appGroupForSlug(slug: AppSlug): string {
  return `group.com.hexastral.shared.${slug}`
}

/**
 * UserDefaults key inside the App Group where the payload is stored.
 * Single key per app — last write wins.
 */
export const WIDGET_PAYLOAD_KEY = 'hexastral_widget_payload_v1'

// ── Per-app data shapes (extend as widgets ship) ─────────────────────────

/** Auspice widget data (Sprint 5 spec).
 *  Small: ganZhi, lunarDate, nextSolarTermDays, nextSolarTermName
 *  Medium: + todayYi (top 1), moonPhaseEmoji (Pro)
 *  Lock-Screen: + nextFamilyEventLabel, nextFamilyEventDays
 */
export interface AuspiceWidgetData {
  ganZhi: string
  lunarDate: string
  nextSolarTermName: string
  nextSolarTermDays: number
  todayYi?: string
  moonPhaseEmoji?: string
  nextFamilyEventLabel?: string
  nextFamilyEventDays?: number
}

/** Feng widget data (Sprint F.5 spec).
 *  Small: monthlyFlyingStarsCenter, keyAvoidRoom
 *  Medium: + 3x3 stars mini grid summary, topThreeRoomFit
 *  Lock-Screen: nextJieqiCheck (room maintenance reminder)
 */
export interface FengWidgetData {
  monthlyCenter: number
  keyAvoidRoom: string
  nineGridSummary: number[]
  topRoomFitLabels: string[]
  nextJieqiCheck: string
  nextJieqiDays: number
}

/** Kindred widget data (Sprint Y.4 spec).
 *  Small: todayPairFit, dailyInsightOneLine
 *  Medium: + nextAnniversaryCountdown
 *  Lock-Screen: + relationshipTrendArrow
 */
export interface KindredWidgetData {
  todayPairFitStars: number
  dailyInsightOneLine: string
  nextAnniversaryDays?: number
  nextAnniversaryLabel?: string
  trendArrow?: 'up' | 'flat' | 'down'
}

/** MingPan widget data — none. MingPan is a pure tool, no widget. */
