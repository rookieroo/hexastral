/**
 * 关系时间轴节点深解 — 可复用核心 (B-yuan.3 + BT.4)
 *
 * 从 routes/relationship-timeline.ts 抽出, 供两个入口共用:
 *   1. POST /api/relationship-timeline/explain — 客户端直接带双方生辰 (solo / fate 路径)
 *   2. POST /api/bonds/timeline/explain (BT.4) — 客户端只带 bondId, 服务端解析对方生辰
 *      → 对方原始盘**绝不**下发到本我设备 (隐私 D2, ADR-0014)
 *
 * 节点由 astro-core 服务端重算, K.4 cost-guarded, 24h GUARD_KV 缓存,
 * 确定性 node.summary 兜底 (永不空白)。
 */

import { getRelationshipTimelineNodes, type RelationshipPerson } from '@zhop/astro-core'
import type { CloudflareBindings } from '../infra-types'
import {
  evaluateLlmGuard,
  type LlmGuardConfig,
  type LlmGuardSubject,
  type LlmGuardTier,
  recordLlmGuardGrant,
} from '../services/shared/llm-guard'
import { astroClient } from './service-clients'

const REL_TIMELINE_GUARD_CONFIG = {
  app: 'yuan-timeline',
  dailyLimitAnon: 1,
  dailyLimitSigned: 5,
  lifetimePeakPass: 1,
  globalDailyBudget: 5000,
  noRollover: true,
  noPeriodicRefill: true,
} as const satisfies LlmGuardConfig

export interface RelExplainInput {
  /** 你(A). */
  self: RelationshipPerson
  /** 对方(B). */
  partner: RelationshipPerson
  year: number
  nodeType: '大运' | '流年'
  /** 大运 节点必填 (区分你/对方同年换运). */
  daYunOf?: 'A' | 'B'
  locale: string
  /** 已解析的 K.4 配额主体 (userId > deviceId > ipHash); null → 直接兜底模板. */
  subject: LlmGuardSubject | null
}

export interface RelExplainResult {
  explanation: string | null
  source: 'none' | 'cache' | 'template' | 'llm'
  tier?: LlmGuardTier
  upsell: boolean
}

/** 稳定缓存键片段 (派生自排盘输入, 不含原始字符串格式差异). */
function personKey(p: RelationshipPerson): string {
  const i = p.input
  return `${i.year}-${i.month}-${i.day}-${i.hour ?? 0}_${p.gender}`
}

export async function explainRelationshipTimelineNode(
  env: CloudflareBindings,
  input: RelExplainInput
): Promise<RelExplainResult> {
  const { nodes } = getRelationshipTimelineNodes(input.self, input.partner, {
    fromYear: input.year,
    toYear: input.year,
  })
  const node = nodes.find(
    (n) =>
      n.type === input.nodeType &&
      n.year === input.year &&
      (input.nodeType === '流年' || n.daYunOf === input.daYunOf)
  )
  if (!node) return { explanation: null, source: 'none', upsell: false }

  const cacheKey = `yuan:timeline:explain:${personKey(input.self)}:${personKey(input.partner)}:${input.year}:${input.nodeType}:${input.daYunOf ?? '-'}:${input.locale}`

  const cached = await env.GUARD_KV.get(cacheKey)
  if (cached) return { explanation: cached, source: 'cache', upsell: false }

  // 兜底 = 引擎确定性一句话 (永不空白)。无 subject → 不消耗 guard, 直接模板。
  if (!input.subject) return { explanation: node.summary, source: 'template', upsell: false }

  const guard = await evaluateLlmGuard(env, {
    subject: input.subject,
    config: REL_TIMELINE_GUARD_CONFIG,
  })
  for (const ev of guard.events) console.info('[yuan.timeline.explain.guard]', JSON.stringify(ev))

  if (guard.decision === 'allow_llm') {
    try {
      const resp = await astroClient.post<{ explanation: string }>(
        env.SVC_ASTRO,
        '/relationship-timeline/explain',
        {
          nodeType: node.type,
          year: node.year,
          ganZhi: node.ganZhi.label,
          daYunOf: node.daYunOf,
          shiShenA: node.shiShenA?.name,
          shiShenB: node.shiShenB?.name,
          clashA: node.clashA,
          clashB: node.clashB,
          harmonyA: node.harmonyA,
          harmonyB: node.harmonyB,
          significance: node.significance,
          summary: node.summary,
          locale: input.locale,
          isPro: guard.tier === 'deep',
        }
      )
      const explanation = (resp.explanation ?? '').trim()
      if (explanation) {
        await env.GUARD_KV.put(cacheKey, explanation, { expirationTtl: 86_400 })
        await recordLlmGuardGrant(env, {
          subject: input.subject,
          config: REL_TIMELINE_GUARD_CONFIG,
          consumesPeakPass: guard.consumesPeakPass,
        })
        return { explanation, source: 'llm', tier: guard.tier, upsell: false }
      }
    } catch (err) {
      console.error('[yuan.timeline.explain] svc-astro failed', err)
    }
    return { explanation: node.summary, source: 'template', upsell: false }
  }

  return { explanation: node.summary, source: 'template', upsell: guard.upsellAfterExhaust }
}
