/**
 * POST /api/timeline/explain — fate/Kindred 命运时间轴节点深度解读 (B-fate.3).
 *
 * Mirrors `/api/auspice/explain` (C.4): the deterministic timeline node + its one-line
 * `summary` are computed in `@zhop/astro-core` (`timeline.ts`, B-fate.1); this is the
 * ONLY LLM layer, cost-guarded by the shared K.4 guard and 24h-cached in GUARD_KV.
 *
 * The node is **recomputed server-side** from the birth info + target (year, type) —
 * the client never sends an authoritative reading. Free taste → degrade to the
 * deterministic `node.summary` (never blank); subject priority userId > deviceId > ipHash.
 * The full timeline view + node summaries stay free + client-side; THIS endpoint is the
 * Pro AI elaboration (per ADR-0012). Pro gating (entitlement → higher limit / deep tier)
 * layers on later via the `userId` subject; structure here is identical to Auspice.
 */

import { getTimelineNodes } from '@zhop/astro-core'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import type { AppEnv } from '../infra-types'
import { jsonOk } from '../lib/api-response'
import { astroClient } from '../lib/service-clients'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  recordLlmGuardGrant,
  resolveLlmGuardSubject,
} from '../services/shared/llm-guard'

export const timelineRoutes = new Hono<AppEnv>()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const FATE_TIMELINE_GUARD_CONFIG = {
  app: 'fate-timeline',
  dailyLimitAnon: 1,
  dailyLimitSigned: 5,
  lifetimePeakPass: 1,
  globalDailyBudget: 5000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

const explainSchema = z.object({
  /** 出生公历日期 YYYY-MM-DD. */
  solarDate: z.string().regex(DATE_RE, 'solarDate must be YYYY-MM-DD'),
  /** 时辰 index 0-12 (matches fate-app FateBirthInput). */
  timeIndex: z.number().int().min(0).max(12).default(0),
  gender: z.enum(['男', '女']),
  /** 目标节点的公历年. */
  year: z.number().int().min(1900).max(2200),
  nodeType: z.enum(['大运', '流年']),
  locale: z.string().max(16).default('en'),
  /** 已登录/已购用户 id (preferred quota subject; enables signed limits). */
  userId: z.string().max(128).optional(),
  /** Anonymous install id (fallback subject over ipHash). */
  deviceId: z.string().max(128).optional(),
})

/** 时辰 index → representative hour (mirrors fate-app lib/natal.ts). */
function timeIndexToHour(timeIndex: number): number {
  if (timeIndex <= 0) return 0
  if (timeIndex >= 12) return 23
  return timeIndex * 2 - 1
}

/** Tiny non-crypto hash so raw IPs never land in KV keys. */
function hashIp(ip: string): string {
  let h = 2_166_136_261
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return (h >>> 0).toString(36)
}

timelineRoutes.post('/explain', async (c) => {
  const body = explainSchema.parse(await c.req.json().catch(() => ({})))
  const [year, month, day] = body.solarDate.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]

  // Recompute the node deterministically (astro-core) — facts for the prompt + template.
  const { nodes } = getTimelineNodes(
    { year, month, day, hour: timeIndexToHour(body.timeIndex) },
    body.gender,
    { fromYear: body.year, toYear: body.year }
  )
  const node = nodes.find((n) => n.type === body.nodeType && n.year === body.year)
  if (!node) {
    // 大运 explain requested for a non-transition year, etc. — no node to explain.
    return jsonOk(c, { explanation: null, source: 'none', upsell: false })
  }

  const cacheKey = `fate:timeline:explain:${body.solarDate}:${body.timeIndex}:${body.gender}:${body.year}:${body.nodeType}:${body.locale}`

  // 1. Cache hit — no guard spend.
  const cached = await c.env.GUARD_KV.get(cacheKey)
  if (cached) return jsonOk(c, { explanation: cached, source: 'cache', upsell: false })

  // 2. Guard decision (subject: userId > deviceId > ipHash).
  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({
    userId: body.userId,
    deviceId: body.deviceId,
    ipHash: hashIp(ip),
  })
  // Deterministic fallback = the engine's one-line summary (never blank).
  const template = () => jsonOk(c, { explanation: node.summary, source: 'template', upsell: false })
  if (!subject) return template()

  const guard = await evaluateLlmGuard(c.env, { subject, config: FATE_TIMELINE_GUARD_CONFIG })
  for (const ev of guard.events) console.info('[fate.timeline.explain.guard]', JSON.stringify(ev))

  if (guard.decision === 'allow_llm') {
    try {
      const resp = await astroClient.post<{ explanation: string }>(
        c.env.SVC_ASTRO,
        '/timeline/explain',
        {
          nodeType: node.type,
          year: node.year,
          ganZhi: node.ganZhi.label,
          shiShen: node.shiShen.name,
          clashesDayBranch: node.clashesDayBranch,
          significance: node.significance,
          summary: node.summary,
          locale: body.locale,
          isPro: guard.tier === 'deep',
        }
      )
      const explanation = (resp.explanation ?? '').trim()
      if (explanation) {
        await c.env.GUARD_KV.put(cacheKey, explanation, { expirationTtl: 86_400 })
        await recordLlmGuardGrant(c.env, {
          subject,
          config: FATE_TIMELINE_GUARD_CONFIG,
          consumesPeakPass: guard.consumesPeakPass,
        })
        return jsonOk(c, { explanation, source: 'llm', tier: guard.tier, upsell: false })
      }
    } catch (err) {
      console.error('[fate.timeline.explain] svc-astro failed', err)
    }
    return template() // svc-astro failed/empty — degrade, no grant recorded
  }

  // 3. allow_cached (global budget) / allow_template (subject exhausted) — cache already
  //    missed, so serve the deterministic summary + surface the upsell.
  return jsonOk(c, {
    explanation: node.summary,
    source: 'template',
    upsell: guard.upsellAfterExhaust,
  })
})
