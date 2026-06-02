/**
 * Signed-fetch helpers for the invite-driven chapter-unlock flow.
 *
 * Manifest tells the client which chapters are accessible + the
 * `unlockedChapterCount` vs `chapterUnlockCap` aggregate so the list view can
 * render progressive unlock affordance.
 *
 * Invite endpoint (POST) takes a target email and best-effort mails an invite.
 * Redemption fires automatically when the target binds the same email via
 * `confirmEmailOtp` (see use-email-bind.ts) — there is no separate callback
 * the client has to wire.
 */

import { resolvePortfolioApiUrl } from './api-url'
import { signRequest } from './hmac'
import { getPortfolioUserId } from './session'

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
  /** 1-based position in the invite unlock order; `null` for Pro-only chapters. */
  unlockPosition: number | null
  accessible: boolean
  hasCurrent: boolean
  generatedAt: string | null
  generationBatchId: string | null
  model: string
  promptVersion: string
  versions: number
}

export interface ReportManifest {
  isPro: boolean
  unlockedChapterCount: number
  chapterUnlockCap: number
  /** True iff `users.email` is bound — gates the invite flow on the client. */
  hasEmail: boolean
  /** True once the user has consumed their lifetime free birth-info edit. */
  birthEditUsed: boolean
  chapters: ChapterManifestEntry[]
}

export interface PendingChapterUnlockInvite {
  id: string
  targetEmail: string
  createdAt: string
  expiresAt: string
}

export interface InviteChapterUnlockSent {
  id: string
  token: string
  expiresAt: string
}

export type InviteChapterUnlockError =
  | 'no_email'
  | 'at_cap'
  | 'duplicate'
  | 'self_invite'
  | 'invalid'
  | 'mailer_failed'
  | 'network'
  | 'unauthed'

async function signedFetch(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<Response | null> {
  const userId = await getPortfolioUserId()
  if (!userId) return null
  const requestBody = method === 'POST' ? JSON.stringify(body ?? {}) : ''
  const signed = await signRequest({ body: requestBody, userId, method, path })
  if (!signed) return null
  try {
    return await fetch(`${resolvePortfolioApiUrl()}${path}`, {
      method,
      headers: {
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        Authorization: `Bearer ${userId}`,
        ...signed,
      },
      ...(method === 'POST' ? { body: requestBody } : {}),
    })
  } catch {
    return null
  }
}

/**
 * Fetch the report manifest — chapters + accessible / unlockPosition + the
 * `unlockedChapterCount` vs `chapterUnlockCap` aggregate. Returns `null` on
 * any failure so callers can fall back to a sensible default UI.
 */
export async function fetchReportManifest(): Promise<ReportManifest | null> {
  const res = await signedFetch('GET', '/api/report')
  if (!res?.ok) return null
  try {
    return (await res.json()) as ReportManifest
  } catch {
    return null
  }
}

/** A's own pending chapter-unlock invites (for "waiting for X@..." UI). */
export async function fetchPendingChapterUnlockInvites(): Promise<PendingChapterUnlockInvite[]> {
  const res = await signedFetch('GET', '/api/portfolio/invite-chapter-unlock/pending')
  if (!res?.ok) return []
  try {
    const data = (await res.json()) as { invites?: PendingChapterUnlockInvite[] }
    return data.invites ?? []
  } catch {
    return []
  }
}

/**
 * Send a chapter-unlock invite to a friend. On success returns the new
 * invitation id + token + expiresAt. On failure returns a structured error
 * code mapping to a server 4xx so the UI can show the right message.
 */
export async function inviteChapterUnlock(input: {
  targetEmail: string
  message?: string
}): Promise<
  { ok: true; data: InviteChapterUnlockSent } | { ok: false; error: InviteChapterUnlockError }
> {
  const res = await signedFetch('POST', '/api/portfolio/invite-chapter-unlock', input)
  if (!res) return { ok: false, error: 'unauthed' }
  if (res.ok) {
    try {
      return { ok: true, data: (await res.json()) as InviteChapterUnlockSent }
    } catch {
      return { ok: false, error: 'network' }
    }
  }
  // Map server 4xx to a discriminated error so the UI can branch.
  if (res.status === 502) return { ok: false, error: 'mailer_failed' }
  let serverMsg = ''
  try {
    const j = (await res.json()) as { message?: string }
    serverMsg = j.message ?? ''
  } catch {}
  if (/bind your own email/i.test(serverMsg)) return { ok: false, error: 'no_email' }
  if (/every chapter|no more invites/i.test(serverMsg)) return { ok: false, error: 'at_cap' }
  if (/already pending/i.test(serverMsg)) return { ok: false, error: 'duplicate' }
  if (/cannot invite yourself/i.test(serverMsg)) return { ok: false, error: 'self_invite' }
  return { ok: false, error: 'invalid' }
}
