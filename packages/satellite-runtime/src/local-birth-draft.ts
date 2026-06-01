/**
 * Local (anonymous) birth-info draft for portfolio satellites — stored per app
 * via AsyncStorage. Anonymous Tier-3 users keep birth inputs locally; once they
 * sign in, sync up with `saveAndCacheBirthInfo` (see use-portfolio-birth-info).
 * Shared so fate-app, Cycle, and any future natal-driven satellite agree on shape + key.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

export interface LocalBirthDraft {
  /** Gregorian `YYYY-MM-DD`. */
  solarDate: string
  /** 0-11 shichen index (子=0 … 亥=11), null = unknown. */
  timeIndex: number | null
  gender: '男' | '女'
}

export function localBirthDraftKey(storagePrefix: string): string {
  return `${storagePrefix}:birth_draft_v1`
}

export async function getLocalBirthDraft(storagePrefix: string): Promise<LocalBirthDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(localBirthDraftKey(storagePrefix))
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<LocalBirthDraft>
    if (!d.solarDate || (d.gender !== '男' && d.gender !== '女')) return null
    return { solarDate: d.solarDate, timeIndex: d.timeIndex ?? null, gender: d.gender }
  } catch {
    return null
  }
}

export async function saveLocalBirthDraft(
  storagePrefix: string,
  draft: LocalBirthDraft
): Promise<void> {
  await AsyncStorage.setItem(localBirthDraftKey(storagePrefix), JSON.stringify(draft))
}

export async function clearLocalBirthDraft(storagePrefix: string): Promise<void> {
  await AsyncStorage.removeItem(localBirthDraftKey(storagePrefix))
}
