/**
 * In-memory + AsyncStorage draft for the FaceOracle funnel:
 * consent → three photos → birth → paywall → reading.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'faceoracle_reading_draft_v1'

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
  updateKind?: 'full' | 'partial'
  partialParts?: CapturePart[]
  outputKind?: 'oneshot' | 'period_brief' | 'deep'
}

let memory: ReadingDraft = {}

export function getReadingDraft(): ReadingDraft {
  return { ...memory }
}

export function patchReadingDraft(patch: Partial<ReadingDraft>): ReadingDraft {
  memory = { ...memory, ...patch }
  void AsyncStorage.setItem(KEY, JSON.stringify(memory))
  return getReadingDraft()
}

export function clearReadingDraft(): void {
  memory = {}
  void AsyncStorage.removeItem(KEY)
}

export async function hydrateReadingDraft(): Promise<ReadingDraft> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        memory = parsed as ReadingDraft
      }
    }
  } catch {
    // keep memory
  }
  return getReadingDraft()
}

export function draftHasThreePhotos(d: ReadingDraft): boolean {
  return Boolean(d.palmLeftUri && d.palmRightUri && d.faceUri)
}

export function draftHasBirth(d: ReadingDraft): boolean {
  return (
    typeof d.solarDate === 'string' &&
    d.solarDate.length > 0 &&
    typeof d.timeIndex === 'number' &&
    (d.gender === '男' || d.gender === '女')
  )
}

export function draftReadyForPaywall(d: ReadingDraft): boolean {
  return draftHasThreePhotos(d) && draftHasBirth(d)
}
