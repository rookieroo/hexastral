/**
 * useRefreshChapterMutation — Pro-only chapter re-roll.
 *
 * Re-runs the chapter LLM with a `perspectiveSeed` token (e.g. "career-pivot",
 * "year-2026-focus"). Server enforces 1/chapter/30-days via D1 row inspection;
 * a 429 response surfaces the next-eligible date in the error message.
 *
 * On success, the new row replaces the previous is_current. This invalidates
 * both the current chapter row and the chapter's history list.
 */
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { type ChapterRow, useInvalidateChapter } from './useChapterQuery'
import type { ChapterSlug } from './useReportManifestQuery'

export type ReportStylePreset = 'direct' | 'coach' | 'gentle'

export interface RefreshChapterArgs {
  slug: ChapterSlug
  perspectiveSeed?: string
  stylePreset?: ReportStylePreset
  styleSeed?: string
}

async function rerollChapter({
  slug,
  perspectiveSeed,
  stylePreset,
  styleSeed,
}: RefreshChapterArgs): Promise<ChapterRow> {
  const trimmedPerspectiveSeed = perspectiveSeed?.trim() ?? ''
  const trimmedStyleSeed = styleSeed?.trim() ?? ''
  if (!trimmedPerspectiveSeed && !stylePreset && !trimmedStyleSeed) {
    throw new Error('Perspective or style is required')
  }
  const res = await apiClient.api.report.chapter[':slug'].reroll.$post({
    param: { slug },
    json: {
      perspectiveSeed: trimmedPerspectiveSeed || undefined,
      stylePreset,
      styleSeed: trimmedStyleSeed || undefined,
    },
  })
  if (!res.ok) {
    // Server returns { error: '...' } on 4xx — surface the message verbatim
    // so the iOS layer can render the next-eligible-at copy.
    let message = `chapter reroll failed: ${res.status}`
    try {
      const body = (await res.json()) as { error?: string; message?: string }
      message = body.error ?? body.message ?? message
    } catch {
      // Non-JSON error body — fall through to default
    }
    throw new Error(message)
  }
  return (await res.json()) as ChapterRow
}

export function useRefreshChapterMutation(userId: string | null | undefined) {
  const invalidate = useInvalidateChapter()
  return useMutation<ChapterRow, Error, RefreshChapterArgs>({
    mutationFn: rerollChapter,
    onSuccess: (_data, vars) => {
      if (userId) invalidate(userId, vars.slug)
    },
  })
}
