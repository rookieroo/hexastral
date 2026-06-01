/**
 * Birth-info edit quota — free users get exactly one lifetime correction.
 *
 * The two PUT endpoints (`/api/portfolio/birth-info` and
 * `/api/user/:id/birth-info`) share this gate so the policy can't drift. The
 * "first ever add" is free and does not consume the quota; the IAP / Pro tier
 * bypasses the gate entirely.
 *
 * `classifyBirthEdit` is pure and re-usable for client-side display; the
 * `assertBirthEditQuota` helper layers the HTTP semantics on top.
 */

import { HTTPException } from 'hono/http-exception'

export type BirthEditDisposition = 'first_add' | 'consume_quota' | 'no_change'

export interface BirthEditInput {
  birthSolarDate: string
  birthTimeIndex: number
  gender: '男' | '女'
}

export interface BirthEditPriorState {
  birthSolarDate: string | null
  birthTimeIndex: number | null
  birthGender: string | null
  birthEditUsed: boolean
}

/**
 * Pure classifier — given the user's prior birth state and the incoming
 * payload, decide what semantic the PUT carries. Only solarDate/timeIndex/
 * gender are considered "chart-altering"; city/coord-only updates are
 * `no_change` because they don't change the chartHash that drives LLM cost.
 */
export function classifyBirthEdit(
  prior: BirthEditPriorState,
  next: BirthEditInput
): BirthEditDisposition {
  const hadPrior =
    !!prior.birthSolarDate && prior.birthTimeIndex != null && !!prior.birthGender
  if (!hadPrior) return 'first_add'
  const isChange =
    prior.birthSolarDate !== next.birthSolarDate ||
    prior.birthTimeIndex !== next.birthTimeIndex ||
    prior.birthGender !== next.gender
  return isChange ? 'consume_quota' : 'no_change'
}

/**
 * Throws a 403 with `BIRTH_EDIT_QUOTA_EXHAUSTED` when a free user attempts a
 * second chart-altering edit. Returns the disposition so the caller can decide
 * whether to flip `users.birthEditUsed` after the write succeeds.
 */
export function assertBirthEditQuota(
  prior: BirthEditPriorState,
  next: BirthEditInput,
  isPro: boolean
): BirthEditDisposition {
  const disposition = classifyBirthEdit(prior, next)
  if (disposition === 'consume_quota' && !isPro && prior.birthEditUsed) {
    throw new HTTPException(403, {
      message:
        'Your free birth-info correction has already been used. Upgrade for unlimited edits.',
      res: new Response(
        JSON.stringify({
          error:
            'Your free birth-info correction has already been used. Upgrade for unlimited edits.',
          code: 'BIRTH_EDIT_QUOTA_EXHAUSTED',
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ),
    })
  }
  return disposition
}
