/**
 * Opt-in iCloud Documents sync for sealed reading photo snapshots only.
 * Never touches `xingqi-period/` (mid-capture / consent workspace).
 */

import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'

import { getUbiquityDocumentsPath, isSyelIcloudBridgeAvailable } from 'syel-icloud'

import { getIcloudPhotoSyncEnabled } from './icloud-sync-preference'
import {
  getReadingPhotosIndex,
  getReadingPhotosRoot,
  type ReadingPhotosIndex,
  type ReadingPhotosIndexEntry,
  writeReadingPhotosIndex,
} from './reading-photos'

const FOLDER = 'xingqi-readings'
const INDEX_NAME = 'reading-photos-index.json'
const MAX_SNAPSHOT_READINGS = 20

export { getIcloudPhotoSyncEnabled } from './icloud-sync-preference'
export { isSyelIcloudBridgeAvailable }

function fileUrl(path: string): string {
  if (path.startsWith('file://')) return path
  return `file://${path}`
}

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
}

async function ubiquityReadingsRoot(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null
  const docs = await getUbiquityDocumentsPath()
  if (!docs) return null
  return `${docs}${FOLDER}/`
}

async function readIndexAt(root: string): Promise<ReadingPhotosIndex> {
  const path = `${root}${INDEX_NAME}`
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

async function writeIndexAt(root: string, index: ReadingPhotosIndex): Promise<void> {
  await ensureDir(root)
  await FileSystem.writeAsStringAsync(`${root}${INDEX_NAME}`, JSON.stringify(index))
}

async function copyDirContents(fromDir: string, toDir: string): Promise<void> {
  await ensureDir(toDir)
  let names: string[] = []
  try {
    names = await FileSystem.readDirectoryAsync(fromDir)
  } catch {
    return
  }
  for (const name of names) {
    if (name === INDEX_NAME) continue
    const src = `${fromDir}${name}`
    const dest = `${toDir}${name}`
    try {
      const info = await FileSystem.getInfoAsync(src)
      if (!info.exists) continue
      if (info.isDirectory) {
        await copyDirContents(
          src.endsWith('/') ? src : `${src}/`,
          dest.endsWith('/') ? dest : `${dest}/`
        )
      } else {
        const destInfo = await FileSystem.getInfoAsync(dest)
        if (destInfo.exists) {
          await FileSystem.deleteAsync(dest, { idempotent: true })
        }
        await FileSystem.copyAsync({ from: fileUrl(src), to: fileUrl(dest) })
      }
    } catch (err) {
      console.warn('[syel.icloud] copy failed', name, err)
    }
  }
}

async function copyReadingFolder(
  fromRoot: string,
  toRoot: string,
  readingId: string
): Promise<void> {
  const from = `${fromRoot}${readingId}/`
  const to = `${toRoot}${readingId}/`
  try {
    const info = await FileSystem.getInfoAsync(from)
    if (!info.exists) return
    const destInfo = await FileSystem.getInfoAsync(to)
    if (destInfo.exists) {
      await FileSystem.deleteAsync(to, { idempotent: true })
    }
    await ensureDir(to)
    await copyDirContents(from, to)
  } catch (err) {
    console.warn('[syel.icloud] copy reading folder failed', readingId, err)
  }
}

function mergeEntries(
  a: ReadingPhotosIndexEntry[],
  b: ReadingPhotosIndexEntry[]
): ReadingPhotosIndexEntry[] {
  const map = new Map<string, ReadingPhotosIndexEntry>()
  for (const e of [...a, ...b]) {
    const prev = map.get(e.readingId)
    if (!prev || (e.createdAt && prev.createdAt && e.createdAt > prev.createdAt)) {
      map.set(e.readingId, e)
    }
  }
  return [...map.values()]
    .sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))
    .slice(0, MAX_SNAPSHOT_READINGS)
}

