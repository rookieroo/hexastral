/**
 * POST /api/relationship-timeline/explain — Kindred 关系时间轴节点深度解读 (B-yuan.3).
 *
 * Same shape as /api/timeline/explain (fate), but the node is recomputed from BOTH
 * charts via `@zhop/astro-core` `getRelationshipTimelineNodes` (B-yuan.1). The explain
 * core (K.4 guard / cache / svc-astro / template fallback) lives in
 * `lib/relationship-timeline-explain.ts` so the bonds-timeline dispatch (BT.4) can reuse
 * it without exposing the partner chart (privacy D2). This route is the direct-birth
 * entry: the client supplies both charts in the body.
 */

import type { RelationshipPerson } from '@zhop/astro-core'
import { Hono } from 'hono'
import { z } from 'zod/v4'
import type { AppEnv } from '../infra-types'
import { jsonOk } from '../lib/api-response'
import { explainRelationshipTimelineNode } from '../lib/relationship-timeline-explain'
import { resolveLlmGuardSubject } from '../services/shared/llm-guard'

export const relationshipTimelineRoutes = new Hono<AppEnv>()

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const personSchema = z.object({
  solarDate: z.string().regex(DATE_RE, 'solarDate must be YYYY-MM-DD'),
  timeIndex: z.number().int().min(0).max(12).default(0),
  gender: z.enum(['男', '女']),
})

const explainSchema = z.object({
  /** 你(A). */
  self: personSchema,
  /** 对方(B). */
  partner: personSchema,
  year: z.number().int().min(1900).max(2200),
  nodeType: z.enum(['大运', '流年']),
  /** 大运 节点必填 (disambiguate 你/对方 same-year transitions). */
  daYunOf: z.enum(['A', 'B']).optional(),
  locale: z.string().max(16).default('en'),
  userId: z.string().max(128).optional(),
  deviceId: z.string().max(128).optional(),
})

function timeIndexToHour(timeIndex: number): number {
  if (timeIndex <= 0) return 0
  if (timeIndex >= 12) return 23
  return timeIndex * 2 - 1
}

function toPerson(p: z.infer<typeof personSchema>): RelationshipPerson {
  const [year, month, day] = p.solarDate.split('-').map((n) => Number.parseInt(n, 10)) as [
    number,
    number,
    number,
  ]
  return { input: { year, month, day, hour: timeIndexToHour(p.timeIndex) }, gender: p.gender }
}

function hashIp(ip: string): string {
  let h = 2_166_136_261
  for (let i = 0; i < ip.length; i++) {
    h ^= ip.charCodeAt(i)
    h = Math.imul(h, 16_777_619)
  }
  return (h >>> 0).toString(36)
}

relationshipTimelineRoutes.post('/explain', async (c) => {
  const body = explainSchema.parse(await c.req.json().catch(() => ({})))

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown'
  const subject = resolveLlmGuardSubject({
    userId: body.userId,
    deviceId: body.deviceId,
    ipHash: hashIp(ip),
  })

  const result = await explainRelationshipTimelineNode(c.env, {
    self: toPerson(body.self),
    partner: toPerson(body.partner),
    year: body.year,
    nodeType: body.nodeType,
    daYunOf: body.daYunOf,
    locale: body.locale,
    subject,
  })
  return jsonOk(c, result)
})
