/**
 * Almanac paper theme — classic (通书绿/红墨) vs contrast (current ink/gold).
 * Device-local; only consumed when voice mode is classical.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

export type AlmanacThemeId = 'classic' | 'contrast'

const THEME_KEY = 'yuun.almanac.theme'
const TORN_DAY_KEY = 'yuun.almanac.tornCivilDay'

export function isAlmanacThemeId(v: unknown): v is AlmanacThemeId {
  return v === 'classic' || v === 'contrast'
}

type ThemeListener = (theme: AlmanacThemeId) => void

let themeCached: AlmanacThemeId | null = null
const themeListeners = new Set<ThemeListener>()

function notifyTheme(theme: AlmanacThemeId) {
  for (const l of themeListeners) l(theme)
}

export async function getAlmanacTheme(): Promise<AlmanacThemeId> {
  if (themeCached) return themeCached
  try {
    const raw = await AsyncStorage.getItem(THEME_KEY)
    if (isAlmanacThemeId(raw)) {
      themeCached = raw
      return raw
    }
  } catch (err) {
    console.warn('[almanac-theme] read failed', err)
  }
  themeCached = 'classic'
  return themeCached
}

export async function setAlmanacTheme(theme: AlmanacThemeId): Promise<void> {
  themeCached = theme
  notifyTheme(theme)
  try {
    await AsyncStorage.setItem(THEME_KEY, theme)
  } catch (err) {
    console.warn('[almanac-theme] write failed', err)
  }
}

export function subscribeAlmanacTheme(listener: ThemeListener): () => void {
  themeListeners.add(listener)
  return () => {
    themeListeners.delete(listener)
  }
}

/** Civil day ISO already auto-torn on this device (once per day). */
export async function getTornCivilDay(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TORN_DAY_KEY)
  } catch (err) {
    console.warn('[almanac-theme] torn read failed', err)
    return null
  }
}

export async function setTornCivilDay(iso: string): Promise<void> {
  try {
    await AsyncStorage.setItem(TORN_DAY_KEY, iso)
  } catch (err) {
    console.warn('[almanac-theme] torn write failed', err)
  }
}
