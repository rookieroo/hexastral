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

import type { FengResidenceType } from '@zhop/scenario-feng'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'feng_site_draft'

export interface DraftFloorplanImage {
  key: string
  label?: string
}

export interface SiteDraft {
  name?: string
  label?: string
  /** 住宅类型 — apartment 公寓/小区 · flat 大平层 · villa 独栋/别墅. Drives pricing tier + street 形煞. */
  residenceType?: FengResidenceType
  lat?: number
  lng?: number
  /** Original geocode point before building-center pin adjustment. */
  geocodeLat?: number
  geocodeLng?: number
  /** Normalized building center on the satellite preview (0–1). */
  buildingCenterNorm?: { x: number; y: number }
  formattedAddress?: string
  facingDegTrue?: number
  magneticDeclination?: number
  /** Set when the user captures compass, nudges, or drags the facing ring (not a silent default). */
  facingConfirmed?: boolean
  doorDegTrue?: number
  buildYear?: number
  buildYearAccuracy?: 'exact' | 'decade' | 'moveIn' | 'unknown'
  moveInYear?: number
  floor?: number
  // ── 户型图 / 室内堪舆 (optional step) ──
  /** Uploaded floor-plan R2 keys (1 = apartment · N = villa/multi-floor). */
  floorplanImages?: DraftFloorplanImage[]
  /** Address text that produced the current geocodeLat/Lng (for re-geocode on edit). */
  lastGeocodedAddress?: string
  /** True-north bearing of the plans' top edge (north-align step). */
  floorplanOrientDeg?: number
  /** Normalized 中宫 pin (0–1) on the cover floor plan. */
  floorplanCenterNorm?: { x: number; y: number }
  /** Set when the user dials north bearing or drags the 中宫 pin on the floor plan. */
  floorplanOrientConfirmed?: boolean
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

export { isDraftReady } from '@/lib/draft-quality'
