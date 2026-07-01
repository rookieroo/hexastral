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
 * navigation. Report bodies are immutable once generated, so entries never need
 * invalidation — but the cache is LRU-capped so a long session that browses many
 * reports (× 3 base64 tiles each) can't grow the data-URI store without bound.
 */

import { useCallback, useEffect, useState } from 'react'
import { useFengClient } from '../context'
import { loadReportMap } from '../lib/feng-api'
import type { FengAnnotatedTile } from '../types'

// ~30 tiles ≈ 10 reports × 3 tiles of resident base64 — plenty for a session's
// back-and-forth while bounding memory. Map preserves insertion order, so the
// first key is the least-recently-set (we re-insert on hit to refresh recency).
const MAX_CACHED_TILES = 30
const dataUriCache = new Map<string, string>()

function cacheKey(reportId: string, tile: FengAnnotatedTile): string {
  return `${reportId}::${tile}`
}

function cacheGet(key: string): string | undefined {
  const hit = dataUriCache.get(key)
  if (hit !== undefined) {
    // Refresh recency: move to the newest slot.
    dataUriCache.delete(key)
    dataUriCache.set(key, hit)
  }
  return hit
}

function cacheSet(key: string, uri: string): void {
  if (dataUriCache.has(key)) dataUriCache.delete(key)
  dataUriCache.set(key, uri)
  while (dataUriCache.size > MAX_CACHED_TILES) {
    const oldest = dataUriCache.keys().next().value
    if (oldest === undefined) break
    dataUriCache.delete(oldest)
  }
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
  const cached = reportId ? (cacheGet(cacheKey(reportId, tile)) ?? null) : null
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
    const hit = cacheGet(key)
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
      cacheSet(key, uri)
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