/** Push local sealed snapshots → iCloud when opt-in is on. */
export async function syncReadingPhotosToICloudIfEnabled(): Promise<void> {
  if (!(await getIcloudPhotoSyncEnabled())) return
  if (!isSyelIcloudBridgeAvailable()) return

  const localRoot = getReadingPhotosRoot()
  const cloudRoot = await ubiquityReadingsRoot()
  if (!localRoot || !cloudRoot) return

  try {
    const localInfo = await FileSystem.getInfoAsync(localRoot)
    if (!localInfo.exists) return

    await ensureDir(cloudRoot)
    const localIndex = await getReadingPhotosIndex()
    for (const e of localIndex.entries) {
      await copyReadingFolder(localRoot, cloudRoot, e.readingId)
    }
    await writeIndexAt(cloudRoot, localIndex)

    // Evict cloud folders not in the capped index.
    try {
      const names = await FileSystem.readDirectoryAsync(cloudRoot)
      const keep = new Set(localIndex.entries.map((e) => e.readingId))
      for (const name of names) {
        if (name === INDEX_NAME) continue
        if (keep.has(name)) continue
        await FileSystem.deleteAsync(`${cloudRoot}${name}`, { idempotent: true })
      }
    } catch {
      // ignore listing failures
    }
  } catch (err) {
    console.warn('[syel.icloud] push failed', err)
  }
}

/** Remove one reading folder from the ubiquity mirror (archive delete / eviction). */
export async function removeReadingPhotosFromICloudIfEnabled(readingId: string): Promise<void> {
  if (!readingId) return
  if (!(await getIcloudPhotoSyncEnabled())) return
  const cloudRoot = await ubiquityReadingsRoot()
  if (!cloudRoot) return
  try {
    await FileSystem.deleteAsync(`${cloudRoot}${readingId}`, { idempotent: true })
    const index = await readIndexAt(cloudRoot)
    const next = index.entries.filter((e) => e.readingId !== readingId)
    if (next.length !== index.entries.length) {
      await writeIndexAt(cloudRoot, { version: 1, entries: next })
    }
  } catch (err) {
    console.warn('[syel.icloud] remove failed', readingId, err)
  }
}

/**
 * Pull ubiquity sealed snapshots into local storage when local is missing the folder.
 * Merges indexes by readingId (newer createdAt wins), caps at 20.
 */
export async function pullReadingPhotosFromICloudIfEnabled(): Promise<void> {
  if (!(await getIcloudPhotoSyncEnabled())) return
  if (!isSyelIcloudBridgeAvailable()) return

  const localRoot = getReadingPhotosRoot()
  const cloudRoot = await ubiquityReadingsRoot()
  if (!localRoot || !cloudRoot) return

  try {
    const cloudInfo = await FileSystem.getInfoAsync(cloudRoot)
    if (!cloudInfo.exists) return

    await ensureDir(localRoot)
    const localIndex = await getReadingPhotosIndex()
    const cloudIndex = await readIndexAt(cloudRoot)
    const localIds = new Set(localIndex.entries.map((e) => e.readingId))

    for (const e of cloudIndex.entries) {
      const dest = `${localRoot}${e.readingId}/`
      let missing = !localIds.has(e.readingId)
      if (!missing) {
        try {
          const info = await FileSystem.getInfoAsync(dest)
          missing = !info.exists
        } catch {
          missing = true
        }
      }
      if (missing) {
        await copyReadingFolder(cloudRoot, localRoot, e.readingId)
      }
    }

    const merged = mergeEntries(localIndex.entries, cloudIndex.entries)
    await writeReadingPhotosIndex({ version: 1, entries: merged })

    // Cap-evict local extras.
    const keep = new Set(merged.map((e) => e.readingId))
    try {
      const names = await FileSystem.readDirectoryAsync(localRoot)
      for (const name of names) {
        if (name === INDEX_NAME) continue
        if (keep.has(name)) continue
        await FileSystem.deleteAsync(`${localRoot}${name}`, { idempotent: true })
      }
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('[syel.icloud] pull failed', err)
  }
}

/** Wipe the ubiquity `xingqi-readings/` mirror (account delete / clear photos). */
export async function wipeIcloudReadingPhotos(): Promise<void> {
  if (!isSyelIcloudBridgeAvailable()) return
  const cloudRoot = await ubiquityReadingsRoot()
  if (!cloudRoot) return
  try {
    const info = await FileSystem.getInfoAsync(cloudRoot)
    if (info.exists) {
      await FileSystem.deleteAsync(cloudRoot, { idempotent: true })
    }
  } catch (err) {
    console.warn('[syel.icloud] wipe failed', err)
  }
}
