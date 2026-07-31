/**
 * useSynastryReport — fetch the synastry report for a bond.
 *
 * Backend endpoints:
 *   GET /api/bonds/:id            — full bond detail (includes interpretation)
 *   POST /api/bonds/:id/chapters/continue — sync-generate one missing chapter
 *
 * Progressive fill is client-driven: after the shell lands, the hook calls
 * `chapters/continue` until all six chapters are present (waitUntil alone is
 * unreliable under LLM latency).
 */

import type { HexastralClient } from '@zhop/hexastral-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useKindredClient } from '../context'
import { kindredBonds, unwrap } from '../lib/kindred-bonds-api'
import type { BondDetailData, PairInterpretation, SynastryChapter } from '../types'

// Progressive fill: continue cadence. Each continue awaits one LLM chapter
// (~10–40s); budget covers remaining five + retries when the server is busy.
const CHAPTER_CONTINUE_GAP_MS = 400
const CHAPTER_CONTINUE_MAX = 12

// Session-scoped report cache (in-memory only; cleared on reload). Keyed by
// bondId. Written by both the hook's refetch and prefetchBondReport.
const reportCache = new Map<string, BondDetailData>()
// In-flight prefetches, so warming the same bond from two places (home focus +
// row tap) only hits the network once.
const inflightPrefetch = new Map<string, Promise<void>>()

/** Drop session report cache (account wipe / sign-out). */
export function clearBondReportCache(): void {
  reportCache.clear()
  inflightPrefetch.clear()
}

/**
 * Warm the report cache for a bond WITHOUT mounting the hook — call from the
 * home so an already-generated report is ready by the time its row is tapped
 * (kills the "tap → blank → bloom" wait). Best-effort, idempotent GET: skips
 * bonds already cached or in flight, and never caches a 202 (still generating).
 */
