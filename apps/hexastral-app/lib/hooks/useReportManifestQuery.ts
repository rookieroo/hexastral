/**
 * useReportManifestQuery — TOC for the 6-chapter "book".
 *
 * Returns per-chapter metadata: which chapters are static (永不变) vs time-bound,
 * which are Free vs Pro, generated date, model+prompt version, and version count
 * (for the HistoryDrawer badge).
 */
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'

/**
 * Chapter slug enum — must mirror CHAPTER_SLUGS in apps/hexastral-api/src/lib/chart-context.ts.
 * ch2 has two variants: `_static` (Free, one-time) and `_dynamic` (Pro, lazy-regen).
 */
export type ChapterSlug =
  | 'ch1_personality'
  | 'ch2_dimensions_static'
  | 'ch2_dimensions_dynamic'
  | 'ch3_stellar'
  | 'ch4_timeline'
  | 'ch5_hidden'
  | 'ch6_action'

export interface ChapterManifestEntry {
  slug: ChapterSlug
  isStatic: boolean
  isFree: boolean
  accessible: boolean
  hasCurrent: boolean
  generatedAt: string | null
  /** UTC minute bucket from API — chapters sharing this were likely generated together. */
  generationBatchId: string | null
  model: string
  promptVersion: string
  versions: number
}

export interface ReportManifest {
  isPro: boolean
  chapters: ChapterManifestEntry[]
}

async function fetchReportManifest(): Promise<ReportManifest> {
  const res = await apiClient.api.report.$get()
  if (!res.ok) throw new Error(`report manifest fetch failed: ${res.status}`)
  return (await res.json()) as ReportManifest
}

export function useReportManifestQuery(userId: string | null | undefined) {
  return useQuery<ReportManifest>({
    queryKey: ['report-manifest', userId],
    queryFn: fetchReportManifest,
    enabled: !!userId,
    // Manifest changes only on chapter generation/refresh — TOC screen reads
    // from cache and the chapter screen invalidates on its own writes.
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}
