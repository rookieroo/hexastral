/**
 * In-memory + AsyncStorage draft for the Xingqi funnel.
 * Photo URIs point at documentDirectory/xingqi-period/* (see period-photos.ts).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'

import { clearAllPeriodPhotos, periodPhotoMap } from './period-photos'
import {
  clearLastReadingPhotoSnapshot,
  loadLastReadingPhotoSnapshot,
} from './reading-photo-stamp'

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
    const snap = await loadLastReadingPhotoSnapshot()
    // Keep prior featureIds when a slot has no local JPEG (palms may carry across Face-only updates).
    draft = {
      palmLeftUri: photos.palm_l,
      palmRightUri: photos.palm_r,
      faceUri: photos.face,
      faceFeatureId: photos.face
        ? prev.faceFeatureId
        : (snap?.faceFeatureId ?? prev.faceFeatureId),
      palmLeftFeatureId: photos.palm_l
        ? prev.palmLeftFeatureId
        : (snap?.palmLeftFeatureId ?? prev.palmLeftFeatureId),
      palmRightFeatureId: photos.palm_r
        ? prev.palmRightFeatureId
        : (snap?.palmRightFeatureId ?? prev.palmRightFeatureId),
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
  const pickUri = async (draftUri: string | undefined, periodUri: string | undefined) => {
    const clean = draftUri?.split('?')[0]
    if (clean) {
      try {
        const info = await FileSystem.getInfoAsync(clean)
        if (info.exists) return clean
      } catch {
        // fall through
      }
    }
    return periodUri
  }
  const snap = await loadLastReadingPhotoSnapshot()
  draft = {
    ...draft,
    palmLeftUri: await pickUri(draft.palmLeftUri, photos.palm_l),
    palmRightUri: await pickUri(draft.palmRightUri, photos.palm_r),
    faceUri: await pickUri(draft.faceUri, photos.face),
    // Backfill featureIds from last seal when missing (Face-only update carries palms).
    faceFeatureId: draft.faceFeatureId ?? snap?.faceFeatureId,
    palmLeftFeatureId: draft.palmLeftFeatureId ?? snap?.palmLeftFeatureId,
    palmRightFeatureId: draft.palmRightFeatureId ?? snap?.palmRightFeatureId,
  }
  // Replacing a slot clears that featureId in patchPart; do not wipe here on hydrate.

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
  return getReadingDraft()
}

/**
 * Prepare New period capture: empty slots + last featureIds (partial).
 * Resumes only when on-disk shots differ from the last sealed stamp (failed extract / mid-edit).
 * Leftovers from the last successful reading are wiped — otherwise processing shows old photos.
 */
export async function prepareNewPeriodCapture(opts?: {
  force?: boolean
}): Promise<ReadingDraft> {
  const snap = await loadLastReadingPhotoSnapshot()

  const resetEmpty = async (): Promise<ReadingDraft> => {
    await clearAllPeriodPhotos()
    const prev = draft
    draft = {
      solarDate: prev.solarDate,
      timeIndex: prev.timeIndex,
      gender: prev.gender,
      city: prev.city,
      horizonMonths: prev.horizonMonths,
      outputKind: 'period_brief',
      updateKind: 'partial',
      partialParts: [],
      faceFeatureId: snap?.faceFeatureId,
      palmLeftFeatureId: snap?.palmLeftFeatureId,
      palmRightFeatureId: snap?.palmRightFeatureId,
    }
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(draft))
    } catch {
      // ignore
    }
    return getReadingDraft()
  }

  if (opts?.force) return resetEmpty()

  const onDisk = await periodPhotoMap()
  const hasShots = Boolean(onDisk.palm_l || onDisk.palm_r || onDisk.face)
  if (!hasShots) return resetEmpty()

  // Bind disk → draft to compare against last seal.
  draft = {
    ...draft,
    palmLeftUri: onDisk.palm_l,
    palmRightUri: onDisk.palm_r,
    faceUri: onDisk.face,
    outputKind: 'period_brief',
    updateKind: 'partial',
    faceFeatureId: onDisk.face ? draft.faceFeatureId : (snap?.faceFeatureId ?? draft.faceFeatureId),
    palmLeftFeatureId: onDisk.palm_l
      ? draft.palmLeftFeatureId
      : (snap?.palmLeftFeatureId ?? draft.palmLeftFeatureId),
    palmRightFeatureId: onDisk.palm_r
      ? draft.palmRightFeatureId
      : (snap?.palmRightFeatureId ?? draft.palmRightFeatureId),
  }
  const changed = await draftChangedParts(getReadingDraft())
  if (changed.length === 0) {
    // Same files as last seal — not an in-progress edit.
    return resetEmpty()
  }

  // Edited slots must re-extract; drop stale featureIds bound to the previous seal.
  if (changed.includes('palm_l')) draft.palmLeftFeatureId = undefined
  if (changed.includes('palm_r')) draft.palmRightFeatureId = undefined
  if (changed.includes('face')) draft.faceFeatureId = undefined

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // ignore
  }
  syncPartialMetaFromChanged(changed)
  return getReadingDraft()
}

