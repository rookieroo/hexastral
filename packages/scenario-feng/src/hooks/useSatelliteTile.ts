/**
 * useSatelliteTile — fetch a Mapbox satellite preview for the facing screen.
 *
 * Backend: GET /api/feng/maps/preview?lat=&lng=&zoom=&size=
 * Returns base64 PNG in the standard envelope; we expose a data: URI for <Image>.
 */

import { useCallback, useEffect, useState } from 'react'
import { useFengClient } from '../context'
import { fengMaps, type MapPreviewResponse, unwrap } from '../lib/feng-api'

export interface UseSatelliteTileResult {
  /** data:image/png;base64,... suitable for Image source={{ uri }} */
  uri: string | null
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useSatelliteTile(
  lat: number | null | undefined,
  lng: number | null | undefined,
  options?: { zoom?: number; size?: number }
): UseSatelliteTileResult {
  const { client, onError } = useFengClient()
  const [uri, setUri] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const zoom = options?.zoom ?? 17
  const size = options?.size ?? 640

  const fetchOnce = useCallback(async () => {
    if (lat == null || lng == null) {
      setUri(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await unwrap<MapPreviewResponse>(
        await fengMaps(client).preview.$get({
          query: {
            lat: String(lat),
            lng: String(lng),
            zoom: String(zoom),
            size: String(size),
          },
        })
      )
      setUri(`data:${data.contentType};base64,${data.base64}`)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      if (__DEV__) {
        console.warn('[useSatelliteTile]', e.message)
      }
      setError(e)
      setUri(null)
      onError?.(e)
    } finally {
      setIsLoading(false)
    }
  }, [client, onError, lat, lng, size, zoom])

  useEffect(() => {
    void fetchOnce()
  }, [fetchOnce])

  return { uri, isLoading, error, refetch: fetchOnce }
}
