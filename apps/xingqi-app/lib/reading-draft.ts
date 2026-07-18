/**
 * In-memory + AsyncStorage draft for the Xingqi funnel:
 * consent → three photos → birth → paywall → reading.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'xingqi_reading_draft_v1'

export type CapturePart = 'palm_l' | 'palm_r' | 'face'

export interface ReadingDraft {
  palmLeftUri?: string
  palmRightUri?: string
  faceUri?: string
  palmLeftFeatureId?: string
  palmRightFeatureId?: string
  faceFeatureId?: string
  solarDate?: string
  timeIndex?: number
  gender?: '男' | '女'
  city?: string
  horizonMonths?: 3 | 6
  outputKind?: 'oneshot' | 'period_brief'
  updateKind?: 'full' | 'partial'
  partialParts?: CapturePart[]
}

let draft: ReadingDraft = {}

export function getReadingDraft(): ReadingDraft {
  return { ...draft }
}

export function patchReadingDraft(patch: Partial<ReadingDraft>): ReadingDraft {
  draft = { ...draft, ...patch }
  void AsyncStorage.setItem(KEY, JSON.stringify(draft)).catch(() => undefined)
  return getReadingDraft()
}

export function clearReadingDraft(): void {
  draft = {}
  void AsyncStorage.removeItem(KEY).catch(() => undefined)
}

export async function hydrateReadingDraft(): Promise<ReadingDraft> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        draft = parsed as ReadingDraft
      }
    }
  } catch {
    // ignore corrupt cache
  }
  return getReadingDraft()
}

export function draftHasThreePhotos(d: ReadingDraft = draft): boolean {
  return Boolean(d.palmLeftUri && d.palmRightUri && d.faceUri)
}

export function draftReadyForPaywall(d: ReadingDraft = draft): boolean {
  return (
    draftHasThreePhotos(d) &&
    Boolean(d.solarDate) &&
    d.timeIndex != null &&
    Boolean(d.gender)
  )
}
