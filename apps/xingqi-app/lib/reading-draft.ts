/**
 * In-memory + AsyncStorage draft for the Xingqi funnel.
 * Photo URIs point at documentDirectory/xingqi-period/* (see period-photos.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

import { clearAllPeriodPhotos, periodPhotoMap } from './period-photos'
import { clearLastReadingPhotoSnapshot } from './reading-photo-stamp'

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

/**
 * Clear funnel draft. By default keeps on-device period photos so home icons
 * can still open view/replace. Pass wipePhotos after sign-out / consent revoke.
 */
export async function clearReadingDraft(opts?: { wipePhotos?: boolean }): Promise<void> {
  if (opts?.wipePhotos) {
    draft = {}
    await clearAllPeriodPhotos()
    await clearLastReadingPhotoSnapshot()
  } else {
    const photos = await periodPhotoMap()
    const prev = draft
    draft = {
      palmLeftUri: photos.palm_l,
      palmRightUri: photos.palm_r,
      faceUri: photos.face,
      // Preserve feature IDs until the corresponding photo is replaced.
      faceFeatureId: photos.face ? prev.faceFeatureId : undefined,
      palmLeftFeatureId: photos.palm_l ? prev.palmLeftFeatureId : undefined,
      palmRightFeatureId: photos.palm_r ? prev.palmRightFeatureId : undefined,
      solarDate: prev.solarDate,
      timeIndex: prev.timeIndex,
      gender: prev.gender,
      city: prev.city,
      horizonMonths: prev.horizonMonths,
    }
  }
  try {
    if (opts?.wipePhotos) await AsyncStorage.removeItem(KEY)
    else await AsyncStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
}

/** Reconcile draft photo URIs with files that actually exist on disk. */
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

  const photos = await periodPhotoMap()
  draft = {
    ...draft,
    palmLeftUri: photos.palm_l,
    palmRightUri: photos.palm_r,
    faceUri: photos.face,
  }
  // Drop stale feature ids when the file is gone
  if (!photos.palm_l) draft.palmLeftFeatureId = undefined
  if (!photos.palm_r) draft.palmRightFeatureId = undefined
  if (!photos.face) draft.faceFeatureId = undefined

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
  return getReadingDraft()
}

export function draftHasThreePhotos(d: ReadingDraft = draft): boolean {
  return Boolean(d.palmLeftUri && d.palmRightUri && d.faceUri)
}

export function draftReadyForPaywall(d: ReadingDraft = draft): boolean {
  return draftHasThreePhotos(d) && Boolean(d.solarDate) && d.timeIndex != null && Boolean(d.gender)
}

export function draftUriForPart(part: CapturePart, d: ReadingDraft = draft): string | undefined {
  if (part === 'palm_l') return d.palmLeftUri
  if (part === 'palm_r') return d.palmRightUri
  return d.faceUri
}
