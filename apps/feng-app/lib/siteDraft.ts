/**
 * siteDraft — AsyncStorage accumulator for the (new-site) flow.
 *
 * The 4-screen stack collects: address (lat/lng + formatted), facing
 * direction + magnetic declination, building info (year + accuracy ladder
 * + floor). Each step persists the partial draft so a backgrounded app
 * resumes mid-flow.
 *
 * Draft is cleared on (new-site)/review success or when the user discards.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'feng_site_draft'

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
