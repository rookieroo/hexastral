/**
 * useSynastryReport — fetch the synastry report for a bond.
 *
 * Backend endpoints:
 *   GET /api/bonds/:id            — full bond detail (includes interpretation)
 *   GET /api/bonds/:id/synastry   — synastry-specific reading (overview, dimensions)
 *
 * Reports are generated lazily on first /bonds/:id/synastry fetch. While
 * generating, the hook returns `isGenerating: true`. Subsequent fetches hit
 * the cached row.
 *
 * Perceived-latency: a session-scoped stale-while-revalidate cache lets a
 * re-opened bond paint its last-seen detail SYNCHRONOUSLY (the 水墨 bloom plays
 * over real content instead of a 1-2s blank hold), while a background refetch
 * reconciles. `prefetchBondReport` warms that cache from the home so even the
 * first open of an active bond is instant.
 */

import type { HexastralClient } from '@zhop/hexastral-client'
import { useCallback, useEffect, useState } from 'react'
import { useKindredClient } from '../context'
import { kindredBonds, unwrap } from '../lib/kindred-bonds-api'
import type { BondDetailData, PairInterpretation, SynastryChapter } from '../types'

// Session-scoped report cache (in-memory only; cleared on reload). Keyed by
// bondId. Written by both the hook's refetch and prefetchBondReport.
const reportCache = new Map<string, BondDetailData>()
// In-flight prefetches, so warming the same bond from two places (home focus +
// row tap) only hits the network once.
const inflightPrefetch = new Map<string, Promise<void>>()

/**
 * Warm the report cache for a bond WITHOUT mounting the hook — call from the
 * home so an already-generated report is ready by the time its row is tapped
 * (kills the "tap → blank → bloom" wait). Best-effort, idempotent GET: skips
 * bonds already cached or in flight, and never caches a 202 (still generating).
 */
export function prefetchBondReport(client: HexastralClient, bondId: string): void {
  if (!bondId || reportCache.has(bondId) || inflightPrefetch.has(bondId)) return
  const run = (async () => {
    try {
      const res = await kindredBonds(client)[':id'].$get({ param: { id: bondId } })
      if (res.status === 202) return
      reportCache.set(bondId, await unwrap<BondDetailData>(res))
    } catch {
      // Prefetch is best-effort — a real open will surface any error.
    } finally {
      inflightPrefetch.delete(bondId)
    }
  })()
  inflightPrefetch.set(bondId, run)
}

export interface UseSynastryReportResult {
  detail: BondDetailData | null
  isLoading: boolean
  isGenerating: boolean
  error: Error | null
  /** Force re-fetch — does not regenerate, just clears local state */
  refetch: () => Promise<void>
  /** Convenience accessor: returns chapters if interpretation includes them */
  chapters: SynastryChapter[] | null
  /**
   * Apply a single purchase to unlock all chapters for this bond. Call AFTER the
   * IAP completes. Returns `'unlocked'` (and refetches), `'needs_purchase'` when
   * the server has no purchase to apply yet (webhook lag / not bought), or
   * `'error'`.
   */
  unlockBond: () => Promise<'unlocked' | 'needs_purchase' | 'error'>
}

export function useSynastryReport(bondId: string | null): UseSynastryReportResult {
  const { client, onError } = useKindredClient()
  // Paint any cached copy on the very first render so the bloom has content to
  // open over (no blank hold). The effect below covers prop-driven id changes.
  const [detail, setDetail] = useState<BondDetailData | null>(() =>
    bondId ? (reportCache.get(bondId) ?? null) : null
  )
  const [isLoading, setIsLoading] = useState<boolean>(bondId != null && !reportCache.has(bondId))
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!bondId) return
    // Revalidate silently when a cached copy is already on screen — no spinner.
    if (!reportCache.has(bondId)) setIsLoading(true)
    setError(null)
    try {
      const res = await kindredBonds(client)[':id'].$get({ param: { id: bondId } })
      if (res.status === 202) {
        // Backend signals generation in progress
        setIsGenerating(true)
        setIsLoading(false)
        return
      }
      const data = await unwrap<BondDetailData>(res)
      reportCache.set(bondId, data)
      setDetail(data)
      setIsGenerating(false)
      setIsLoading(false)
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setIsLoading(false)
      onError?.(e)
    }
  }, [bondId, client, onError])

  const unlockBond = useCallback(async (): Promise<'unlocked' | 'needs_purchase' | 'error'> => {
    if (!bondId) return 'error'
    try {
      const res = await kindredBonds(client)[':id'].unlock.$post({ param: { id: bondId } })
      if (res.status === 402) return 'needs_purchase'
      if (!res.ok) return 'error'
      await refetch()
      return 'unlocked'
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
      return 'error'
    }
  }, [bondId, client, refetch, onError])

  useEffect(() => {
    if (!bondId) {
      setDetail(null)
      setIsLoading(false)
      return
    }
    // Switching to a cached bond paints instantly; to an uncached one clears the
    // previous bond's detail so its stale report can't flash through. Then
    // revalidate either way.
    const cached = reportCache.get(bondId)
    setDetail(cached ?? null)
    setIsLoading(!cached)
    void refetch()
  }, [bondId, refetch])

  return {
    detail,
    isLoading,
    isGenerating,
    error,
    refetch,
    chapters: extractChapters(detail?.interpretation),
    unlockBond,
  }
}

function extractChapters(
  interpretation: PairInterpretation | null | undefined
): SynastryChapter[] | null {
  if (!interpretation?.chapters) return null
  return Array.isArray(interpretation.chapters) ? interpretation.chapters : null
}
