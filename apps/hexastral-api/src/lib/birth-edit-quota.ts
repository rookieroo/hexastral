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
  /** 精确出生分钟数 0-1439（精确模式）。改变它会改变时柱 → chart-altering。 */
  birthClockMinutes?: number | null
  /** 真太阳时校准开关（null/undefined = 默认开）。 */
  birthSolarCalibrate?: boolean | null
  gender: '男' | '女'
}

export interface BirthEditPriorState {
  birthSolarDate: string | null
  birthTimeIndex: number | null
  birthClockMinutes?: number | null
  birthSolarCalibrate?: boolean | null
  birthGender: string | null
  birthEditUsed: boolean
}

/** 校准默认开：null / undefined / true 都视作「开」，只有显式 false 才是「关」。 */
const calibrateOn = (v: boolean | null | undefined): boolean => v !== false

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
  const hadPrior = !!prior.birthSolarDate && prior.birthTimeIndex != null && !!prior.birthGender
  if (!hadPrior) return 'first_add'
  const isChange =
    prior.birthSolarDate !== next.birthSolarDate ||
    prior.birthTimeIndex !== next.birthTimeIndex ||
    (prior.birthClockMinutes ?? null) !== (next.birthClockMinutes ?? null) ||
    calibrateOn(prior.birthSolarCalibrate) !== calibrateOn(next.birthSolarCalibrate) ||
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
