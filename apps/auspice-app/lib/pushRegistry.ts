/**
 * Auspice push registry — the SINGLE source of truth for every notification type.
 *
 * Delivery is hybrid: server push via svc-notify cron (primary when registered) with
 * local expo-notifications as fallback (see lib/push.ts). Daily bodies use
 * deterministic almanac compute; personalized LLM reading stays in-app.
 *
 * Settings UI drives enable flags from this typed catalog. The `holiday` type
 * (CN 调休 heads-up) is deprecated — no Settings toggle; kept for migration only.
 */

/** Who can receive a given push type. */
export type PushTier = 'free' | 'pro'

/**
 * How a type's content is produced and how far ahead it can be scheduled:
 *  - `static`      — known ahead with no compute (holidays / birthdays).
 *  - `daily-fetch` — fetched per day from deterministic server compute.
 *  - `rolling`     — fetched as a bounded forward window (流月 / 大运), re-fetched
 *                    on app open. NEVER materialize years ahead.
 */
export type PushDataSource = 'static' | 'daily-fetch' | 'rolling'

export interface PushTypeMeta {
  /** Stable key — also the AsyncStorage enable-flag namespace in lib/push.ts. */
  id: 'daily' | 'evening' | 'birthday' | 'holiday' | 'timeline'
  /** Settings label / description i18n hooks live with the screen, not here. */
  tier: PushTier
  dataSource: PushDataSource
  /** Human note on acquisition cadence + how much is stored at once. */
  cadence: string
  storage: string
  /** Slots this type fires (informational; the scheduler owns exact hours). */
  slots: Array<'morning' | 'evening' | 'eve-before' | 'on-date'>
}

/**
 * The catalog. Tiering matches the product rule: 日常黄历 / 生日提醒 / 节假日 are
 * FREE; the personalized 对你而言 overlay on the daily push and the 大运流年 / 流月
 * timeline reminders are auspice_pro. Birthday reminders are free up to a cap
 * (see FREE_BIRTHDAY_LIMIT in lib/push.ts); beyond that needs Pro.
 */
export const PUSH_TYPES: readonly PushTypeMeta[] = [
  {
    id: 'daily',
    tier: 'free', // the 对你而言 overlay line is Pro-gated inside the body, not the push
    dataSource: 'daily-fetch',
    cadence:
      'SERVER push (svc-notify cron → Expo): the body is rendered server-side from ' +
      'the deterministic almanac per device. Reliable even if the app stays closed. ' +
      'Local rolling-window notifications are the FALLBACK when registration fails.',
    storage:
      'Server: auspice_push_subs (one row/device, refreshed on open). Local fallback: ' +
      'a rolling WINDOW_DAYS window (morning + evening), deferred once server-registered.',
    slots: ['morning', 'evening'],
  },
  {
    id: 'evening',
    tier: 'free',
    dataSource: 'daily-fetch',
    cadence:
      'A 20:00 "tomorrow heads-up" — fires only when tomorrow is notable (a 节气/节日, or ' +
      '— Pro — a 大吉/凶 day for you); silent otherwise. A sub-toggle of the daily push: ' +
      'the 8pm slot can be silenced without losing the 8am reading.',
    storage:
      'Rides the daily push subscription (dailyEvening pref); local evening window as fallback.',
    slots: ['evening'],
  },
  {
    id: 'birthday',
    tier: 'free', // free up to FREE_BIRTHDAY_LIMIT 亲友; more is Pro
    dataSource: 'static',
    cadence: 'Known from saved 亲友 birthdays; 农历 resolved via astro-core at schedule time.',
    storage: 'Local AsyncStorage (lib/people.ts) + server birthday_reminders (authoritative cap).',
    slots: ['eve-before', 'on-date'],
  },
  {
    id: 'holiday',
    tier: 'free',
    dataSource: 'static',
    cadence:
      'DEPRECATED (2026-06): CN holiday/调休 evening heads-up — Settings toggle removed. ' +
      'Scheduler may still purge legacy IDs; do not claim in ASO.',
    storage: 'Legacy local window only.',
    slots: ['eve-before'],
  },
  {
    id: 'timeline',
    tier: 'pro', // 大运流年 + 流月 are the timeline Pro perk
    dataSource: 'rolling',
    cadence:
      '流月 fetched as a rolling ~6-month window + the next 大运 transition; re-fetched on app ' +
      'open. NEVER precomputed for years — only the bounded near-term window is materialized.',
    storage: 'A rolling window of month-start + 大运-transition local notifications.',
    slots: ['morning'],
  },
] as const

export function pushTypeById(id: PushTypeMeta['id']): PushTypeMeta | undefined {
  return PUSH_TYPES.find((p) => p.id === id)
}
