/**
 * Pure builder for the bonds-timeline LOCAL push schedule (ADR-0014 D3).
 *
 * The server returns a future "notification timetable" (`notifications` on
 * `GET /api/bonds/timeline`, Pro-only); the client lays it onto expo-notifications
 * as a rolling window and reschedules on each app open — no push token, no cron
 * (same pattern as apps/auspice-app/lib/push.ts). This module is the device-free,
 * unit-testable core: it turns the DTO list into ready-to-schedule items, localized
 * client-side (the server timetable is zh-Hans only) and filtered to the future.
 *
 * Kept dependency-free (no expo-notifications) so it runs under `bun test`; the thin
 * scheduling wrapper that calls Notifications.scheduleNotificationAsync lives in the
 * app (apps/kindred-app/lib/timeline-push.ts).
 */

import type { BondsTimelineNotification } from '../types'
import { formatLeadLabel, formatNodeKind, type KindredLocale } from './timeline-format'

/** Stable identifier prefix — lets the app cancel-by-prefix idempotently. */
export const TIMELINE_NOTIFY_ID_PREFIX = 'kindred-timeline-'

/** One ready-to-schedule local notification (device-agnostic). */
export interface TimelineNotificationPlanItem {
  /** Stable per-node id → rescheduling REPLACES instead of duplicating. */
  identifier: string
  title: string
  body: string
  /** When it should fire (local DATE trigger). */
  fireDate: Date
  /** Deep-link payload the tap handler routes on. */
  data: { route: string; key: string; year: string }
}

export interface BuildTimelineNotificationPlanOptions {
  locale: KindredLocale
  /** Defaults to `new Date()`; injectable for deterministic tests. */
  now?: Date
  /** Deep-link route a tap should open (defaults to the timeline screen). */
  route?: string
}

function notifyTitle(locale: KindredLocale): string {
  switch (locale) {
    case 'zh':
      return '关系前瞻'
    case 'zh-Hant':
      return '關係前瞻'
    case 'ja':
      return '関係の予報'
    default:
      return 'Relationship ahead'
  }
}

/** Localized body — built from structured fields, NOT the zh-Hans server summary. */
function notifyBody(n: BondsTimelineNotification, locale: KindredLocale): string {
  const kind = formatNodeKind(n.kind, locale)
  const lead = formatLeadLabel(n.leadDays, locale)
  switch (locale) {
    case 'zh':
      return `${n.year}年 · ${kind}节点${lead ? ` · ${lead}` : ''}，点开看你们关系的转折。`
    case 'zh-Hant':
      return `${n.year}年 · ${kind}節點${lead ? ` · ${lead}` : ''}，點開看你們關係的轉折。`
    case 'ja':
      return `${n.year}年・${kind}の節目（${lead}）。関係の転機を確認しましょう。`
    default:
      return `${n.year} · a ${kind.toLowerCase()} turning point ${lead}. Tap to see what shifts.`
  }
}

/** Parse an ISO date/datetime to a Date; returns null when unparseable. */
function parseFireDate(iso: string): Date | null {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * Build the local-notification schedule from the server timetable.
 *
 * - Skips items whose fireDate is in the past or unparseable.
 * - De-dupes by node key (server may co-locate; one push per node).
 * - Stable per-key identifier → idempotent reschedule (no duplicate stacking).
 *
 * Caller (the app) is responsible for the Pro gate + permission; the server only
 * returns `notifications` for Pro users, so an empty input here is the free-tier
 * (and the not-yet-Pro) state and yields an empty plan.
 */
export function buildTimelineNotificationPlan(
  notifications: readonly BondsTimelineNotification[],
  options: BuildTimelineNotificationPlanOptions
): TimelineNotificationPlanItem[] {
  const now = options.now ?? new Date()
  const route = options.route ?? '/(timeline)'
  const nowMs = now.getTime()
  const seen = new Set<string>()
  const plan: TimelineNotificationPlanItem[] = []

  for (const n of notifications) {
    if (seen.has(n.key)) continue
    const fireDate = parseFireDate(n.fireDate)
    if (!fireDate || fireDate.getTime() <= nowMs) continue
    seen.add(n.key)
    plan.push({
      identifier: `${TIMELINE_NOTIFY_ID_PREFIX}${n.key}`,
      title: notifyTitle(options.locale),
      body: notifyBody(n, options.locale),
      fireDate,
      data: { route, key: n.key, year: String(n.year) },
    })
  }

  return plan
}
