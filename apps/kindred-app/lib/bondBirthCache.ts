/**
 * Local birth cache for bonds this device created in 'fill' mode.
 *
 * The bonds API deliberately never returns a partner's raw birth to the client
 * (apps/hexastral-api/src/routes/bonds.ts, privacy principle D2). That keeps the
 * other person's date/time off the wire — but it also means the bond detail
 * screen can't, on its own, hand the person off to Auspice (lib/auspice-handoff).
 *
 * So when THIS device is the one that entered the partner's birth (a 'fill'
 * bond, via pair-input / other-meta), we keep a small local copy keyed by
 * bondId. It never leaves the device; it only powers the "send to Auspice"
 * port. Invite bonds (the other person filled their own birth elsewhere) are
 * never cached here and correctly don't offer the port.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'kindred.bond_birth_cache_v1'

export interface CachedBondBirth {
  name: string
  relationshipLabel: string
  /** Solar YYYY-MM-DD. */
  solarDate: string
  timeIndex: number | null
  gender: '男' | '女' | null
  city?: string | null
}

type Cache = Record<string, CachedBondBirth>

async function readAll(): Promise<Cache> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    const obj = raw ? JSON.parse(raw) : {}
    return obj && typeof obj === 'object' ? (obj as Cache) : {}
  } catch {
    return {}
  }
}

/** Persist the partner birth for a freshly-created 'fill' bond. */
export async function cacheBondBirth(bondId: string, birth: CachedBondBirth): Promise<void> {
  try {
    const all = await readAll()
    all[bondId] = birth
    await AsyncStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Non-fatal — the Auspice port just won't show for this bond.
  }
}

/** Read the locally-entered partner birth for a bond, or null. */
export async function getBondBirth(bondId: string): Promise<CachedBondBirth | null> {
  const all = await readAll()
  return all[bondId] ?? null
}
