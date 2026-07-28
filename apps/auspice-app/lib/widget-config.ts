/**
 * Widget / watch appearance config (persisted).
 * Defaults: 宣纸 (light) · 星空 (dark). User picks override and persist.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

/** Moon-face skins from @zhop/hexastral-tokens/moon. */
export type MoonSkinId =
  | 'ink'
  | 'starfield'
  | 'rice-paper'
  | 'moon-white'
  | 'silver'
  | 'bronze'
  | 'jade'
  | 'cinnabar'

/**
 * Theme-paired defaults for the moon FACE material (not lit/void roles).
 * Lit stays brighter than shadow in every skin — 宣纸/星空 are surface chrome;
 * face skins only change the lit-face pigment for contrast on that chrome.
 */
export function defaultMoonSkinForMode(mode: 'light' | 'dark'): MoonSkinId {
  return mode === 'light' ? 'rice-paper' : 'starfield'
}

export const DEFAULT_MOON_SKIN_ID: MoonSkinId = 'rice-paper'

/** Picker options (id + 中文 name). */
export const MOON_SKIN_OPTIONS: ReadonlyArray<{ id: MoonSkinId; name: string }> = [
  { id: 'rice-paper', name: '宣纸' },
  { id: 'starfield', name: '星空' },
  { id: 'ink', name: '苍墨' },
  { id: 'silver', name: '银' },
  { id: 'moon-white', name: '月白' },
  { id: 'bronze', name: '古铜' },
  { id: 'jade', name: '玉青' },
  { id: 'cinnabar', name: '朱砂' },
]

const VALID = new Set<string>(MOON_SKIN_OPTIONS.map((o) => o.id))
const KEY = 'auspice.widget.moonSkin'

export async function getMoonSkin(mode: 'light' | 'dark' = 'dark'): Promise<MoonSkinId> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v && VALID.has(v) ? (v as MoonSkinId) : defaultMoonSkinForMode(mode)
  } catch {
    return defaultMoonSkinForMode(mode)
  }
}

export async function setMoonSkin(id: MoonSkinId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id)
  } catch {
    // ignore persistence failures in DEV / offline
  }
}

// ── watch face template ──────────────────────────────────────────────────────

export type WatchTemplate = 'modern' | 'lunar' | 'almanac' | 'ancient'

export const DEFAULT_TEMPLATE: WatchTemplate = 'modern'

/** Templates + their tier. Labels come from i18n (`watchTemplate*`). */
export const TEMPLATE_OPTIONS: ReadonlyArray<{ id: WatchTemplate; pro: boolean }> = [
  { id: 'modern', pro: false },
  { id: 'lunar', pro: false },
  { id: 'almanac', pro: true },
  { id: 'ancient', pro: true },
]

const VALID_TEMPLATES = new Set<string>(TEMPLATE_OPTIONS.map((o) => o.id))
const TEMPLATE_KEY = 'auspice.widget.template'

export async function getWatchTemplate(): Promise<WatchTemplate> {
  try {
    const v = await AsyncStorage.getItem(TEMPLATE_KEY)
    return v && VALID_TEMPLATES.has(v) ? (v as WatchTemplate) : DEFAULT_TEMPLATE
  } catch {
    return DEFAULT_TEMPLATE
  }
}

export async function setWatchTemplate(id: WatchTemplate): Promise<void> {
  try {
    await AsyncStorage.setItem(TEMPLATE_KEY, id)
  } catch {
    // ignore
  }
}