/** Parts whose on-device file differs from the last successful reading stamp. */
export async function draftChangedParts(d: ReadingDraft = draft): Promise<CapturePart[]> {
  const { loadLastReadingPhotoSnapshot, stampMapForDraft, stampsEqual } = await import(
    './reading-photo-stamp'
  )
  const snap = await loadLastReadingPhotoSnapshot()
  if (!snap) {
    const parts: CapturePart[] = []
    if (d.palmLeftUri) parts.push('palm_l')
    if (d.palmRightUri) parts.push('palm_r')
    if (d.faceUri) parts.push('face')
    return parts
  }
  const stamps = await stampMapForDraft(d)
  const changed: CapturePart[] = []
  const check = (
    part: CapturePart,
    stampKey: 'palm_l' | 'palm_r' | 'face',
    featureId: string | undefined,
    snapFeatureId: string | undefined
  ) => {
    const cur = stamps[part]
    if (!cur) return
    const prev = snap[stampKey]
    const stampSame = Boolean(prev && stampsEqual(cur, prev))
    const idSame = Boolean(featureId && featureId === snapFeatureId)
    // New JPEG or unbound extract counts as an edit. Matching stamp+id = leftover seal.
    if (!stampSame || !idSame) changed.push(part)
  }
  check('palm_l', 'palm_l', d.palmLeftFeatureId, snap.palmLeftFeatureId)
  check('palm_r', 'palm_r', d.palmRightFeatureId, snap.palmRightFeatureId)
  check('face', 'face', d.faceFeatureId, snap.faceFeatureId)
  return changed
}

/** True when period sandbox has shots that differ from the last sealed reading. */
export async function draftHasInProgressPhotos(d: ReadingDraft = draft): Promise<boolean> {
  const onDisk = await periodPhotoMap()
  if (!onDisk.palm_l && !onDisk.palm_r && !onDisk.face) return false
  const bound: ReadingDraft = {
    ...d,
    palmLeftUri: onDisk.palm_l ?? d.palmLeftUri,
    palmRightUri: onDisk.palm_r ?? d.palmRightUri,
    faceUri: onDisk.face ?? d.faceUri,
  }
  const changed = await draftChangedParts(bound)
  return changed.length > 0
}

export function syncPartialMetaFromChanged(changed: CapturePart[]): void {
  if (changed.length === 0) {
    patchReadingDraft({ updateKind: 'partial', partialParts: [] })
    return
  }
  if (changed.length >= 3) {
    patchReadingDraft({ updateKind: 'full', partialParts: undefined })
    return
  }
  patchReadingDraft({ updateKind: 'partial', partialParts: changed })
}

export function draftHasAnyPhoto(d: ReadingDraft = draft): boolean {
  return Boolean(d.palmLeftUri || d.palmRightUri || d.faceUri)
}

export function draftHasThreePhotos(d: ReadingDraft = draft): boolean {
  return Boolean(d.palmLeftUri && d.palmRightUri && d.faceUri)
}

/** Palms covered by a new JPEG or a prior extract featureId. */
export function draftHasPalmCoverage(d: ReadingDraft = draft): boolean {
  return Boolean(
    (d.palmLeftUri || d.palmLeftFeatureId) && (d.palmRightUri || d.palmRightFeatureId)
  )
}

/** Each modality has either a new on-device photo or a prior featureId. */
export function draftHasFeatureCoverage(d: ReadingDraft = draft): boolean {
  return Boolean(d.faceUri || d.faceFeatureId) && draftHasPalmCoverage(d)
}

/** After first seal: period_brief / partial may submit with ≥1 new photo. */
export function draftAllowsPartial(d: ReadingDraft = draft): boolean {
  return d.outputKind === 'period_brief' || d.updateKind === 'partial'
}

export function draftHasBirthInfo(d: ReadingDraft = draft): boolean {
  return Boolean(d.solarDate) && d.timeIndex != null && Boolean(d.gender)
}

/**
 * Capture CTA / funnel: face JPEG unlocks continue (palms optional).
 */
export function draftPhotoReadyForReading(d: ReadingDraft = draft): boolean {
  return Boolean(d.faceUri)
}

/** Ready to leave capture → paywall / enqueue (face + birth; palms optional). */
export function draftReadyForPaywall(d: ReadingDraft = draft): boolean {
  return draftHasBirthInfo(d) && Boolean(d.faceUri)
}

export function draftUriForPart(part: CapturePart, d: ReadingDraft = draft): string | undefined {
  if (part === 'palm_l') return d.palmLeftUri
  if (part === 'palm_r') return d.palmRightUri
  return d.faceUri
}
