/**
 * 关系命运时间轴引擎测试 (relationship-timeline.ts)
 *
 * 不变量 / 交叉验证为主 (不硬编码十神/冲合, UTC 时区无关):
 * 1. 双方大运换运节点 ↔ calculateDaYun startYear,daYunOf 正确,恒 major
 * 2. 流年节点的 ganZhi / shiShenA / shiShenB ↔ getLiuNian + getShiShen 一致
 * 3. 冲(六冲)/合(六合)标记与本地表一致,且评级规则 (任一冲/合 → notable)
 * 4. 提前推送: fireDate 合法、不晚于 effectiveDate、排除 routine、升序
 * 5. 确定性
 */

import { describe, expect, test } from 'bun:test'
import { calculateDaYun, getLiuNian } from '../dayun'
import {
  getRelationshipTimelineNodes,
  getRelationshipTimelineNotifications,
  type RelationshipPerson,
} from '../relationship-timeline'
import { getShiShen } from '../shishen'
import type { EarthlyBranch } from '../types'

const A: RelationshipPerson = { input: { year: 1990, month: 3, day: 15, hour: 14 }, gender: '男' }
const B: RelationshipPerson = { input: { year: 1992, month: 7, day: 20, hour: 10 }, gender: '女' }

const CLASH: Record<EarthlyBranch, EarthlyBranch> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}
const COMBINE: Record<EarthlyBranch, EarthlyBranch> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}
const DAY = 86_400_000

describe('getRelationshipTimelineNodes — 双方大运', () => {
  test('A/B 大运节点年份 ↔ calculateDaYun,daYunOf 正确,恒 major', () => {
    const { nodes } = getRelationshipTimelineNodes(A, B)
    const fromYear = Math.max(A.input.year, B.input.year)
    const toYear = fromYear + 90
    const aYears = calculateDaYun(A.input, A.gender)
      .steps.map((s) => s.startYear)
      .filter((y) => y >= fromYear && y <= toYear)
    const bYears = calculateDaYun(B.input, B.gender)
      .steps.map((s) => s.startYear)
      .filter((y) => y >= fromYear && y <= toYear)

    const dayunA = nodes.filter((n) => n.type === '大运' && n.daYunOf === 'A')
    const dayunB = nodes.filter((n) => n.type === '大运' && n.daYunOf === 'B')
    expect(dayunA.map((n) => n.year)).toEqual(aYears)
    expect(dayunB.map((n) => n.year)).toEqual(bYears)
    for (const n of [...dayunA, ...dayunB]) expect(n.significance).toBe('major')
  })
})

describe('getRelationshipTimelineNodes — 流年交叉验证', () => {
  test('ganZhi / 双方十神 ↔ getLiuNian + getShiShen', () => {
    const { nodes } = getRelationshipTimelineNodes(A, B, { fromYear: 2000, toYear: 2030 })
    const dmA = calculateDaYun(A.input, A.gender).pillars.day.stem
    const dmB = calculateDaYun(B.input, B.gender).pillars.day.stem
    for (const year of [2000, 2024, 2030]) {
      const node = nodes.find((n) => n.type === '流年' && n.year === year)!
      const ln = getLiuNian(year)
      expect(node.ganZhi.label).toBe(ln.label)
      expect(node.shiShenA).toEqual(getShiShen(dmA, ln.stem))
      expect(node.shiShenB).toEqual(getShiShen(dmB, ln.stem))
    }
  })

  test('冲/合 标记与六冲六合表一致,评级符合规则', () => {
    const { nodes } = getRelationshipTimelineNodes(A, B, { fromYear: 1992, toYear: 2016 })
    const dbA = calculateDaYun(A.input, A.gender).pillars.day.branch
    const dbB = calculateDaYun(B.input, B.gender).pillars.day.branch
    const liuNian = nodes.filter((n) => n.type === '流年')
    expect(liuNian.length).toBeGreaterThan(0)
    for (const n of liuNian) {
      const br = n.ganZhi.branch
      expect(n.clashA).toBe(CLASH[br] === dbA)
      expect(n.clashB).toBe(CLASH[br] === dbB)
      expect(n.harmonyA).toBe(COMBINE[br] === dbA)
      expect(n.harmonyB).toBe(COMBINE[br] === dbB)
      const anyRel = n.clashA || n.clashB || n.harmonyA || n.harmonyB
      expect(n.significance).toBe(anyRel ? 'notable' : 'routine')
    }
  })
})

describe('getRelationshipTimelineNotifications', () => {
  test('窗口内 fireDate 合法、不晚于 effectiveDate、排除 routine、升序', () => {
    const fromMs = Date.UTC(2024, 0, 1)
    const within = 400
    const notifs = getRelationshipTimelineNotifications(A, B, {
      fromDate: new Date(fromMs),
      withinDays: within,
    })
    const endMs = fromMs + within * DAY
    for (const nf of notifs) {
      const fireMs = Date.parse(`${nf.fireDate}T00:00:00Z`)
      const effMs = Date.parse(`${nf.node.effectiveDate}T00:00:00Z`)
      expect(fireMs).toBeGreaterThanOrEqual(fromMs)
      expect(fireMs).toBeLessThanOrEqual(endMs)
      expect(fireMs).toBeLessThanOrEqual(effMs)
      expect(nf.node.significance).not.toBe('routine')
    }
    const dates = notifs.map((n) => n.fireDate)
    expect(dates).toEqual([...dates].sort())
  })
})

describe('determinism', () => {
  test('同输入同输出', () => {
    expect(getRelationshipTimelineNodes(A, B).nodes).toEqual(
      getRelationshipTimelineNodes(A, B).nodes
    )
  })
})
