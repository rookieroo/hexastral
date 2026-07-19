/**
 * Current-period photo workspace — device sandbox only (documentDirectory).
 * Never uploaded to R2. Privacy appendix: source images are request-ephemeral
 * on the server; this store is on-device so the user can view / replace slots.
 *
 * Replace deletes the previous file for that part. App Store builds must use
 * documentDirectory (survives updates) — not ImagePicker temp URIs.
 */

import * as FileSystem from 'expo-file-system/legacy'

import type { CapturePart } from './reading-draft'

const PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']

function periodDir(): string | null {
  const root = FileSystem.documentDirectory
  if (!root) return null
  return `${root}xingqi-period/`
}

function destPath(part: CapturePart, ext: string): string | null {
  const dir = periodDir()
  if (!dir) return null
  return `${dir}${part}.${ext}`
}

function extFromUri(uri: string): string {
  const clean = uri.split('?')[0] ?? uri
  const m = /\.([a-zA-Z0-9]+)$/.exec(clean)
  const raw = (m?.[1] ?? 'jpg').toLowerCase()
  if (raw === 'jpeg' || raw === 'jpg') return 'jpg'
  if (raw === 'png' || raw === 'webp' || raw === 'heic' || raw === 'heif') return raw
  return 'jpg'
}

async function ensureDir(): Promise<string> {
  const dir = periodDir()
  if (!dir) throw new Error('storage_unavailable')
  const info = await FileSystem.getInfoAsync(dir)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  }
  return dir
}

/** Delete all known extensions for a slot (safe before overwrite). */
async function deletePartFiles(part: CapturePart): Promise<void> {
  const dir = periodDir()
  if (!dir) return
  for (const ext of ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']) {
    const path = `${dir}${part}.${ext}`
    try {
      const info = await FileSystem.getInfoAsync(path)
      if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true })
    } catch {
      // ignore
    }
  }
}

/**
 * Copy a picker/camera URI into the period sandbox and return the durable file URI.
 * Overwrites any previous file for this part.
 */
export async function persistPeriodPhoto(part: CapturePart, sourceUri: string): Promise<string> {
  await ensureDir()
  const ext = extFromUri(sourceUri)
  const dest = destPath(part, ext)
  if (!dest) throw new Error('storage_unavailable')

  await deletePartFiles(part)

  // Atomic-ish: copy to staging then move
  const staging = `${dest}.staging`
  try {
    await FileSystem.deleteAsync(staging, { idempotent: true })
  } catch {
    // ignore
  }
  await FileSystem.copyAsync({ from: sourceUri, to: staging })
  await FileSystem.moveAsync({ from: staging, to: dest })
  return dest
}

/** Resolve on-disk URI if the period photo still exists. */
export async function resolvePeriodPhotoUri(part: CapturePart): Promise<string | undefined> {
  const dir = periodDir()
  if (!dir) return undefined
  for (const ext of ['jpg', 'png', 'webp', 'heic', 'heif', 'jpeg']) {
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

export async function deletePeriodPhoto(part: CapturePart): Promise<void> {
  await deletePartFiles(part)
}

/** Wipe all period photos (sign-out / withdraw biometric consent). */
export async function clearAllPeriodPhotos(): Promise<void> {
  const dir = periodDir()
  if (!dir) return
  try {
    const info = await FileSystem.getInfoAsync(dir)
    if (info.exists) await FileSystem.deleteAsync(dir, { idempotent: true })
  } catch {
    for (const part of PARTS) await deletePartFiles(part)
  }
}

export async function periodPhotoMap(): Promise<Partial<Record<CapturePart, string>>> {
  const out: Partial<Record<CapturePart, string>> = {}
  for (const part of PARTS) {
    const uri = await resolvePeriodPhotoUri(part)
    if (uri) out[part] = uri
  }
  return out
}

export function captureHrefForPart(part: CapturePart): '/capture' | '/capture/right' | '/capture/face' {
  if (part === 'palm_r') return '/capture/right'
  if (part === 'face') return '/capture/face'
  return '/capture'
}
