/**
 * Local 宜忌 display mode — modern vs traditional labels.
 *
 * Preference is device-local (AsyncStorage), not account-synced.
 * Unset → locale default (en=modern; zh/ja=traditional).
 * Explicit toggle persists and no longer follows locale flips.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  defaultYijiModeForLocale,
  type YijiVocabularyMode,
} from '@zhop/astro-core'
import type { Locale } from './i18n'

export const YIJI_MODE_STORAGE_KEY = 'auspice.yiji.displayMode'

export type { YijiVocabularyMode }

export function isYijiVocabularyMode(v: unknown): v is YijiVocabularyMode {
  return v === 'modern' || v === 'traditional'
}

type Listener = (mode: YijiVocabularyMode | null) => void

let cachedOverride: YijiVocabularyMode | null | undefined
const listeners = new Set<Listener>()

function notify(override: YijiVocabularyMode | null) {
  for (const l of listeners) l(override)
}

/** Explicit override only — `null` means fall back to locale default. */
export async function getYijiModeOverride(): Promise<YijiVocabularyMode | null> {
  if (cachedOverride !== undefined) return cachedOverride
  try {
    const raw = await AsyncStorage.getItem(YIJI_MODE_STORAGE_KEY)
    if (isYijiVocabularyMode(raw)) {
      cachedOverride = raw
      return raw
    }
  } catch (err) {
    console.warn('[yiji-mode] read failed', err)
  }
  cachedOverride = null
  return null
}

export async function setYijiModeOverride(mode: YijiVocabularyMode): Promise<void> {
  cachedOverride = mode
  notify(mode)
  try {
    await AsyncStorage.setItem(YIJI_MODE_STORAGE_KEY, mode)
  } catch (err) {
    console.warn('[yiji-mode] write failed', err)
  }
}

export async function clearYijiModeOverride(): Promise<void> {
  cachedOverride = null
  notify(null)
  try {
    await AsyncStorage.removeItem(YIJI_MODE_STORAGE_KEY)
  } catch (err) {
    console.warn('[yiji-mode] clear failed', err)
  }
}

/** Effective mode for display — override or locale default. */
export async function resolveYijiDisplayMode(locale: Locale): Promise<YijiVocabularyMode> {
  const override = await getYijiModeOverride()
  return override ?? defaultYijiModeForLocale(locale)
}

export function resolveYijiDisplayModeSync(
  locale: Locale,
  override: YijiVocabularyMode | null | undefined
): YijiVocabularyMode {
  if (isYijiVocabularyMode(override)) return override
  return defaultYijiModeForLocale(locale)
}

export function subscribeYijiModeOverride(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Warm cache on app start (optional). */
export async function hydrateYijiModeOverride(): Promise<YijiVocabularyMode | null> {
  return getYijiModeOverride()
}
