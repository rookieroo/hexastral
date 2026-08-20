/**
 * Per-reading photo snapshots — frozen JPEGs for Locus Hero / archive.
 * Live period slots may be overwritten; snapshots are keyed by readingId.
 */

import * as FileSystem from 'expo-file-system/legacy'
import { resolvePeriodPhotoUri } from './period-photos'
import type { CapturePart } from './reading-draft'

const PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']
const MAX_SNAPSHOT_READINGS = 20

export type ReadingPhotosIndexEntry = {
  readingId: string
  createdAt: string
  parts: Partial<Record<CapturePart, string>>
}

export type ReadingPhotosIndex = {
  version: 1
  entries: ReadingPhotosIndexEntry[]
}

function readingsRoot(): string | null {
  const root = FileSystem.documentDirectory
  if (!root) return null
  return `${root}xingqi-readings/`
}

export function getReadingPhotosRoot(): string | null {
  return readingsRoot()
}

function indexPath(): string | null {
  const root = readingsRoot()
  return root ? `${root}reading-photos-index.json` : null
}

function readingDir(readingId: string): string | null {
  const root = readingsRoot()
  return root ? `${root}${readingId}/` : null
}

async function ensureReadingsRoot(): Promise<string> {
  const dir = readingsRoot()
  if (!dir) throw new Error('storage_unavailable')
  const info = await FileSystem.getInfoAsync(dir)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
  return dir
}

async function readIndex(): Promise<ReadingPhotosIndex> {
  const path = indexPath()
  if (!path) return { version: 1, entries: [] }
  try {
    const info = await FileSystem.getInfoAsync(path)
    if (!info.exists) return { version: 1, entries: [] }
    const raw = await FileSystem.readAsStringAsync(path)
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as ReadingPhotosIndex).entries)
    ) {
      return parsed as ReadingPhotosIndex
    }
  } catch {
    // ignore
  }
  return { version: 1, entries: [] }
}

async function writeIndex(index: ReadingPhotosIndex): Promise<void> {
  const path = indexPath()
  if (!path) return
  await ensureReadingsRoot()
  await FileSystem.writeAsStringAsync(path, JSON.stringify(index))
}

export async function getReadingPhotosIndex(): Promise<ReadingPhotosIndex> {
  return readIndex()
}

export async function writeReadingPhotosIndex(index: ReadingPhotosIndex): Promise<void> {
  await writeIndex(index)
}

/** Copy current period photos into a reading-scoped folder. */
export async function snapshotReadingPhotos(readingId: string): Promise<void> {
  if (!readingId) return
  await ensureReadingsRoot()
  const dir = readingDir(readingId)
  if (!dir) return

  const info = await FileSystem.getInfoAsync(dir)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }

  const parts: Partial<Record<CapturePart, string>> = {}
  for (const part of PARTS) {
    const src = await resolvePeriodPhotoUri(part)
    if (!src) continue
    const dest = `${dir}${part}.jpg`
    try {
      await FileSystem.copyAsync({ from: src, to: dest })
      parts[part] = dest
    } catch (err) {
      console.warn('[xingqi.reading-photos] copy_failed', part, err)
    }
  }

  const index = await readIndex()
  const filtered = index.entries.filter((e) => e.readingId !== readingId)
  filtered.unshift({
    readingId,
    createdAt: new Date().toISOString(),
    parts,
  })
  const trimmed = filtered.slice(0, MAX_SNAPSHOT_READINGS)
  await writeIndex({ version: 1, entries: trimmed })

  for (const stale of filtered.slice(MAX_SNAPSHOT_READINGS)) {
    await deleteReadingPhotoFolder(stale.readingId)
  }
}

export async function photoUriForReading(
  readingId: string,
  part: CapturePart
): Promise<string | undefined> {
  const dir = readingDir(readingId)
  if (!dir) return undefined
  for (const ext of ['jpg', 'jpeg', 'png']) {
    const path = `${dir}${part}.${ext}`
    try {
      const info = await FileSystem.getInfoAsync(path)
      if (info.exists) return path
    } catch {
      // try next
    }
  }
  return undefined
}

export async function deleteReadingPhotoFolder(readingId: string): Promise<void> {
  const dir = readingDir(readingId)
  if (!dir) return
  try {
    const info = await FileSystem.getInfoAsync(dir)
    if (info.exists) await FileSystem.deleteAsync(dir, { idempotent: true })
  } catch {
    // ignore
  }
  const index = await readIndex()
  const next = index.entries.filter((e) => e.readingId !== readingId)
  if (next.length !== index.entries.length) {
    await writeIndex({ version: 1, entries: next })
  }
  try {
    const { removeReadingPhotosFromICloudIfEnabled } = await import('./icloud-sync')
    await removeReadingPhotosFromICloudIfEnabled(readingId)
  } catch {
    // Native bridge may be absent
  }
}

/** Wipe all sealed reading photo folders + index (sign-out / consent / delete account). */
export async function clearAllReadingPhotos(): Promise<void> {
  const root = readingsRoot()
  if (!root) return
  try {
    const info = await FileSystem.getInfoAsync(root)
    if (info.exists) await FileSystem.deleteAsync(root, { idempotent: true })
  } catch {
    const index = await readIndex()
    for (const e of index.entries) {
      await deleteReadingPhotoFolder(e.readingId)
    }
    await writeIndex({ version: 1, entries: [] })
  }
}

/** Resolve snapshot URI, falling back to live period slot for latest reading only. */
export async function resolveReadingPhotoUri(
  readingId: string | undefined,
  part: CapturePart,
  opts?: { fallbackLive?: boolean }
): Promise<string | undefined> {
  if (readingId) {
    const snap = await photoUriForReading(readingId, part)
    if (snap) return snap
  }
  if (opts?.fallbackLive) {
    return resolvePeriodPhotoUri(part)
  }
  return undefined
}

/**
 * Prefill live period sandbox from a reading snapshot (New period carry).
 * Plain file copy in parallel — snapshots are already JPEG; skip ImageManipulator.
 */
export async function copyReadingSnapshotToPeriod(readingId: string): Promise<void> {
  if (!readingId) return
  const { persistPeriodPhotoCopy } = await import('./period-photos')
  await Promise.all(
    PARTS.map(async (part) => {
      const src = await photoUriForReading(readingId, part)
      if (!src) return
      try {
        await persistPeriodPhotoCopy(part, src)
      } catch (err) {
        console.warn('[xingqi.reading-photos] carry_failed', part, err)
      }
    })
  )
}

/**
 * Instant carry: bind draft URIs to reading snapshots (known paths, no disk scan).
 * Mirrors into period sandbox in the background so later hydrate stays consistent.
 */
export function bindCarryFromReading(readingId: string): {
  palm_l?: string
  palm_r?: string
  face?: string
} {
  const dir = readingDir(readingId)
  if (!dir) return {}
  const uris = {
    palm_l: `${dir}palm_l.jpg`,
    palm_r: `${dir}palm_r.jpg`,
    face: `${dir}face.jpg`,
  }
  void copyReadingSnapshotToPeriod(readingId)
  return uris
}