export function prefetchBondReport(
  client: HexastralClient,
  bondId: string,
  viewerLocale?: string
): void {
  if (!bondId || reportCache.has(bondId) || inflightPrefetch.has(bondId)) return
  const run = (async () => {
    try {
      const res = await kindredBonds(client)[':id'].$get({
        param: { id: bondId },
        query: { lc: viewerLocale },
      })
      if (res.status === 202) return
      const data = await unwrap<BondDetailData>(res)
      reportCache.set(bondId, data)
    } catch {
      // Best-effort warm — ignore.
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
  chaptersPending: boolean
  refetch: () => Promise<void>
  /**
   * Reset the progressive-fill budget and re-run GET + continue. Call when the
   * screen regains focus while `chaptersPending` is still true.
   */
  resumeChapterPoll: () => void
  chapters: SynastryChapter[] | null
  unlockBond: () => Promise<'unlocked' | 'needs_purchase' | 'error'>
  relocalize: (lc: string) => Promise<'relocalized' | 'needs_pro' | 'quota' | 'error'>
}

export function useSynastryReport(
  bondId: string | null | undefined,
  viewerLocale?: string
): UseSynastryReportResult {
  const { client, onError } = useKindredClient()
  const [detail, setDetail] = useState<BondDetailData | null>(() =>
    bondId ? (reportCache.get(bondId) ?? null) : null
  )
  const [isLoading, setIsLoading] = useState<boolean>(bondId != null && !reportCache.has(bondId))
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const continueTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const continueCount = useRef(0)
  const continueInFlight = useRef(false)
  const clearContinue = useCallback(() => {
    if (continueTimer.current) {
      clearTimeout(continueTimer.current)
      continueTimer.current = null
    }
  }, [])

  const scheduleContinue = useCallback(
    (fn: () => void, delayMs = CHAPTER_CONTINUE_GAP_MS) => {
      clearContinue()
      continueTimer.current = setTimeout(fn, delayMs)
    },
    [clearContinue]
  )

  const runContinue = useCallback(async () => {
    if (!bondId || continueInFlight.current) return
    if (continueCount.current >= CHAPTER_CONTINUE_MAX) return
    continueInFlight.current = true
    continueCount.current += 1
    try {
      const res = await kindredBonds(client)[':id'].chapters.continue.$post({
        param: { id: bondId },
      })
      if (!res.ok) {
        // Transient failure — retry after a gap while budget remains.
        if (continueCount.current < CHAPTER_CONTINUE_MAX) {
          scheduleContinue(() => {
            void runContinue()
          }, 2000)
        }
        return
      }
      const payload = await unwrap<{
        chaptersPending: boolean
        chapterCount: number
        generatedKind: string | null
        busy?: boolean
      }>(res)

      if (payload.busy) {
        // waitUntil still holding the lock — retry shortly.
        scheduleContinue(() => {
          void runContinue()
        }, 1500)
        return
      }

      // Re-GET so gated interpretation / skeletons refresh with the new chapter.
      const getRes = await kindredBonds(client)[':id'].$get({
        param: { id: bondId },
        query: { lc: viewerLocale },
      })
      if (getRes.ok) {
        const data = await unwrap<BondDetailData>(getRes)
        reportCache.set(bondId, data)
        setDetail(data)
        if (data.chaptersPending && continueCount.current < CHAPTER_CONTINUE_MAX) {
          scheduleContinue(() => {
            void runContinue()
          })
        } else {
          continueCount.current = 0
        }
        return
      }

      if (payload.chaptersPending && continueCount.current < CHAPTER_CONTINUE_MAX) {
        scheduleContinue(() => {
          void runContinue()
        })
      }
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
      if (continueCount.current < CHAPTER_CONTINUE_MAX) {
        scheduleContinue(() => {
          void runContinue()
        }, 2500)
      }
    } finally {
      continueInFlight.current = false
    }
  }, [bondId, client, onError, viewerLocale, scheduleContinue])

  const refetch = useCallback(async () => {
    if (!bondId) return
    if (!reportCache.has(bondId)) setIsLoading(true)
    setError(null)
    try {
      const res = await kindredBonds(client)[':id'].$get({
        param: { id: bondId },
        query: { lc: viewerLocale },
      })
      if (res.status === 202) {
        setIsGenerating(true)
        setIsLoading(false)
        return
      }
      const data = await unwrap<BondDetailData>(res)
      reportCache.set(bondId, data)
      setDetail(data)
      setIsGenerating(false)
      setIsLoading(false)
      clearContinue()
      if (data.chaptersPending && continueCount.current < CHAPTER_CONTINUE_MAX) {
        scheduleContinue(() => {
          void runContinue()
        }, 0)
      } else {
        continueCount.current = 0
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setIsLoading(false)
      onError?.(e)
    }
  }, [bondId, client, onError, viewerLocale, clearContinue, scheduleContinue, runContinue])

  const resumeChapterPoll = useCallback(() => {
    if (!bondId) return
    clearContinue()
    continueCount.current = 0
    void refetch()
  }, [bondId, clearContinue, refetch])

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

  const relocalize = useCallback(
    async (lc: string): Promise<'relocalized' | 'needs_pro' | 'quota' | 'error'> => {
      if (!bondId) return 'error'
      try {
        const res = await kindredBonds(client)[':id'].relocalize.$post({
          param: { id: bondId },
          json: { lc },
        })
        if (res.status === 402) return 'needs_pro'
        if (res.status === 429) return 'quota'
        if (!res.ok) return 'error'
        await refetch()
        return 'relocalized'
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)))
        return 'error'
      }
    },
    [bondId, client, refetch, onError]
  )

  useEffect(() => {
    if (!bondId) {
      setDetail(null)
      setIsLoading(false)
      return
    }
    const cached = reportCache.get(bondId)
    setDetail(cached ?? null)
    setIsLoading(!cached)
    continueCount.current = 0
    void refetch()
    return () => clearContinue()
  }, [bondId, refetch, clearContinue])

  return {
    detail,
    isLoading,
    isGenerating,
    error,
    chaptersPending: detail?.chaptersPending ?? false,
    refetch,
    resumeChapterPoll,
    chapters: extractChapters(detail?.interpretation),
    unlockBond,
    relocalize,
  }
}

function extractChapters(
  interpretation: PairInterpretation | null | undefined
): SynastryChapter[] | null {
  if (!interpretation?.chapters?.length) return null
  return interpretation.chapters
}
