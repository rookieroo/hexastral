/**
 * Which capture parts have photos — used to hide empty palm ghosts on archive / annotation.
 */

import type { CapturePart } from '@/lib/reading-draft'

export const ALL_CAPTURE_PARTS: CapturePart[] = ['palm_l', 'palm_r', 'face']

/** Parts that currently have a resolvable photo URI (skip empty ghosts). */
export function partsWithPhotoUris(
  uris: Partial<Record<CapturePart, string>> | null | undefined
): CapturePart[] {
  if (!uris) return []
  return ALL_CAPTURE_PARTS.filter((p) => Boolean(uris[p]))
}
