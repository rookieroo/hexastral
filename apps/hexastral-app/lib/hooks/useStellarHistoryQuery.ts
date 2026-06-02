import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReadingRecord } from '@zhop/hexastral-client'
import { apiClient } from '@/lib/api'

async function fetchStellarHistory(userId: string): Promise<ReadingRecord[]> {
  const resp = await apiClient.api.stellar.chart.history[':userId'].$get({ param: { userId } })
  if (!resp.ok) return []
  const json = await resp.json()
  return (json.data ?? []) as ReadingRecord[]
}

export function useStellarHistoryQuery(userId: string | null | undefined) {
  return useQuery<ReadingRecord[]>({
    queryKey: ['stellar-history', userId],
    queryFn: () => fetchStellarHistory(userId!),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}

export function useToggleStellarBookmark(userId: string | null | undefined) {
  const qc = useQueryClient()
  return async (record: ReadingRecord) => {
    const next = !record.bookmarked
    qc.setQueryData(
      ['stellar-history', userId],
      (prev: ReadingRecord[] | undefined) =>
        prev?.map((r) => (r.id === record.id ? { ...r, bookmarked: next } : r)) ?? []
    )
    try {
      await apiClient.api.stellar.chart[':readingId'].bookmark.$patch({
        param: { readingId: record.id },
        json: { bookmarked: next },
      })
    } catch {
      qc.setQueryData(
        ['stellar-history', userId],
        (prev: ReadingRecord[] | undefined) =>
          prev?.map((r) => (r.id === record.id ? { ...r, bookmarked: record.bookmarked } : r)) ?? []
      )
    }
  }
}
