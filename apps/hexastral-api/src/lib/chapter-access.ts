/**
 * Chapter unlock policy — single source of truth for "which chapter is the
 * N-th to unlock" and "is THIS chapter currently readable by THIS user".
 *
 * The free-reading flow gives every user the first 2 chapters by default
 * (see `users.unlockedChapterCount` default in schema). Each successful
 * invite-redeem (target binds email) increments the count by 1. Cap is the
 * total length of the ordered list — invites stop being useful once the user
 * holds every chapter.
 *
 * `ch2_dimensions_dynamic` is intentionally NOT in the unlock list. It is the
 * time-bound Pro variant of `ch2_dimensions_static` and is gated by a future
 * IAP layer, not by the invite mechanic.
 */

import { and, eq, sql } from 'drizzle-orm'
import { chapterUnlockInvitations, users } from '../db/schema'
import type { AppDb } from '../infra-types'
import type { ChapterSlug } from './chart-context'

/**
 * Order in which chapters unlock for a free user.
 *
 * Designed for the user journey: lead with identity hook (ch1) + immediate
 * timeline value (ch4), then progressively deepen — ziwei structure, static
 * 8-dimensions, hidden tensions, capstone action plan.
 */
export const CHAPTER_UNLOCK_ORDER: ReadonlyArray<ChapterSlug> = [
  'ch1_personality',
  'ch4_timeline',
  'ch3_stellar',
  'ch2_dimensions_static',
  'ch5_hidden',
  'ch6_action',
]

/** Total chapters reachable via the invite mechanic. */
export const CHAPTER_UNLOCK_CAP = CHAPTER_UNLOCK_ORDER.length

/** Default `users.unlockedChapterCount` for a brand-new account. */
export const CHAPTER_UNLOCK_DEFAULT = 2

/**
 * True if `slug` is readable by a user holding `unlockedCount` chapters.
 *
 * Slugs not in `CHAPTER_UNLOCK_ORDER` (currently only `ch2_dimensions_dynamic`)
 * return `false` — they're outside the invite mechanic and need a future Pro
 * entitlement check at the call site.
 */
export function isChapterUnlocked(slug: string, unlockedCount: number): boolean {
  const idx = CHAPTER_UNLOCK_ORDER.indexOf(slug as ChapterSlug)
  if (idx === -1) return false
  return idx < unlockedCount
}

/** Position (1-indexed) of a slug in the unlock order, or `null` if outside it. */
export function chapterUnlockPosition(slug: string): number | null {
  const idx = CHAPTER_UNLOCK_ORDER.indexOf(slug as ChapterSlug)
  return idx === -1 ? null : idx + 1
}

/**
 * Called from `POST /api/user/:userId/email/confirm` right after `users.email`
 * is written. Scans pending `chapter_unlock_invitations` whose `target_email`
 * matches the freshly bound email and credits each inviter one chapter unlock
 * (clamped to `CHAPTER_UNLOCK_CAP`).
 *
 * Returns the number of invites redeemed so the email-confirm response can
 * surface a "你解锁了 N 章给朋友" toast back to B.
 */
export async function claimChapterUnlocksForEmail(
  db: AppDb,
  redeemerUserId: string,
  rawEmail: string
): Promise<number> {
  const email = rawEmail.trim().toLowerCase()
  if (!email) return 0

  const pending = await db
    .select({ id: chapterUnlockInvitations.id, inviterUserId: chapterUnlockInvitations.inviterUserId })
    .from(chapterUnlockInvitations)
    .where(
      and(
        eq(chapterUnlockInvitations.targetEmail, email),
        eq(chapterUnlockInvitations.status, 'pending')
      )
    )
    .all()

  if (pending.length === 0) return 0

  const now = new Date().toISOString()
  // Each invite is independent (different inviters possible); fan out in
  // parallel. Increment is `min(count + 1, CAP)` via SQL so concurrent
  // redemptions on the same inviter still respect the cap.
  await Promise.all(
    pending.map((row) =>
      Promise.all([
        db
          .update(chapterUnlockInvitations)
          .set({
            status: 'redeemed',
            redeemedAt: now,
            redeemedByUserId: redeemerUserId,
          })
          .where(eq(chapterUnlockInvitations.id, row.id)),
        db
          .update(users)
          .set({
            unlockedChapterCount: sql`MIN(${users.unlockedChapterCount} + 1, ${CHAPTER_UNLOCK_CAP})`,
            updatedAt: now,
          })
          .where(eq(users.id, row.inviterUserId)),
      ])
    )
  )

  return pending.length
}
