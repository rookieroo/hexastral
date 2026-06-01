/**
 * 关系时间轴节点深解核心测试 (relationship-timeline-explain.ts, BT.4 抽出)
 *
 * 不打 svc-astro / 真 KV: 用假 GUARD_KV (恒 miss) 验确定性分支:
 * 1. subject=null → 不消耗 guard, 直接模板兜底 (= node.summary, 永不空白)
 * 2. 无匹配节点 (大运 explain 落在非换运年) → source 'none'
 */

import { describe, expect, test } from 'bun:test'
import type { RelationshipPerson } from '@zhop/astro-core'
import { calculateDaYun } from '@zhop/astro-core/dayun'
import type { CloudflareBindings } from '../infra-types'
import { explainRelationshipTimelineNode } from './relationship-timeline-explain'

const self: RelationshipPerson = { input: { year: 1990, month: 3, day: 15, hour: 13 }, gender: '男' }
const partner: RelationshipPerson = { input: { year: 1992, month: 7, day: 20, hour: 9 }, gender: '女' }

/** 假 env: GUARD_KV 恒 miss, 无需 svc-astro (subject=null 路径不触达)。 */
const fakeEnv = {
  GUARD_KV: {
    get: async () => null,
    put: async () => undefined,
  },
} as unknown as CloudflareBindings

describe('explainRelationshipTimelineNode — 确定性兜底', () => {
  test('subject=null → 模板兜底 (= 节点 summary, 非空)', async () => {
    const r = await explainRelationshipTimelineNode(fakeEnv, {
      self,
      partner,
      year: 2030,
      nodeType: '流年',
      locale: 'zh',
      subject: null,
    })
    expect(r.source).toBe('template')
    expect(r.upsell).toBe(false)
    expect(typeof r.explanation).toBe('string')
    expect((r.explanation ?? '').length).toBeGreaterThan(0)
  })

  test('无匹配节点 (大运 explain 落在非换运年) → source none', async () => {
    // 找一个 self 不换运的年 (相邻两个 startYear 之间)。
    const starts = new Set(calculateDaYun(self.input, self.gender).steps.map((s) => s.startYear))
    let nonTransitionYear = 2031
    for (let y = 2026; y <= 2090; y++) {
      if (!starts.has(y)) {
        nonTransitionYear = y
        break
      }
    }
    const r = await explainRelationshipTimelineNode(fakeEnv, {
      self,
      partner,
      year: nonTransitionYear,
      nodeType: '大运',
      daYunOf: 'A',
      locale: 'zh',
      subject: null,
    })
    expect(r.source).toBe('none')
    expect(r.explanation).toBeNull()
  })
})
