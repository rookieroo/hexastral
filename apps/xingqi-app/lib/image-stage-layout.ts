/**
 * Map normalized image coords (0..1, top-left origin) to stage pixels when the
 * photo is letterboxed with `contain` inside a square stage.
 */

import { useEffect, useState } from 'react'
import { Image } from 'react-native'

export type ImageSize = { w: number; h: number }

export type StageRect = { x: number; y: number; w: number; h: number }

/** Pixel rect of the visible image inside a contain-fit stage. */
export function containImageRect(stageW: number, stageH: number, image: ImageSize): StageRect {
  if (stageW <= 0 || stageH <= 0 || image.w <= 0 || image.h <= 0) {
    return { x: 0, y: 0, w: stageW, h: stageH }
  }
  const scale = Math.min(stageW / image.w, stageH / image.h)
  const w = image.w * scale
  const h = image.h * scale
  return {
    x: (stageW - w) / 2,
    y: (stageH - h) / 2,
    w,
    h,
  }
}

export function mapNormToContainStage(
  nx: number,
  ny: number,
  stageW: number,
  stageH: number,
  image: ImageSize
): { x: number; y: number } {
  const rect = containImageRect(stageW, stageH, image)
  return {
    x: rect.x + nx * rect.w,
    y: rect.y + ny * rect.h,
  }
}

/** Natural pixel size for a local/remote photo URI (letterbox mapping). */
export function usePhotoImageSize(uri: string | undefined): ImageSize | null {
  const [size, setSize] = useState<ImageSize | null>(null)
  useEffect(() => {
    if (!uri) {
      setSize(null)
      return
    }
    let cancelled = false
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) setSize({ w, h })
      },
      () => {
        if (!cancelled) setSize(null)
      }
    )
    return () => {
      cancelled = true
    }
  }, [uri])
  return size
}
