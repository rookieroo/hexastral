/**
 * useChapterQuery + useChapterHistoryQuery — single chapter of the report book.
 *
 * GET /api/report/chapter/:slug:
 *   - Resolves expected `contextHash` from current chart + (for time-bound
 *     chapters) currentLiunian + currentDayun + prompt/model versions.
 *   - If stored is_current row matches → returns cached.
 *   - Otherwise lazily regenerates via svc-astro and persists a new version.
 *
 * Returned `contentJson` is the chapter's structured payload — already parsed
 * server-side via JSON.parse before serialization. Shape is slug-specific;
 * consumers cast to the slug's expected payload type at the component boundary.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { apiClient } from '@/lib/api'
import type { ChapterSlug } from './useReportManifestQuery'

/** Success payload only — 403 chart-drift responses omit `contentJson`. */
type ChapterGetResponse = InferResponseType<(typeof apiClient.api.report.chapter)[':slug']['$get']>
export type ChapterRow = Extract<ChapterGetResponse, { contentJson: unknown }>
export type ChapterHistory = InferResponseType<
  (typeof apiClient.api.report.chapter)[':slug']['history']['$get']
>

export class ReportChapterError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ReportChapterError'
  }
}

async function fetchChapter(slug: ChapterSlug): Promise<ChapterRow> {
  const res = await apiClient.api.report.chapter[':slug'].$get({ param: { slug } })
  if (!res.ok) {
    let code: string | undefined
    try {
      const body = (await res.json()) as { code?: string }
      code = typeof body.code === 'string' ? body.code : undefined
    } catch {
      code = undefined
    }
    throw new ReportChapterError(`report chapter ${slug} failed: ${res.status}`, res.status, code)
  }
  return await res.json()
}

async function fetchChapterHistory(slug: ChapterSlug): Promise<ChapterHistory> {
  const res = await apiClient.api.report.chapter[':slug'].history.$get({ param: { slug } })
  if (!res.ok) throw new Error(`report chapter ${slug} history failed: ${res.status}`)
  return await res.json()
}

export function useChapterQuery(
  userId: string | null | undefined,
  slug: ChapterSlug,
  enabled = true
) {
  const qc = useQueryClient()
  return useQuery<ChapterRow>({
    queryKey: ['report', slug, 'current', userId],
    queryFn: async () => {
      const row = await fetchChapter(slug)
      // Lazy regen may have created a new row — refresh the manifest so the
      // TOC shows updated hasCurrent / generatedAt without a manual refresh.
      qc.invalidateQueries({ queryKey: ['report-manifest', userId] })
      return row
    },
    enabled: !!userId && enabled,
    // First request may trigger LLM generation; do not refetch aggressively.
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  })
}

export function useChapterHistoryQuery(
  userId: string | null | undefined,
  slug: ChapterSlug,
  enabled = true
) {
  return useQuery<ChapterHistory>({
    queryKey: ['report', slug, 'history', userId],
    queryFn: () => fetchChapterHistory(slug),
    enabled: !!userId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  })
}

/** Bust both the current row and the history list for a chapter. */
export function useInvalidateChapter() {
  const qc = useQueryClient()
  return (userId: string, slug: ChapterSlug) => {
    qc.invalidateQueries({ queryKey: ['report', slug, 'current', userId] })
    qc.invalidateQueries({ queryKey: ['report', slug, 'history', userId] })
    qc.invalidateQueries({ queryKey: ['report-manifest', userId] })
  }
}
