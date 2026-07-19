/**
 * Local photo stamps vs last successful reading — client preflight so we never
 * hit extract/enqueue when photos are unchanged (server would 409 features_unchanged).
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'

import type { CapturePart, ReadingDraft } from './reading-draft'

const SNAP_KEY = 'xingqi_last_reading_photo_snap_v1'

export type PhotoStamp = {
  /** File modificationTime (epoch seconds) from FileSystem, or 0 if unknown. */
  mtime: number
  size: number
}

export type ReadingPhotoSnapshot = {
  palm_l: PhotoStamp
  palm_r: PhotoStamp
  face: PhotoStamp
  faceFeatureId?: string
  palmLeftFeatureId?: string
  palmRightFeatureId?: string
  readingId?: string
  at: string
}

async function stampForUri(uri: string | undefined): Promise<PhotoStamp | null> {
  if (!uri) return null
  try {
    const info = await FileSystem.getInfoAsync(uri)
    if (!info.exists || info.isDirectory) return null
    const mtime =
      'modificationTime' in info && typeof info.modificationTime === 'number'
        ? info.modificationTime
        : 0
    const size = 'size' in info && typeof info.size === 'number' ? info.size : 0
    return { mtime, size }
  } catch {
    return null
  }
}

function stampsEqual(a: PhotoStamp, b: PhotoStamp): boolean {
  // Prefer mtime+size; if mtime is 0 on both, size alone is a weak signal.
  if (a.mtime > 0 && b.mtime > 0) {
    return a.mtime === b.mtime && a.size === b.size
  }
  return a.size > 0 && a.size === b.size
}

export async function loadLastReadingPhotoSnapshot(): Promise<ReadingPhotoSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAP_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as ReadingPhotoSnapshot
  } catch {
    return null
  }
}

/** Call after a reading succeeds — bind the on-device files + feature ids used. */
export async function saveLastReadingPhotoSnapshot(opts: {
  draft: ReadingDraft
  readingId: string
}): Promise<void> {
  const [palm_l, palm_r, face] = await Promise.all([
    stampForUri(opts.draft.palmLeftUri),
    stampForUri(opts.draft.palmRightUri),
    stampForUri(opts.draft.faceUri),
  ])
  if (!palm_l || !palm_r || !face) return
  const snap: ReadingPhotoSnapshot = {
    palm_l,
    palm_r,
    face,
    faceFeatureId: opts.draft.faceFeatureId,
    palmLeftFeatureId: opts.draft.palmLeftFeatureId,
    palmRightFeatureId: opts.draft.palmRightFeatureId,
    readingId: opts.readingId,
    at: new Date().toISOString(),
  }
  try {
    await AsyncStorage.setItem(SNAP_KEY, JSON.stringify(snap))
  } catch {
    // ignore
  }
}

export async function clearLastReadingPhotoSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SNAP_KEY)
  } catch {
    // ignore
  }
}

/**
 * True when local period photos match the last successful reading's files
 * (mtime+size) and/or the same feature ids are still bound.
 */
export async function localPhotosUnchangedSinceLastReading(
  draft: ReadingDraft
): Promise<boolean> {
  const snap = await loadLastReadingPhotoSnapshot()
  if (!snap) return false

  const idsMatch =
    Boolean(draft.faceFeatureId) &&
    Boolean(draft.palmLeftFeatureId) &&
    Boolean(draft.palmRightFeatureId) &&
    draft.faceFeatureId === snap.faceFeatureId &&
    draft.palmLeftFeatureId === snap.palmLeftFeatureId &&
    draft.palmRightFeatureId === snap.palmRightFeatureId

  if (idsMatch) return true

  const [palm_l, palm_r, face] = await Promise.all([
    stampForUri(draft.palmLeftUri),
    stampForUri(draft.palmRightUri),
    stampForUri(draft.faceUri),
  ])
  if (!palm_l || !palm_r || !face) return false

  return (
    stampsEqual(palm_l, snap.palm_l) &&
    stampsEqual(palm_r, snap.palm_r) &&
    stampsEqual(face, snap.face)
  )
}

export async function stampMapForDraft(
  draft: ReadingDraft
): Promise<Partial<Record<CapturePart, PhotoStamp>>> {
  const out: Partial<Record<CapturePart, PhotoStamp>> = {}
  const pairs: Array<[CapturePart, string | undefined]> = [
    ['palm_l', draft.palmLeftUri],
    ['palm_r', draft.palmRightUri],
    ['face', draft.faceUri],
  ]
  for (const [part, uri] of pairs) {
    const s = await stampForUri(uri)
    if (s) out[part] = s
  }
  return out
}
