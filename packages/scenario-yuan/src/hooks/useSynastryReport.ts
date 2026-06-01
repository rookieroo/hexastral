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
 */

import { useCallback, useEffect, useState } from 'react'
import { useYuanClient } from '../context'
import { unwrap, yuanBonds } from '../lib/yuan-bonds-api'
import type { BondDetailData, PairInterpretation, SynastryChapter } from '../types'

export interface UseSynastryReportResult {
  detail: BondDetailData | null
  isLoading: boolean
  isGenerating: boolean
  error: Error | null
  /** Force re-fetch — does not regenerate, just clears local state */
  refetch: () => Promise<void>
  /** Convenience accessor: returns chapters if interpretation includes them */
  chapters: SynastryChapter[] | null
}

export function useSynastryReport(bondId: string | null): UseSynastryReportResult {
  const { client, onError } = useYuanClient()
  const [detail, setDetail] = useState<BondDetailData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(bondId != null)
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!bondId) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await yuanBonds(client)[':id'].$get({ param: { id: bondId } })
      if (res.status === 202) {
        // Backend signals generation in progress
        setIsGenerating(true)
        setIsLoading(false)
        return
      }
      const data = await unwrap<BondDetailData>(res)
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

  useEffect(() => {
    if (!bondId) {
      setDetail(null)
      setIsLoading(false)
      return
    }
    void refetch()
  }, [bondId, refetch])

  return {
    detail,
    isLoading,
    isGenerating,
    error,
    refetch,
    chapters: extractChapters(detail?.interpretation),
  }
}

function extractChapters(
  interpretation: PairInterpretation | null | undefined
): SynastryChapter[] | null {
  if (!interpretation?.chapters) return null
  return Array.isArray(interpretation.chapters) ? interpretation.chapters : null
}
