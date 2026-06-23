/**
 * 关系择时窗口深解 — make-if 的可复用 LLM 核心 (Workstream B).
 *
 * Sibling of relationship-timeline-explain.ts, but for a forward 流月 DECISION window
 * ("这个月对推进这一步合不合适"). The window's DERIVED facts (lean / 用神 / 神煞) arrive
 * from the client — they are already device-side + privacy-safe (no raw counterpart
 * chart ever crosses the wire, D2). K.4 cost-guarded, 24h GUARD_KV cache, and a
 * deterministic `fallback` so it is never blank.
 */

import type { CloudflareBindings } from '../infra-types'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  type LlmGuardSubject,
  type LlmGuardTier,
  recordLlmGuardGrant,
} from '../services/shared/llm-guard'
import { astroClient } from './service-clients'

const REL_MAKEIF_GUARD_CONFIG = {
  app: 'yuan-makeif',
  dailyLimitAnon: 1,
  dailyLimitSigned: 5,
  lifetimePeakPass: 1,
  globalDailyBudget: 5000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

export interface MakeIfExplainInput {
  /** Stable cache scope (the bond). */
  bondId: string
  windowKey: string
  year: number
  month: number
  ganZhi: string
  element?: string
  lean?: 'favorable' | 'mixed' | 'caution'
  yongshen?: string
  isYongshen?: boolean
  feedsYongshen?: boolean
  harmony?: boolean
  taohua?: boolean
  yima?: boolean
  shishang?: boolean
  /** The step being weighed — a preset move label or a free-text custom note. */
  step?: string
  locale: string
  /** Resolved K.4 quota subject (userId > deviceId > ipHash); null → straight fallback. */
  subject: LlmGuardSubject | null
  /** Deterministic one-liner the caller already shows (never blank). */
  fallback: string
}

export interface MakeIfExplainResult {
  explanation: string | null
  source: 'cache' | 'template' | 'llm'
  tier?: LlmGuardTier
  upsell: boolean
}

export async function explainRelationshipMakeIfWindow(
  env: CloudflareBindings,
  input: MakeIfExplainInput
): Promise<MakeIfExplainResult> {
  const stepKey = (input.step ?? '').slice(0, 24)
  const cacheKey = `kindred:makeif:explain:${input.bondId}:${input.windowKey}:${stepKey}:${input.locale}`

  const cached = await env.GUARD_KV.get(cacheKey)
  if (cached) return { explanation: cached, source: 'cache', upsell: false }

  // No subject → don't spend the guard, just hand back the deterministic line.
  if (!input.subject) return { explanation: input.fallback, source: 'template', upsell: false }

  const guard = await evaluateLlmGuard(env, {
    subject: input.subject,
    config: REL_MAKEIF_GUARD_CONFIG,
  })
  for (const ev of guard.events) console.info('[yuan.makeif.explain.guard]', JSON.stringify(ev))

  if (guard.decision === 'allow_llm') {
    try {
      const resp = await astroClient.post<{ explanation: string }>(
        env.SVC_ASTRO,
        '/relationship-timeline/makeif-explain',
        {
          year: input.year,
          month: input.month,
          ganZhi: input.ganZhi,
          element: input.element,
          lean: input.lean,
          yongshen: input.yongshen,
          isYongshen: input.isYongshen,
          feedsYongshen: input.feedsYongshen,
          harmony: input.harmony,
          taohua: input.taohua,
          yima: input.yima,
          shishang: input.shishang,
          step: input.step,
          locale: input.locale,
          isPro: guard.tier === 'deep',
        }
      )
      const explanation = (resp.explanation ?? '').trim()
      if (explanation) {
        await env.GUARD_KV.put(cacheKey, explanation, { expirationTtl: 86_400 })
        await recordLlmGuardGrant(env, {
          subject: input.subject,
          config: REL_MAKEIF_GUARD_CONFIG,
          consumesPeakPass: guard.consumesPeakPass,
        })
        return { explanation, source: 'llm', tier: guard.tier, upsell: false }
      }
    } catch (err) {
      console.error('[yuan.makeif.explain] svc-astro failed', err)
    }
    return { explanation: input.fallback, source: 'template', upsell: false }
  }

  return { explanation: input.fallback, source: 'template', upsell: guard.upsellAfterExhaust }
}
