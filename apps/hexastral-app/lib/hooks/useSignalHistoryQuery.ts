/**
 * useSignalHistoryQuery — past N days of Daily Signals.
 *
 * Free tier capped at 7d; Pro extends up to 90d (server-enforced — when capped,
 * `proCapped` flag is true and `days` reflects the effective limit).
 *
 * Used by Fate-tab `SevenDayTrail` (days=7) and the in-app history scrubber.
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { unwrapApiEnvelope } from '@/lib/api-envelope'
import type { SignalContent } from './useSignalQuery'

export interface SignalHistoryItem {
  signalId: string
  date: string
  content: SignalContent
  model: string
  promptVersion: string
  generatedAt: string
}

export interface SignalHistory {
  days: number
  proCapped: boolean
  items: SignalHistoryItem[]
}

async function fetchSignalHistory(days: number): Promise<SignalHistory> {
  const res = await apiClient.api.signal.history.$get({ query: { days: String(days) } })
  if (!res.ok) throw new Error(`signal/history fetch failed: ${res.status}`)
  return unwrapApiEnvelope<SignalHistory>(res)
}

export function useSignalHistoryQuery(userId: string | null | undefined, days = 7) {
  return useQuery<SignalHistory>({
    queryKey: ['signal-history', days, userId],
    queryFn: () => fetchSignalHistory(days),
    enabled: !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
