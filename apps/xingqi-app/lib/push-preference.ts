/**
 * Xingqi push preference (local). Master Reminders + Pro sub-toggles.
 * Server register + local schedule both read this.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'xingqi_push_prefs_v2'
/** Legacy master flag from v1. */
const LEGACY_KEY = 'xingqi_daily_push_v1'

export interface XingqiPushPrefs {
  /** Master: permission + register + local/server schedules. */
  remindersOn: boolean
  /** Monthly re-capture nudge (Pro). */
  recaptureOn: boolean
  /** Event-window “宜留意” (Pro). */
  eventsOn: boolean
}

const DEFAULTS: XingqiPushPrefs = {
  remindersOn: false,
  recaptureOn: true,
  eventsOn: true,
}

async function migrateLegacy(): Promise<XingqiPushPrefs | null> {
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY)
    if (legacy === null) return null
    const prefs: XingqiPushPrefs = {
      ...DEFAULTS,
      remindersOn: legacy === '1',
    }
    await AsyncStorage.setItem(KEY, JSON.stringify(prefs))
    return prefs
  } catch {
    return null
  }
}

export async function getXingqiPushPrefs(): Promise<XingqiPushPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        const o = parsed as Record<string, unknown>
        return {
          remindersOn: Boolean(o.remindersOn),
          recaptureOn: o.recaptureOn === undefined ? true : Boolean(o.recaptureOn),
          eventsOn: o.eventsOn === undefined ? true : Boolean(o.eventsOn),
        }
      }
    }
    const migrated = await migrateLegacy()
    if (migrated) return migrated
  } catch {
    // fall through
  }
  return { ...DEFAULTS }
}

export async function setXingqiPushPrefs(
  patch: Partial<XingqiPushPrefs>
): Promise<XingqiPushPrefs> {
  const cur = await getXingqiPushPrefs()
  const next: XingqiPushPrefs = { ...cur, ...patch }
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next))
    // Keep legacy key in sync for any leftover readers.
    await AsyncStorage.setItem(LEGACY_KEY, next.remindersOn ? '1' : '0')
  } catch {
    // best-effort
  }
  return next
}

/** @deprecated Use getXingqiPushPrefs().remindersOn */
export async function getDailyPushEnabled(): Promise<boolean> {
  return (await getXingqiPushPrefs()).remindersOn
}

/** @deprecated Use setXingqiPushPrefs({ remindersOn }) */
export async function setDailyPushEnabled(enabled: boolean): Promise<void> {
  await setXingqiPushPrefs({ remindersOn: enabled })
}
