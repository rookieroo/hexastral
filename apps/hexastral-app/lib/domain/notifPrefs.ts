import type { NotifPrefs } from '@/lib/hooks/useUpdatePreferences'

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  dailyFortune: true,
  dailyFortuneEvening: true,
  luckyWindow: true,
  chartTransit: true,
  fateReportReady: true,
}

const KEYS: (keyof NotifPrefs)[] = [
  'dailyFortune',
  'dailyFortuneEvening',
  'luckyWindow',
  'chartTransit',
  'fateReportReady',
]

/**
 * Parse `users.notif_prefs_json` from D1; returns null if missing or malformed.
 * 忽略旧版 `contactJoined` 等未知键；部分键缺失时用默认值补齐。
 */
export function parseNotifPrefsJson(raw: string | null | undefined): NotifPrefs | null {
  if (raw == null || raw.trim() === '') return null
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return null
    const rec = o as Record<string, unknown>
    const partial: Partial<NotifPrefs> = {}
    for (const k of KEYS) {
      if (typeof rec[k] === 'boolean') partial[k] = rec[k]
    }
    if (Object.keys(partial).length === 0) return null
    return { ...DEFAULT_NOTIF_PREFS, ...partial }
  } catch {
    return null
  }
}
