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

import type { BondsTimelineNode, BondsTimelineNotification } from '../types'
import { formatLeadLabel, formatNodeKind, type KindredLocale } from './timeline-format'

/** Stable identifier prefix — lets the app cancel-by-prefix idempotently. */
export const TIMELINE_NOTIFY_ID_PREFIX = 'kindred-timeline-'

/** Separate prefix for the monthly 流月 relationship digest (cancel independently). */
export const LIUYUE_DIGEST_ID_PREFIX = 'kindred-liuyue-'

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

// ── 流月 monthly relationship digest ─────────────────────────────────────────

function digestTitle(locale: KindredLocale): string {
  switch (locale) {
    case 'zh':
      return '本月缘分'
    case 'zh-Hant':
      return '本月緣分'
    case 'ja':
      return '今月の縁'
    default:
      return 'This month'
  }
}

/** Cap the named bonds so the body stays short; the rest fold into "…". */
function digestNames(node: BondsTimelineNode, locale: KindredLocale): string {
  const names = node.bonds.map((b) => b.name.trim()).filter((n) => n.length > 0)
  if (names.length === 0) {
    switch (locale) {
      case 'zh':
        return '你的关系'
      case 'zh-Hant':
        return '你的關係'
      case 'ja':
        return 'あなたの縁'
      default:
        return 'your bonds'
    }
  }
  if (names.length <= 2) return names.join(locale === 'en' ? ' & ' : '、')
  const head = names.slice(0, 2).join(locale === 'en' ? ', ' : '、')
  switch (locale) {
    case 'zh':
    case 'zh-Hant':
      return `${head} 等`
    case 'ja':
      return `${head} ほか`
    default:
      return `${head} & more`
  }
}

function digestBody(node: BondsTimelineNode, locale: KindredLocale): string {
  const who = digestNames(node, locale)
  switch (locale) {
    case 'zh':
      return `本月，你与${who}有缘分的交会。点开看此刻你们的关系。`
    case 'zh-Hant':
      return `本月，你與${who}有緣分的交會。點開看此刻你們的關係。`
    case 'ja':
      return `今月、${who}との縁の交わり。今の二人を確かめましょう。`
    default:
      return `This month, your path crosses with ${who}. Tap to see where you stand.`
  }
}

/**
 * Build the MONTHLY relationship digest from the 流月 living layer — one gentle
 * push at the start of each upcoming month that has an actual 冲/合 with someone
 * (`bonds` non-empty). Quiet when nothing's happening (no fabricated nudge). This
 * is the recurring touch that keeps the subscription alive between the rarer
 * lifetime-axis nodes (the founder's sub-sustainability lever). Pro-gated by data:
 * free users only get the current month (past fireDate → nothing scheduled).
 *
 * Fires on the 1st of the calendar month at 09:00 local — a clean "本月" cadence
 * (the 节气-based 流月 boundary is an in-app detail, not a push trigger).
 */
export function buildLiuyueDigestPlan(
  liuyue: readonly BondsTimelineNode[],
  options: BuildTimelineNotificationPlanOptions
): TimelineNotificationPlanItem[] {
  const now = options.now ?? new Date()
  const route = options.route ?? '/(timeline)'
  const nowMs = now.getTime()
  const seen = new Set<string>()
  const plan: TimelineNotificationPlanItem[] = []

  for (const node of liuyue) {
    if (node.month == null || node.bonds.length === 0) continue
    if (seen.has(node.key)) continue
    const fireDate = new Date(node.year, node.month - 1, 1, 9, 0, 0)
    if (fireDate.getTime() <= nowMs) continue
    seen.add(node.key)
    plan.push({
      identifier: `${LIUYUE_DIGEST_ID_PREFIX}${node.key}`,
      title: digestTitle(options.locale),
      body: digestBody(node, options.locale),
      fireDate,
      data: { route, key: node.key, year: String(node.year) },
    })
  }

  return plan
}
