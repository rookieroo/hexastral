/**
 * useUploadFloorplan — upload one floor-plan image (户型图) and get its R2 key.
 *
 * Backend: POST /api/feng/maps/floorplan (base64 body, EXIF stripped server-side).
 *
 * Returns `upload(base64, contentType)`; the new-site flow calls it per picked
 * image, collects the keys, and stores them in the draft for createSite.
 */

import { useCallback } from 'react'
import { useFengClient } from '../context'
import { uploadFloorplan } from '../lib/feng-api'

export type FloorplanContentType = 'image/png' | 'image/jpeg' | 'image/webp'

export function useUploadFloorplan(): (
  base64: string,
  contentType: FloorplanContentType
) => Promise<string> {
  const { client, onError } = useFengClient()
  return useCallback(
    async (base64: string, contentType: FloorplanContentType): Promise<string> => {
      try {
        const { key } = await uploadFloorplan(client, base64, contentType)
        return key
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        onError?.(e)
        throw e
      }
    },
    [client, onError]
  )
}
