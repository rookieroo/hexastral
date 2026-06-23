/**
 * Synastry chapter gating — server-side enforcement for the six-chapter deep
 * report (svc-astro generates all six; the client must never receive locked
 * BODIES).
 *
 * Free viewers see the first `SYNASTRY_FREE_CHAPTERS`; the rest are returned as
 * teasers (kind + title + goldenLine, no body) so the client can render the
 * unlock wall. The full set unlocks PER BOND — so free value tracks a real viral
 * action 1:1 — only by THIS bond being unlocked: a real Resonance connection (the
 * partner showed up and accepted THIS invite, when they're a new member) or a
 * single-purchase consume on THIS bond.
 *
 * Deliberately NOT unlocked by the subscription (Yuel Pro is the 体验层 — 追问 /
 * 时间线 / 假如 / 节点提醒 — and must not give away the high-value 合盘 artifact), nor
 * by the per-user `users.unlockedChapterCount` global (that mechanic stays with the
 * natal deep report, `chapter-access.ts`). Each bond earns its own unlock.
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
 * How many synastry chapters this viewer may read in full, PER BOND. The full set
 * is unlocked ONLY by THIS bond being unlocked (a real Resonance connection that
 * brought a new member, or a single-purchase consume on this bond). A subscription
 * does NOT unlock it (Yuel Pro is the 体验层) and the per-user global count is not
 * consulted — see the file header. Everyone else gets the free taste.
 */
export function resolveUnlockedChapterCount(opts: { bondUnlocked: boolean }): number {
  return opts.bondUnlocked ? SYNASTRY_TOTAL_CHAPTERS : SYNASTRY_FREE_CHAPTERS
}
