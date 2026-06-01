/**
 * useSignalQuery — today's deterministic+LLM Daily Signal.
 *
 * Lazily generated server-side on first call per user-day. Subsequent calls
 * return the same persisted row from `daily_signals`. Replaces useFortuneQuery.
 *
 * MMKV mirror key (via React Query persistor): `signal:today:<userId>`
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

/** Wuxing element used by SignalCard for color theming. */
export type SignalWuxing = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
/** 5-slot energy bar: rising / steady / productive / guarded / volatile. */
export type SignalEnergyLevel = 'rising' | 'steady' | 'productive' | 'guarded' | 'volatile'

export interface SignalContent {
  headline: string
  energy: { level: SignalEnergyLevel; wuxing: SignalWuxing }
  todayLens: string
  watchFor: string
  lucky: { hour: string; direction: string; color: string; advice: string }
  /** "今日金句" — 1–2 sentence flagship hero line. Optional for older signals. */
  goldenLine?: string
  reasoningChain: string
}

export interface SignalToday {
  signalId: string
  date: string
  content: SignalContent
  kind?: 'llm' | 'almanac'
  model: string
  promptVersion: string
  generatedAt: string
}

async function fetchSignalToday(): Promise<SignalToday | null> {
  const res = await apiClient.api.signal.today.$get()
  if (!res.ok) throw new Error(`signal/today fetch failed: ${res.status}`)
  return (await res.json()) as SignalToday
}

const todayKey = () => new Date().toISOString().slice(0, 10)

export function useSignalQuery(userId: string | null | undefined) {
  return useQuery<SignalToday | null>({
    queryKey: ['signal', todayKey(), userId],
    queryFn: fetchSignalToday,
    enabled: !!userId,
    // Stable for the day — the row is append-only per (user, date).
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}

/** Bust today's signal cache (e.g. after onboarding reveal completes). */
export function useInvalidateSignal() {
  const qc = useQueryClient()
  return (userId: string) => qc.invalidateQueries({ queryKey: ['signal', todayKey(), userId] })
}
