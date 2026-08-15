/**
 * App-wide voice mode — 「黄历原声」 (classical) vs 白话 contemporary.
 *
 * One preference switch owns the WHOLE 黄历术语 register (2026-06 convergence):
 * when ON, the zh-Hans / zh-Hant surface speaks in the classical almanac
 * register — 岁次纪年、文言日签、建除/值神/二十八宿行话、嫁娶动土… — across
 * the Today card, day detail, 择时 chips + 判词, timeline 判词, widget/watch
 * verbs AND the daily push (server renders per-sub). OFF = 白话现代词 everywhere.
 *
 * zh-only by design: en / ja never render classical content (no 原文
 * translations — the register is a Chinese-language phenomenon). Non-zh users
 * always get the vernacular gloss (白话) and see NO switch in Settings.
 *
 * Storage: device-local preference key `auspice.voice.mode` (not account-synced).
 * The legacy 宜忌 key (`auspice.yiji.displayMode`, values modern/traditional)
 * is read ONCE as a migration seed — a user who had picked 传统黄历词 is
 * assumed to want classical; `modern` maps to contemporary. New writes go to
 * the voice key only; the legacy key is no longer written.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

export type VoiceMode = 'contemporary' | 'classical'

const STORAGE_KEY = 'auspice.voice.mode'
/** Legacy 宜忌 key — migration source only (traditional → classical). */
const LEGACY_KEY = 'auspice.yiji.displayMode'

export function isVoiceMode(v: unknown): v is VoiceMode {
  return v === 'contemporary' || v === 'classical'
}

type Listener = (mode: VoiceMode) => void

let cached: VoiceMode | null = null
const listeners = new Set<Listener>()

function notify(mode: VoiceMode) {
  for (const l of listeners) l(mode)
}

async function readLegacy(): Promise<VoiceMode | null> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_KEY)
    if (raw === 'traditional' || raw === 'modern') {
      return raw === 'traditional' ? 'classical' : 'contemporary'
    }
  } catch {
    // migration seed best-effort
  }
  return null
}

/** Effective voice mode — explicit setting, else legacy seed, else contemporary. */
export async function getVoiceMode(): Promise<VoiceMode> {
  if (cached) return cached
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (isVoiceMode(raw)) {
      cached = raw
      return raw
    }
  } catch (err) {
    console.warn('[voice-mode] read failed', err)
  }
  const legacy = await readLegacy()
  cached = legacy ?? 'contemporary'
  return cached
}

export async function setVoiceMode(mode: VoiceMode): Promise<void> {
  cached = mode
  notify(mode)
  try {
    await AsyncStorage.setItem(STORAGE_KEY, mode)
  } catch (err) {
    console.warn('[voice-mode] write failed', err)
  }
}

export function subscribeVoiceMode(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * 首次启动 seed（2026-08）：新安装默认黄历模式（四语——classic 黄历比白话版
 * 更有吸引力，民族的就是世界的；en/ja 为白话黄历布局）。已有任一语体 key
 * （含 legacy）的老用户不动；App 内可随时切回。
 */
export async function seedVoiceModeDefault(_locale: string): Promise<void> {
  try {
    const [raw, legacy] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_KEY),
    ])
    if (raw !== null || legacy !== null) return
    const mode: VoiceMode = 'classical'
    cached = mode
    notify(mode)
    await AsyncStorage.setItem(STORAGE_KEY, mode)
  } catch (err) {
    console.warn('[voice-mode] seed failed', err)
  }
}
