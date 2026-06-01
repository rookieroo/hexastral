/**
 * Pair (合盘) reading list — feeds Fate › Readings tab in History.
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

export interface PairHistoryRecord {
  id: string
  personAName: string | null
  personBName: string | null
  personASolarDate: string | null
  personBSolarDate: string | null
  score: number | null
  grade: string | null
  bookmarked: boolean | null
  createdAt: string
}

async function fetchPairHistory(): Promise<PairHistoryRecord[]> {
  const res = await apiClient.api.pair.history.$get({ query: { limit: '50' } })
  if (!res.ok) throw new Error(`pair/history failed: ${res.status}`)
  const json = (await res.json()) as { records: PairHistoryRecord[] }
  return json.records ?? []
}

export function usePairHistoryQuery(userId: string | null | undefined) {
  return useQuery<PairHistoryRecord[]>({
    queryKey: ['pair-history', userId],
    queryFn: fetchPairHistory,
    enabled: !!userId,
    staleTime: 60 * 1000,
  })
}
