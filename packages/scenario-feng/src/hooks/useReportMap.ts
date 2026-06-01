/**
 * useReportMap — fetch one annotated satellite tile for a finished report.
 *
 * Backend: GET /api/feng/reports/:reportId/maps/:tile
 * Returns base64 PNG in the standard envelope; we expose a data: URI for
 * `<Image source={{ uri }}>`.
 *
 * Caching: each (reportId,tile) pair is fetched once per hook instance, and
 * a process-wide in-memory cache short-circuits subsequent mounts so the
 * report-screen hero swiper does not re-download tiles on tab-switch /
 * navigation. The cache is intentionally simple — report bodies are
 * immutable once generated, so we never need to invalidate.
 */

import { useCallback, useEffect, useState } from 'react'
import { useFengClient } from '../context'
import { loadReportMap } from '../lib/feng-api'
import type { FengAnnotatedTile } from '../types'

const dataUriCache = new Map<string, string>()

function cacheKey(reportId: string, tile: FengAnnotatedTile): string {
  return `${reportId}::${tile}`
}

export interface UseReportMapResult {
  /** data:image/png;base64,... suitable for Image source={{ uri }} */
  dataUri: string | null
  isLoading: boolean
  error: Error | null
}

export function useReportMap(
  reportId: string | null | undefined,
  tile: FengAnnotatedTile
): UseReportMapResult {
  const { client, onError } = useFengClient()
  const cached = reportId ? (dataUriCache.get(cacheKey(reportId, tile)) ?? null) : null
  const [dataUri, setDataUri] = useState<string | null>(cached)
  const [isLoading, setIsLoading] = useState<boolean>(!!reportId && cached === null)
  const [error, setError] = useState<Error | null>(null)

  const fetchOnce = useCallback(async () => {
    if (!reportId) {
      setDataUri(null)
      setIsLoading(false)
      return
    }
    const key = cacheKey(reportId, tile)
    const hit = dataUriCache.get(key)
    if (hit) {
      setDataUri(hit)
      setIsLoading(false)
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const data = await loadReportMap(client, reportId, tile)
      const uri = `data:${data.contentType};base64,${data.base64}`
      dataUriCache.set(key, uri)
      setDataUri(uri)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setDataUri(null)
      onError?.(e)
    } finally {
      setIsLoading(false)
    }
  }, [client, onError, reportId, tile])

  useEffect(() => {
    void fetchOnce()
  }, [fetchOnce])

  return { dataUri, isLoading, error }
}
