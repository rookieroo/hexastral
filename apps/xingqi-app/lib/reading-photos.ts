/**
 * Per-reading photo snapshots — frozen JPEGs for Locus Hero / archive.
 * Live period slots may be overwritten; snapshots are keyed by readingId.
 */

import * as FileSystem from 'expo-file-system/legacy'

import type { CapturePart } from './reading-draft'
import { resolvePeriodPhotoUri } from './period-photos'

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

  // Phase 2: mirror to iCloud Documents when user opts in (see icloud-sync-preference.ts).
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
