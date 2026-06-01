import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { DivinationRecord } from '@zhop/hexastral-client'
import { apiClient } from '@/lib/api'

async function fetchYichingHistory(userId: string): Promise<DivinationRecord[]> {
  const resp = await apiClient.api.yiching.divination.history[':userId'].$get({ param: { userId } })
  if (!resp.ok) return []
  const json = await resp.json()
  return (json.data ?? []) as DivinationRecord[]
}

export function useYichingHistoryQuery(userId: string | null | undefined) {
  return useQuery<DivinationRecord[]>({
    queryKey: ['yiching-history', userId],
    queryFn: () => fetchYichingHistory(userId!),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}

export function useToggleYichingBookmark(userId: string | null | undefined) {
  const qc = useQueryClient()
  return async (record: DivinationRecord) => {
    const next = !record.bookmarked
    // Optimistic update
    qc.setQueryData(
      ['yiching-history', userId],
      (prev: DivinationRecord[] | undefined) =>
        prev?.map((r) => (r.id === record.id ? { ...r, bookmarked: next } : r)) ?? []
    )
    try {
      await apiClient.api.yiching.divination[':id'].bookmark.$patch({
        param: { id: record.id },
        json: { bookmarked: next },
      })
    } catch {
      // Revert
      qc.setQueryData(
        ['yiching-history', userId],
        (prev: DivinationRecord[] | undefined) =>
          prev?.map((r) => (r.id === record.id ? { ...r, bookmarked: record.bookmarked } : r)) ?? []
      )
    }
  }
}
