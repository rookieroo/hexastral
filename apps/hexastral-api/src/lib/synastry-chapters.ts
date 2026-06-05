/**
 * Synastry chapter gating — server-side enforcement for the six-chapter deep
 * report (svc-astro generates all six; the client must never receive locked
 * BODIES).
 *
 * Free viewers see the first `SYNASTRY_FREE_CHAPTERS`; the rest are returned as
 * teasers (kind + title + goldenLine, no body) so the client can render the
 * unlock wall. The viewer unlocks the full set by:
 *   - holding the `kindred` capability (subscription), or
 *   - having `users.unlockedChapterCount` flipped to the cap via the invite
 *     mechanic (a partner showed up) or a single-purchase consume.
 *
 * This mirrors the solo deep-report policy in `chapter-access.ts`; kept separate
 * because the synastry chapter set is its own ordered six (first_impression …
 * long_term_advice), distinct from the natal slugs.
 */

/** Chapters a free viewer sees without unlocking. */
export const SYNASTRY_FREE_CHAPTERS = 3
/** Total chapters svc-astro generates. */
export const SYNASTRY_TOTAL_CHAPTERS = 6

interface ChapterLike {
  kind?: unknown
  title?: unknown
  goldenLine?: unknown
  body?: unknown
}

/** A locked chapter as sent to the client — teaser only, never a body. */
export interface LockedChapterTeaser {
  kind: string
  title: string
  goldenLine: string
  locked: true
}

/**
 * Returns a copy of `interpretation` with `chapters` truncated to `unlockedCount`
 * full chapters and the remainder exposed as `lockedChapters` teasers. Adds
 * `totalChapters`. No-op (minus the count field) when there are no chapters.
 */
export function gateInterpretationChapters(
  interpretation: Record<string, unknown>,
  unlockedCount: number
): Record<string, unknown> {
  const raw = interpretation.chapters
  if (!Array.isArray(raw) || raw.length === 0) return interpretation

  const n = Math.min(Math.max(unlockedCount, 0), raw.length)
  const unlocked = raw.slice(0, n)
  const locked: LockedChapterTeaser[] = raw.slice(n).map((ch: ChapterLike) => ({
    kind: typeof ch.kind === 'string' ? ch.kind : '',
    title: typeof ch.title === 'string' ? ch.title : '',
    goldenLine: typeof ch.goldenLine === 'string' ? ch.goldenLine : '',
    locked: true,
  }))

  return {
    ...interpretation,
    chapters: unlocked,
    lockedChapters: locked,
    totalChapters: raw.length,
  }
}

/**
 * How many synastry chapters this viewer may read in full.
 * Subscribers and fully-unlocked users get everything; everyone else gets the
 * free taste.
 */
export function resolveUnlockedChapterCount(opts: {
  isSubscriber: boolean
  unlockedChapterCount: number | null
}): number {
  if (opts.isSubscriber) return SYNASTRY_TOTAL_CHAPTERS
  const stored = opts.unlockedChapterCount ?? SYNASTRY_FREE_CHAPTERS
  return Math.min(Math.max(stored, SYNASTRY_FREE_CHAPTERS), SYNASTRY_TOTAL_CHAPTERS)
}
