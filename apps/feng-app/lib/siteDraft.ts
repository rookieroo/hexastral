/**
 * siteDraft — AsyncStorage accumulator for the (new-site) flow.
 *
 * The stack collects: address (lat/lng + formatted), facing direction +
 * magnetic declination, building info (year + accuracy ladder + floor), and
 * an optional floor plan (户型图 keys + north bearing). Each step persists the
 * partial draft so a backgrounded app resumes mid-flow.
 *
 * Draft is cleared on (new-site)/review success or when the user discards.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'feng_site_draft'

export interface DraftFloorplanImage {
  key: string
  label?: string
}

export interface SiteDraft {
  name?: string
  label?: string
  lat?: number
  lng?: number
  formattedAddress?: string
  facingDegTrue?: number
  magneticDeclination?: number
  doorDegTrue?: number
  buildYear?: number
  buildYearAccuracy?: 'exact' | 'decade' | 'moveIn' | 'unknown'
  moveInYear?: number
  floor?: number
  // ── 户型图 / 室内堪舆 (optional step) ──
  /** Uploaded floor-plan R2 keys (1 = apartment · N = villa/multi-floor). */
  floorplanImages?: DraftFloorplanImage[]
  /** True-north bearing of the plans' top edge (north-align step). */
  floorplanOrientDeg?: number
  /** Normalized 中宫 pin (0–1) on the cover floor plan. */
  floorplanCenterNorm?: { x: number; y: number }
}

export async function loadDraft(): Promise<SiteDraft> {
  const raw = await AsyncStorage.getItem(KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as SiteDraft
  } catch {
    return {}
  }
}

export async function patchDraft(patch: Partial<SiteDraft>): Promise<SiteDraft> {
  const current = await loadDraft()
  const next = { ...current, ...patch }
  if ('doorDegTrue' in patch && patch.doorDegTrue === undefined) {
    delete next.doorDegTrue
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEY)
}

/** Validate that the draft has the minimum fields to create a site. */
export function isDraftReady(
  d: SiteDraft
): d is Required<
  Pick<
    SiteDraft,
    | 'lat'
    | 'lng'
    | 'formattedAddress'
    | 'facingDegTrue'
    | 'magneticDeclination'
    | 'buildYearAccuracy'
  >
> &
  SiteDraft {
  return (
    typeof d.lat === 'number' &&
    typeof d.lng === 'number' &&
    typeof d.formattedAddress === 'string' &&
    typeof d.facingDegTrue === 'number' &&
    typeof d.magneticDeclination === 'number' &&
    !!d.buildYearAccuracy
  )
}
