/**
 * Local 宜忌 display mode — modern vs traditional labels.
 *
 * Preference is device-local (AsyncStorage), not account-synced.
 * Unset → locale default (en=modern; zh/ja=traditional).
 * Explicit toggle persists and no longer follows locale flips.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { defaultYijiModeForLocale, type YijiVocabularyMode } from '@zhop/astro-core'
import type { Locale } from './i18n'
import { getVoiceMode } from './voice-mode'

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

/**
 * The ONE register derivation for 黄历术语 (2026-06 convergence):
 * - zh follows the 「黄历原声」 voice switch: classical → traditional 文言
 *   verbs, contemporary → modern 白话 scene words.
 * - non-zh has no switch and no 原文 — always the locale's vernacular gloss
 *   (defaultYijiModeForLocale), never a classical translation.
 *
 * Used by 宜忌 blocks, Today faces, widget/watch verbs, and the local push
 * fallback; the server applies the same rule for /search 判词 + daily push.
 */
export function resolveRegisterSync(locale: Locale, classical: boolean): YijiVocabularyMode {
  if (locale.startsWith('zh')) return classical ? 'traditional' : 'modern'
  return defaultYijiModeForLocale(locale)
}

export async function resolveRegisterForLocale(locale: Locale): Promise<YijiVocabularyMode> {
  if (locale.startsWith('zh')) {
    const voice = await getVoiceMode().catch(() => 'contemporary' as const)
    return voice === 'classical' ? 'traditional' : 'modern'
  }
  return resolveYijiDisplayMode(locale)
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
