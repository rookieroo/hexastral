/**
 * GET /api/signal/item/:signalId — single Daily Signal row (history detail).
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { SignalToday } from '@/lib/hooks/useSignalQuery'

async function fetchSignalItem(signalId: string): Promise<SignalToday> {
  const res = await apiClient.api.signal.item[':signalId'].$get({
    param: { signalId },
  })
  if (!res.ok) throw new Error(`signal item fetch failed: ${res.status}`)
  return (await res.json()) as SignalToday
}

export function useSignalItemQuery(
  userId: string | null | undefined,
  signalId: string | null | undefined
) {
  return useQuery<SignalToday>({
    queryKey: ['signal-item', userId, signalId],
    queryFn: () => fetchSignalItem(signalId!),
    enabled: !!userId && !!signalId && !userId.startsWith('guest_'),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
