/**
 * Widget / watch appearance config (persisted). For now this drives the in-app
 * DEV preview + the StaticMoon skin; once the native WidgetKit / watchOS targets
 * ship they read the same choice from a shared app-group mirror.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

/** Moon-face skins from @zhop/hexastral-tokens/moon. */
export type MoonSkinId = 'rice-paper' | 'moon-white' | 'silver' | 'bronze' | 'jade' | 'cinnabar'

export const DEFAULT_MOON_SKIN_ID: MoonSkinId = 'silver'

/** Picker options (id + the skin's 中文 name from moon.ts). */
export const MOON_SKIN_OPTIONS: ReadonlyArray<{ id: MoonSkinId; name: string }> = [
  { id: 'silver', name: '银' },
  { id: 'rice-paper', name: '宣纸' },
  { id: 'moon-white', name: '月白' },
  { id: 'bronze', name: '古铜' },
  { id: 'jade', name: '玉青' },
  { id: 'cinnabar', name: '朱砂' },
]

const VALID = new Set<string>(MOON_SKIN_OPTIONS.map((o) => o.id))
const KEY = 'cycle.widget.moonSkin'

export async function getMoonSkin(): Promise<MoonSkinId> {
  try {
    const v = await AsyncStorage.getItem(KEY)
    return v && VALID.has(v) ? (v as MoonSkinId) : DEFAULT_MOON_SKIN_ID
  } catch {
    return DEFAULT_MOON_SKIN_ID
  }
}

export async function setMoonSkin(id: MoonSkinId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, id)
  } catch {}
}

// ── watch face template ──────────────────────────────────────────────────────

export type WatchTemplate = 'modern' | 'lunar' | 'almanac' | 'ancient'

export const DEFAULT_TEMPLATE: WatchTemplate = 'modern'

/** Templates + their tier. `almanac`/`ancient` are the Pro (IAP) faces. */
export const TEMPLATE_OPTIONS: ReadonlyArray<{ id: WatchTemplate; label: string; pro: boolean }> = [
  { id: 'modern', label: '极简', pro: false },
  { id: 'lunar', label: '月相', pro: false },
  { id: 'almanac', label: '黄历', pro: true },
  { id: 'ancient', label: '古风', pro: true },
]

const VALID_TEMPLATES = new Set<string>(TEMPLATE_OPTIONS.map((o) => o.id))
const TEMPLATE_KEY = 'cycle.widget.template'

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
  } catch {}
}
