/**
 * useDeclination(lat, lng) — fetch magnetic declination from the server's
 * WMM-2025 grid.
 *
 * Backend: GET /api/feng/declination?lat=&lng=
 *
 * Returns null when the location is outside the V1 grid (caller should fall
 * back to client-side WMM if available, or show the "magnetic only" hint).
 *
 * Used primarily by web Compass; mobile gets declination from
 * `Location.watchHeadingAsync` directly via @zhop/scenario-feng's heading
 * helpers (not in this hook).
 */

import { useCallback, useEffect, useState } from 'react'
import { useFengClient } from '../context'
import { type DeclinationResponse, fengDeclination, unwrap } from '../lib/feng-api'

export interface UseDeclinationResult {
  declination: number | null
  source: 'grid' | 'unknown' | null
  epoch: string | null
  isLoading: boolean
  error: Error | null
}

export function useDeclination(
  lat: number | null | undefined,
  lng: number | null | undefined
): UseDeclinationResult {
  const { client, onError } = useFengClient()
  const [result, setResult] = useState<{
    declination: number | null
    source: 'grid' | 'unknown' | null
    epoch: string | null
  }>({ declination: null, source: null, epoch: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchOnce = useCallback(async () => {
    if (lat == null || lng == null) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await unwrap<DeclinationResponse>(
        await fengDeclination(client).$get({
          query: { lat: String(lat), lng: String(lng) },
        })
      )
      setResult({ declination: data.declination, source: data.source, epoch: data.epoch })
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      onError?.(e)
    } finally {
      setIsLoading(false)
    }
  }, [client, onError, lat, lng])

  useEffect(() => {
    void fetchOnce()
  }, [fetchOnce])

  return { ...result, isLoading, error }
}
